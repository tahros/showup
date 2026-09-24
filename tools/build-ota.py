#!/usr/bin/env python3
"""build-ota.py [DIR] — write ota.json: the over-the-air manifest for the iOS app.

Run after build-dist.py, and again whenever any shipped file changes.
buildcheck.py fails the build when ota.json and the files disagree, and prints
this command.

One entry per file the app ships (the same set dist/ holds), each with its
SHA-256 and a URL on the live site. The native updater reuses any file whose
hash already matches what is on the phone, downloads only the rest, and
verifies every one -- so nothing binary is ever committed, and a release that
touched one stylesheet costs one stylesheet.

download_url carries ?ota=<version> so the CDN edge cannot hand back a file
from the previous deploy; GitHub Pages itself ignores the query string.

requires: the native plugins this web bundle expects, named the way the
runtime names them (window.Capacitor.Plugins.<Name>). An app binary missing
any of them skips the update. A dependency this table cannot name FAILS the
build: guessing would let a bundle assume native code the phone may not have.
"""
import hashlib, json, pathlib, re, sys

SITE = "https://tahros.github.io/showup/"
PLUGIN_JS = {                      # npm package -> runtime plugin name
    "@capacitor/app": "App",
    "@capacitor/browser": "Browser",
    "@capacitor/filesystem": "Filesystem",
    "@capacitor/local-notifications": "LocalNotifications",
    "@capgo/capacitor-updater": "CapacitorUpdater",
}
NOT_PLUGINS = {"@capacitor/core", "@capacitor/ios", "@capacitor/cli", "@capacitor/android"}

d = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
dist = d / "dist"
if not (dist / "index.html").exists():
    sys.exit("build-ota: no dist/ -- run tools/build-dist.py first")
version = re.search(r"APP_VERSION\s*=\s*'v([\d.]+)'", (d / "js/core.js").read_text()).group(1)

deps = json.loads((d / "package.json").read_text()).get("dependencies", {})
unknown = sorted(k for k in deps if k not in PLUGIN_JS and k not in NOT_PLUGINS)
if unknown:
    sys.exit("build-ota: cannot name the native plugin for %s -- add it to PLUGIN_JS" % ", ".join(unknown))
requires = sorted(PLUGIN_JS[k] for k in deps if k in PLUGIN_JS)

files = []
for f in sorted(p for p in dist.rglob("*") if p.is_file()):
    rel = f.relative_to(dist).as_posix()
    files.append({"file_name": rel,
                  "file_hash": hashlib.sha256(f.read_bytes()).hexdigest(),
                  "download_url": f"{SITE}{rel}?ota={version}"})

out = {"v": 1, "version": version, "requires": requires, "files": files}
(d / "ota.json").write_text(json.dumps(out, indent=1) + "\n")
print(f"build-ota: {version}, {len(files)} files, requires {', '.join(requires) or 'nothing'}")
