#!/usr/bin/env python3
"""apply.sh in Python, for computers with no POSIX shell (Windows). Same steps, same order, same
files in tv-home/tvs/, so undo.sh and undo.py both read what it wrote. See apply.sh for why the
order matters (the setup wizard goes off last, in one command the TV finishes by itself).

    TV_IP=<tv address> [BRIDGE_URL=...] [APK=...] [TV_NAME=living-room] [TV_ID=<id>]
      [EXTRA_OFF="pkg pkg"] [KEEP_SETUP=1] [SCREENSAVER=crypt] [ADB_PORT=5555]
      python tv-home/tools/apply.py

Windows PowerShell: $env:TV_IP="192.168.1.50"; $env:SCREENSAVER="crypt"; .venv\\Scripts\\python tv-home\\tools\\apply.py

SCREENSAVER=crypt (optional, an app built with the Crypt look): makes the app's Crypt screensaver
the TV's screensaver. The TV's own choice is written to tv-home/tvs/<TV_NAME>.saver first, and
undo puts it back.
"""
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PY = sys.executable
T = os.path.join(HERE, "tvadb.py")
TVS = os.path.abspath(os.path.join(HERE, "..", "tvs"))
WIZARD = "com.google.android.tungsten.setupwraith"
HOME_ACT = "app.couchtv.launcher/.MainActivity"
SAVER = "app.couchtv.launcher/.CryptDream"
RESOLVE = "cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME"


def tv(*args, check=True, quiet=False):
    """Run tvadb.py; its output, or exit on failure like `set -e` (tvadb already said why)."""
    r = subprocess.run([PY, T, *args], capture_output=True, text=True, env=os.environ)
    if r.stderr and not quiet:
        sys.stderr.write(r.stderr)
    if check and r.returncode != 0:
        sys.exit(r.returncode or 1)
    return r.stdout.replace("\r", "")


def pkgs(text):
    return [l.strip()[len("package:"):] for l in text.splitlines() if l.strip().startswith("package:")]


