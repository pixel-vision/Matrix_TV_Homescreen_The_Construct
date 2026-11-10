#!/usr/bin/env python3
"""Design the TV home on this computer before it goes on the TV. Changes nothing on the TV.

    python3 scripts/customise.py            # then open the address it prints
    python3 scripts/customise.py --port 8123 --no-browser

It serves the repo folder on this computer only (127.0.0.1) and opens tv-home/web/customise.html:
every look setting on the left, the real home (index.html?mock=1) with those settings on the
right. Save writes the choices into config.json in the repo root (people, home look, quick
buttons, weather, country), starting from config.example.json the first time and leaving every
other key alone. Setup (apply.sh, or the on-TV app's setup) then hands them to the TV. Standard
library only, so it runs on macOS, Linux and Windows.
"""
import argparse
import json
import re
import sys
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config.json"
EXAMPLE = ROOT / "config.example.json"

SCENES = {"night", "golden", "water", "fog", "dawn"}
QUICK = {"sleep", "look", "input", "settings", "picture", "saver"}
LANGS = {"en", "es", "es-MX", "it", "de", "tr"}
HOME_KEYS = ("look", "scenes", "scene_seconds", "clock", "clock_style", "glass", "glass_icons",
             "glass_amount", "dock_size", "language", "video_url")


def load_config():
    for p in (CONFIG, EXAMPLE):
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8")), p == CONFIG
    return {}, False


def slug(name, taken):
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "person"
    s, n = base, 2
    while s in taken:
        s, n = f"{base}-{n}", n + 1
    taken.add(s)
    return s


def clean(body):
    """Check what the page sent; raise ValueError with a plain message if something is off."""
    out = {}
    people = body.get("people", [])
    if not isinstance(people, list) or len(people) > 12:
        raise ValueError("people: up to 12 names")
    out["people"] = [str(p).strip()[:20] for p in people if str(p).strip()]

    h = body.get("home", {})
    home = {}
    if h.get("look") in ("night", "classic", "crypt"):
        home["look"] = h["look"]
    sc = [s for s in h.get("scenes", []) if s in SCENES or str(s).startswith("mine")]
    if sc:
        home["scenes"] = sc
    if isinstance(h.get("scene_seconds"), (int, float)):
        home["scene_seconds"] = max(5, min(600, int(h["scene_seconds"])))
    if h.get("clock") in ("12h", "24h"):
        home["clock"] = h["clock"]
    if h.get("clock_style") in ("frosted", "liquid"):
        home["clock_style"] = h["clock_style"]
    if h.get("glass") in ("off", "lite", "on"):
        home["glass"] = h["glass"]
    if isinstance(h.get("glass_icons"), bool):
        home["glass_icons"] = h["glass_icons"]
    if isinstance(h.get("glass_amount"), (int, float)):
        home["glass_amount"] = max(1, min(5, int(h["glass_amount"])))
    if isinstance(h.get("dock_size"), (int, float)):
        home["dock_size"] = max(1, min(10, int(h["dock_size"])))
    if h.get("language") in LANGS:
        home["language"] = h["language"]
    v = str(h.get("video_url") or "").strip()
    if v:
        if not re.match(r"^https?://", v):
            raise ValueError("video link must start with http:// or https://")
        home["video_url"] = v
    out["home"] = home

    out["quick"] = [q for q in body.get("quick", []) if q in QUICK]

    w = body.get("weather") or {}
    try:
        lat, lon = float(w["lat"]), float(w["lon"])
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError
        out["weather"] = {"lat": round(lat, 4), "lon": round(lon, 4),
                          "place": str(w.get("place", ""))[:60],
                          "timezone": str(w.get("timezone", ""))[:60]}
    except (KeyError, TypeError, ValueError):
        pass
    c = str(body.get("country") or "").upper()
    if re.fullmatch(r"[A-Z]{2}", c):
        out["country"] = c
    return out


def save(body):
    new = clean(body)
    cfg, _ = load_config()
    # people: keep the extra keys of anyone whose name is unchanged (kid, guest, app_profiles, colour)
    old = {p.get("name"): p for p in cfg.get("people", []) if isinstance(p, dict)}
    taken = set()
    people = []
    for name in new["people"]:
        p = dict(old.get(name, {}))
        p["name"] = name
        p["id"] = p.get("id") if p.get("id") and p["id"] not in taken else slug(name, taken)
        taken.add(p["id"])
        people.append(p)
    cfg["people"] = people
    home = cfg.setdefault("home", {})
    for k in HOME_KEYS:
        if k in new["home"]:
            home[k] = new["home"][k]
        elif k in ("language", "video_url"):
            home.pop(k, None)   # left out = follow the TV / no video
    tvs = cfg.get("tvs") or []
    want = cfg.get("default_tv")
    for tv in tvs:
        if not want or tv.get("id") == want:
            tv["quick"] = new["quick"]
            break
    if "weather" in new:
        cfg["weather"] = new["weather"]
    if "country" in new:
        cfg["country"] = new["country"]
    tmp = CONFIG.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(CONFIG)
    return {"ok": True, "file": "config.json"}


def current():
    cfg, saved = load_config()
    tvs = cfg.get("tvs") or [{}]
    want = cfg.get("default_tv")
    tv = next((t for t in tvs if t.get("id") == want), tvs[0])
    return {"saved": saved,
            "people": [p.get("name") for p in cfg.get("people", []) if isinstance(p, dict) and p.get("name")],
            "home": {k: v for k, v in (cfg.get("home") or {}).items() if k in HOME_KEYS},
            "quick": tv.get("quick", ["sleep"]),
            "weather": cfg.get("weather"), "country": cfg.get("country")}


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def send_json(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/":
            self.send_response(302)
            self.send_header("Location", "/tv-home/web/customise.html")
            self.end_headers()
            return
        if self.path.split("?")[0] == "/api/current":
            return self.send_json(200, current())
        # never serve settings or secrets, only the files the preview needs
        p = self.path.split("?")[0]
        if p.startswith(("/config.json", "/.env", "/bridge/data", "/.venv", "/.git")):
            return self.send_json(404, {"error": "not here"})
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/save":
            return self.send_json(404, {"error": "not here"})
        # only this computer's own page may save (the server listens on 127.0.0.1 too)
        origin = self.headers.get("Origin", "")
        if origin and not re.match(r"^http://(127\.0\.0\.1|localhost)(:\d+)?$", origin):
            return self.send_json(403, {"error": "not allowed"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
            if n > 64_000:
                raise ValueError("too big")
            body = json.loads(self.rfile.read(n) or b"{}")
            return self.send_json(200, save(body))
        except (ValueError, json.JSONDecodeError) as e:
            return self.send_json(400, {"error": str(e) or "could not read that"})


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), partial(Handler, directory=str(ROOT)))
    url = f"http://127.0.0.1:{a.port}/tv-home/web/customise.html"
    print(f"couch-tv customiser: {url}")
    print("Leave this window open while you customise. Close it (or Ctrl+C) when you are done.")
    if not a.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
        sys.exit(0)


if __name__ == "__main__":
    main()
