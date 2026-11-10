#!/usr/bin/env python3
"""undo.sh in Python, for computers with no POSIX shell (Windows): puts a TV's own home screen
back. Switches back on exactly what apply switched off (tv-home/tvs/<TV_NAME>.disabled), puts the
TV's own screensaver back if apply.py changed it (tv-home/tvs/<TV_NAME>.saver), then makes the home
the TV had before (tv-home/tvs/<TV_NAME>.home, else Google TV) the home again. couch-tv itself
stays installed until REMOVE_APP=1 is set, so a second thought is one apply away.

    TV_IP=<tv address> [TV_NAME=living-room] [REMOVE_APP=1] [ADB_PORT=5555] python tv-home/tools/undo.py
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PY = sys.executable
T = os.path.join(HERE, "tvadb.py")
TVS = os.path.abspath(os.path.join(HERE, "..", "tvs"))
STANDARD = ["com.google.android.apps.tv.launcherx", "com.google.android.tvlauncher",
            "com.google.android.apps.tv.dreamx", "com.google.android.tungsten.setupwraith"]


def tv(*args, check=True):
    r = subprocess.run([PY, T, *args], capture_output=True, text=True, env=os.environ)
    if r.stderr:
        sys.stderr.write(r.stderr)
    if check and r.returncode != 0:
        sys.exit(r.returncode or 1)
    return r.stdout.replace("\r", "")


def main():
    name = os.environ.get("TV_NAME") or "living-room"
    if not os.environ.get("TV_IP"):
        sys.exit("set TV_IP to the address of the TV")
    tv("ping")
    listf = os.path.join(TVS, name + ".disabled")
    if os.path.isfile(listf):
        want = open(listf).read().split()
    else:
        print("No %s on this computer, switching the standard Google packages back on." % listf)
        want = STANDARD
    keep = os.path.join(ROOT, "bridge", "data", "keep-disabled.json" if name == "living-room" else "keep-disabled.%s.json" % name)
    if os.path.isfile(keep):
        open(keep, "w").write("[]")
    present = [l.strip()[8:] for l in tv("shell", "pm list packages").splitlines() if l.strip().startswith("package:")]
    for p in want:
        if p in present:
            print(tv("shell", "pm enable " + p).strip())

    # the TV's own screensaver, as it was before apply.py
    saverf = os.path.join(TVS, name + ".saver")
    if os.path.isfile(saverf):
        was = json.load(open(saverf))
        for k, v in was.items():
            if v in ("", "null"):
                tv("shell", "settings delete secure " + k, check=False)
            else:
                tv("shell", "settings put secure %s %s" % (k, v), check=False)
        os.remove(saverf)
        print("screensaver: the TV's own one is back")

    tv("shell", "appops set app.couchtv.launcher SYSTEM_ALERT_WINDOW default", check=False)
    tv("shell", "pm revoke app.couchtv.launcher android.permission.WRITE_SECURE_SETTINGS", check=False)
    cur = tv("shell", "settings get secure enabled_accessibility_services", check=False).strip()
    if "app.couchtv.launcher/" in cur:
        new = ":".join(s for s in cur.split(":") if not s.startswith("app.couchtv.launcher/"))
        tv("shell", ("settings put secure enabled_accessibility_services " + new) if new else
           "settings delete secure enabled_accessibility_services")
        print("Fire TV: the Home button watch is off.")

    home = ""
    homef = os.path.join(TVS, name + ".home")
    if os.path.isfile(homef):
        home = open(homef).read().strip()
    if not home:
        if "com.google.android.apps.tv.launcherx" in present:
            home = "com.google.android.apps.tv.launcherx/.home.HomeActivity"
        elif "com.google.android.tvlauncher" in present:
            home = "com.google.android.tvlauncher/.MainActivity"
    if home:
        tv("shell", "cmd package set-home-activity " + home)
    else:
        print("No Google home on this TV and no saved home: the TV will ask which home to use.")
    if os.environ.get("REMOVE_APP") == "1":
        print(tv("shell", "pm uninstall app.couchtv.launcher", check=False).strip() or "couch-tv removed")
    if subprocess.run([PY, T, "keys", "HOME"], capture_output=True).returncode != 0:
        print("(could not press Home: press it on the remote)")
    lines = [l for l in tv("shell", "cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME",
                           check=False).splitlines() if l.strip()]
    print("home screen now: " + (lines[-1].strip() if lines else "?"))


if __name__ == "__main__":
    main()