def main():
    name = os.environ.get("TV_NAME") or "living-room"
    if not os.environ.get("TV_IP"):
        sys.exit("set TV_IP to the address of the TV")
    apk = os.environ.get("APK") or os.path.join(ROOT, "dist", "couch-tv-home.apk")
    if not os.path.isfile(apk):
        alt = os.path.join(HERE, "..", "android", "app", "build", "outputs", "apk", "release", "app-release.apk")
        apk = alt if os.path.isfile(alt) else None
    if not apk:
        sys.exit("No app found (looked for dist/couch-tv-home.apk and the build output).")
    tv("ping")
    os.makedirs(TVS, exist_ok=True)
    listf = os.path.join(TVS, name + ".disabled")
    want = ["com.google.android.apps.tv.launcherx", "com.google.android.tvlauncher",
            "com.google.android.apps.tv.dreamx"] + (os.environ.get("EXTRA_OFF") or "").split()

    homef = os.path.join(TVS, name + ".home")
    if not os.path.isfile(homef):
        lines = [l for l in tv("shell", RESOLVE).splitlines() if l.strip()]
        prev = lines[-1].strip() if lines else ""
        if "/" in prev and not prev.startswith("app.couchtv.launcher/") and not prev.startswith(WIZARD + "/"):
            open(homef, "w").write(prev + "\n")

    print("1/4  Installing the app", flush=True)
    tv("install", apk)
    tv("shell", "cmd package set-home-activity " + HOME_ACT)
    now = next((l for l in tv("shell", "cmd shortcut get-default-launcher").splitlines() if "Launcher" in l), "")
    if "app.couchtv.launcher/" not in now:
        print("The TV did not take couch-tv as its home (it says: %s). Nothing was switched off." % now.strip())
        sys.exit(1)
    tv("shell", "pm grant app.couchtv.launcher android.permission.READ_TV_LISTINGS", check=False, quiet=True)

    print("2/4  Switching off the Google home and ambient mode", flush=True)
    present = pkgs(tv("shell", "pm list packages"))
    disabled = pkgs(tv("shell", "pm list packages -d"))
    off = []
    for p in want:
        if p in present:
            print(tv("shell", "pm disable-user --user 0 " + p).strip())
            off.append(p)
    wizard_off = False
    if os.environ.get("KEEP_SETUP") != "1" and WIZARD in present:
        off.append(WIZARD)
        if WIZARD in disabled:
            print("     the setup wizard is already off")
        else:
            wizard_off = True
    open(listf, "w").write("".join(p + "\n" for p in off))

    print("3/4  Making couch-tv the home and sending your settings", flush=True)
    tv("shell", "cmd package set-home-activity " + HOME_ACT)
    cfg64 = subprocess.run([PY, os.path.join(HERE, "home-config.py")], capture_output=True, text=True, check=True).stdout.strip()
    ha64 = subprocess.run([PY, os.path.join(HERE, "home-config.py"), "--ha"], capture_output=True, text=True, check=True).stdout.strip()
    smart = subprocess.run([PY, os.path.join(HERE, "home-config.py"), "--ha", "--check"], capture_output=True, text=True).stdout
    print("     " + (smart.splitlines() or [""])[0])
    if "doorbell" in [l.strip() for l in smart.splitlines()]:
        tv("shell", "appops set app.couchtv.launcher SYSTEM_ALERT_WINDOW allow")
    elif "allow" in tv("shell", "appops get app.couchtv.launcher SYSTEM_ALERT_WINDOW", check=False, quiet=True):
        tv("shell", "appops set app.couchtv.launcher SYSTEM_ALERT_WINDOW default")
    tv_id = os.environ.get("TV_ID")
    tv("shell", "am force-stop app.couchtv.launcher; am start -n %s --es bridge %s --es config_b64 %s --es ha_b64 %s%s"
       % (HOME_ACT, os.environ.get("BRIDGE_URL") or "none", cfg64, ha64, (" --es tv " + tv_id) if tv_id else ""))

    # The Crypt screensaver, when asked for: remember the TV's own choice first, for undo
    if os.environ.get("SCREENSAVER") == "crypt":
        saverf = os.path.join(TVS, name + ".saver")
        if not os.path.isfile(saverf):
            was = {k: tv("shell", "settings get secure " + k).strip()
                   for k in ("screensaver_components", "screensaver_enabled", "screensaver_activate_on_sleep")}
            json.dump(was, open(saverf, "w"))
        tv("shell", "settings put secure screensaver_components " + SAVER)
        tv("shell", "settings put secure screensaver_enabled 1")
        tv("shell", "settings put secure screensaver_activate_on_sleep 1")   # a TV starts its screensaver when it "sleeps"; 0 sends it to standby instead
        print("     screensaver: Crypt (the TV's own one is kept in %s for undo)" % os.path.relpath(saverf, ROOT))

    # Fire TV: the Home button watch (see apply.sh)
    if "package:com.amazon.tv.launcher" in tv("shell", "pm list packages com.amazon.tv.launcher"):
        fire = "app.couchtv.launcher/.FireWatch"
        tv("shell", "pm grant app.couchtv.launcher android.permission.WRITE_SECURE_SETTINGS", check=False, quiet=True)
        cur = tv("shell", "settings get secure enabled_accessibility_services").strip()
        if fire not in cur.split(":"):
            new = fire if cur in ("", "null") else cur + ":" + fire
            tv("shell", "settings put secure enabled_accessibility_services " + new)
        tv("shell", "settings put secure accessibility_enabled 1")
        print("     Fire TV: the Home button watch is on (Amazon's home flashes up, then couch-tv comes back)")

    if os.environ.get("BRIDGE_URL"):
        keep = os.path.join(ROOT, "bridge", "data", "keep-disabled.json" if name == "living-room" else "keep-disabled.%s.json" % name)
        os.makedirs(os.path.dirname(keep), exist_ok=True)
        json.dump(off, open(keep, "w"))

    if wizard_off:
        print("4/4  Switching off the setup wizard (last, because on some TVs this drops the Wi-Fi)", flush=True)
        tv("shell", "pm disable-user --user 0 %s; cmd package set-home-activity %s; input keyevent KEYCODE_HOME" % (WIZARD, HOME_ACT),
           check=False, quiet=True)
        time.sleep(5)
    else:
        print("4/4  Setup wizard: nothing to do", flush=True)
        tv("keys", "HOME", check=False)

    print("switched off (undo list): " + os.path.relpath(listf, ROOT))
    print(open(listf).read().rstrip())
    if subprocess.run([PY, T, "ping"], capture_output=True).returncode == 0:
        lines = [l for l in tv("shell", RESOLVE, check=False).splitlines() if l.strip()]
        print("home screen now: " + (lines[-1].strip() if lines else "?"))
        print("Done. The TV is still reachable.")
    else:
        print()
        print("Done on the TV, but this computer can no longer reach it. Switching the setup wizard off")
        print("can make a TV forget its Wi-Fi. At the TV: Settings, Network and Internet (or Network), pick")
        print("your Wi-Fi and join it again. Then run this same command again: it is safe to repeat, and")
        print("it checks everything is in place. If the TV will not rejoin, see \"If something is stuck\"")
        print("in docs/UNINSTALL.md.")
        sys.exit(2)


if __name__ == "__main__":
    main()
