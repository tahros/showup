#!/usr/bin/env python3
"""verifyship.py SHA file=/regex/ [file=/regex/ ...]

Fetch each file AT THE DEPLOYED COMMIT and assert the regex is present (or
absent, with a leading !). Every check runs against bytes GitHub is serving,
never against the local stage.

Why this exists (v3.3.330). The byte-verification habit -- fetch the deployed
file, cmp it against the stage file -- is CIRCULAR. It proves the transport
was faithful; it cannot prove the stage was right. In v3.3.329 exactly one
file (js/lift.js) went stale in the stage before the push, so the deployed
copy and the stage copy were the same WRONG bytes and cmp reported
BYTE-IDENTICAL. Everything else in that release landed, so the app shipped
half a feature: a formatter nothing called, and a deleted CSS rule whose
markup was still rendering, which made the line the maker asked me to delete
grow BIGGER on his screen.

cmp answers "did my file arrive?". This answers "is the feature there?".
Those are different questions and only the second one is the one that
matters.
"""
import re
import sys
import pathlib
import urllib.request

TOK = pathlib.Path("/home/claude/.ghtok").read_text().strip()
API = "https://api.github.com/repos/tahros/showup"

# v3.3.395: the SHA may be omitted, and omitting it is now the safer call.
#
# Callers used to pass a fresh read of refs/heads/main. That ref can LAG the
# push it is meant to describe: in v3.3.394 it returned the previous commit,
# so every check ran against the old tree and all three reported "actually
# absent" -- wording identical to a genuinely broken deploy. Chasing that
# false alarm means unpicking code that was fine.
#
# deploy.py writes the commit it actually created to .lastship. Reading that
# involves no second network call and therefore cannot be stale. A SHA given
# on the command line still wins, for verifying some older commit on purpose.
_args = sys.argv[1:]
if _args and re.fullmatch(r"[0-9a-f]{7,40}", _args[0]):
    sha, checks = _args[0], _args[1:]
else:
    _f = pathlib.Path(".lastship")
    if not _f.exists():
        sys.exit("verifyship: no SHA given and no .lastship — run deploy.py first, "
                 "or pass the commit explicitly")
    sha, checks = _f.read_text().strip(), _args
    print(f"  (verifying .lastship {sha[:7]} — the commit deploy.py pushed)")
cache, bad = {}, []

for spec in checks:
    path, _, pattern = spec.partition("=")
    want = not pattern.startswith("!")
    rx = pattern[1:] if not want else pattern
    if path not in cache:
        req = urllib.request.Request(
            f"{API}/contents/{path}?ref={sha}",
            headers={"Authorization": "Bearer " + TOK,
                     "Accept": "application/vnd.github.raw+json"})
        with urllib.request.urlopen(req) as r:
            cache[path] = r.read().decode("utf-8", "replace")
    found = re.search(rx, cache[path]) is not None
    ok = found is want
    print(f"  {'PASS' if ok else 'FAIL'}  {path}  "
          f"{'has' if want else 'lacks'}  {rx}"
          f"{'' if ok else f'   <-- actually {'present' if found else 'absent'}'}")
    if not ok:
        bad.append(spec)

if bad:
    print(f"SHIP UNVERIFIED -- {len(bad)} of {len(checks)} checks failed at {sha[:7]}")
    sys.exit(1)
print(f"SHIP VERIFIED -- {len(checks)} checks against deployed {sha[:7]}")
