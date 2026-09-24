#!/usr/bin/env python3
"""build-dist.py [DIR] — assemble dist/ : exactly what the app serves, nothing else.

The iOS bundle carries these files inside the app. The repo is ~24 MB; the app
is a fraction of it, and tools/, docs/, the suites and the .md files have no
business shipping to a phone.

The file list is a DIRECTORY allowlist, not a parse of index.html, and that is
deliberate. Half this app's assets are named at runtime by concatenation --
'assets/mascot-' + tone + '.png', '../assets/fonts/IBMPlexSans-' + weight --
so no static read of the markup can enumerate them. Copy the four asset
directories whole, then let tools/check-dist.cjs prove the result by RUNNING
it: dist/ served alone, every tab exercised, zero failed requests. A list that
can be verified by execution beats a list that has to be maintained by hand.
"""
import shutil, sys, pathlib

DIRS = ("css", "js", "assets", "vendor")
ROOT_FILES = ("index.html", "sw.js", "manifest.webmanifest")
ROOT_GLOBS = ("*.png",)
SKIP_ROOT = {"header-glass-live-qa.png"}      # a check's output, not an app asset

d = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
dist = d / "dist"
if dist.exists():
    shutil.rmtree(dist)
dist.mkdir()

copied = 0
total = 0
for sub in DIRS:
    src = d / sub
    if not src.is_dir():
        sys.exit(f"build-dist: missing directory {sub}/")
    shutil.copytree(src, dist / sub)
    for f in (dist / sub).rglob("*"):
        if f.is_file():
            copied += 1
            total += f.stat().st_size

# v4.6.110: a root image ships only if the app REFERENCES it. This was a bare
# *.png glob, and the browser checks write their screenshots into the repo root
# -- so running a check before a build shipped test screenshots inside the app,
# and from this release, listed them in the over-the-air manifest too.
_refs = "".join(q.read_text(errors="ignore") for q in
                [d/"index.html", d/"manifest.webmanifest", d/"sw.js",
                 *sorted((d/"js").glob("*.js")), *sorted((d/"css").glob("*.css"))] if q.exists())
names = list(ROOT_FILES)
for pat in ROOT_GLOBS:
    names += [p.name for p in sorted(d.glob(pat)) if p.name in _refs]
for name in dict.fromkeys(names):
    if name in SKIP_ROOT:
        continue
    src = d / name
    if not src.is_file():
        sys.exit(f"build-dist: missing root file {name}")
    shutil.copy2(src, dist / name)
    copied += 1
    total += src.stat().st_size

print(f"build-dist: {copied} files, {total/1048576:.2f} MB -> {dist}")
