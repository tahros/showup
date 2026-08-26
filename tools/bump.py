#!/usr/bin/env python3
"""bump.py STAGE OLD NEW — move the version stamps, and ONLY the stamps.

Why this file exists (v3.3.342). Every bumper this repo has had did a blunt
string replace of the old version for the new across index.html, sw.js and
js/core.js. Those files contain PROSE as well as stamps, so every historical
comment that named a version was rewritten to the current one, every release,
silently. Two were found:

  js/core.js  "equipOv joins the per-exercise bags a rename must carry"
              introduced in v3.3.284 (the release that added equipOv);
              read v3.3.341 by the time it was noticed. 57 releases adrift.
  index.html  "NOT black-translucent. That setting pushes the page behind..."
              introduced in v3.3.246; read v3.3.341. 95 releases adrift.

A comment that cites the wrong release is worse than no comment: it sends the
next reader to a changelog entry about something else entirely, and the whole
value of this codebase's commentary is that it explains WHY, at the moment the
why was decided.

So this bumper does not know how to do a general replace. It rewrites three
shapes and nothing else, and buildcheck asserts afterwards that no occurrence
of the version survives outside them.
"""
import io
import re
import sys
import pathlib

stage, old, new = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
assert re.fullmatch(r"\d+\.\d+\.\d+", old) and re.fullmatch(r"\d+\.\d+\.\d+", new), "x.y.z please"

# the only three places a version legitimately appears
STAMPS = [
    (re.compile(r"\?v=\d+\.\d+\.\d+"), f"?v={new}"),                       # cache-busting query
    (re.compile(r"showup-v\d+\.\d+\.\d+"), f"showup-v{new}"),              # sw cache name
    (re.compile(r"(const APP_VERSION\s*=\s*')v\d+\.\d+\.\d+(')"), rf"\g<1>v{new}\g<2>"),
]

total = 0
for rel in ["index.html", "sw.js", "js/core.js"]:
    p = stage / rel
    s = io.open(p, encoding="utf-8", newline='').read()
    n = 0
    for rx, to in STAMPS:
        s, k = rx.subn(to, s)
        n += k
    io.open(p, "w", encoding="utf-8", newline='').write(s)
    print(f"  {rel}: {n} stamps")
    total += n

print("total stamps moved:", total)
if not total:
    print("NOTHING MOVED — check the version arguments")
    sys.exit(1)
