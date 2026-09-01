#!/usr/bin/env python3
"""deploy.py STAGE_DIR "commit message" file1 file2 ...
Pushes the listed files from STAGE_DIR to tahros/showup@main in ONE commit:
blobs -> tree -> commit -> ref PATCH (single Pages build)."""
import json, sys, base64, pathlib, urllib.request

TOK = pathlib.Path("/home/claude/.ghtok").read_text().strip()
API = "https://api.github.com/repos/tahros/showup"

def gh(path, method="GET", body=None):
    req = urllib.request.Request(API + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + TOK,
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

stage, msg, files = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3:]

# v3.3.114: wait out any in-flight Pages build BEFORE pushing.
# Five build-drops (v3.3.96, .100, .106, .113, .114) all shared one cause:
# a commit landed while a build was running and GitHub never enqueued one
# for it. Each needed a throwaway follow-up commit to re-trigger. Waiting
# here removes the cause instead of repeating the remedy.
import time
for _ in range(20):
    try:
        b = gh("/pages/builds/latest")
        if b.get("status") != "building":
            break
        print("  waiting: Pages is mid-build", (b.get("commit") or "")[:7])
    except Exception:
        break
    time.sleep(10)

head = gh("/git/ref/heads/main")["object"]["sha"]
base_tree = gh(f"/git/commits/{head}")["tree"]["sha"]
print("base commit:", head[:7], "tree:", base_tree[:7])

entries = []
for f in files:
    raw = (stage / f).read_bytes()
    blob = gh("/git/blobs", "POST",
              {"content": base64.b64encode(raw).decode(), "encoding": "base64"})
    entries.append({"path": f, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    print(f"  blob {blob['sha'][:7]}  {f}  ({len(raw)}B)")

tree = gh("/git/trees", "POST", {"base_tree": base_tree, "tree": entries})
commit = gh("/git/commits", "POST",
            {"message": msg, "tree": tree["sha"], "parents": [head]})
gh("/git/refs/heads/main", "PATCH", {"sha": commit["sha"], "force": False})
print("pushed:", commit["sha"])

# v3.3.395: leave the SHA on disk for verifyship.
#
# The trap this closes: verifyship was routinely invoked with a FRESH read of
# refs/heads/main, on the assumption that the ref reflects the push that just
# happened. It does not always. In v3.3.394 that read came back with the
# PREVIOUS commit -- the ref endpoint lagged the push by a moment -- so every
# check ran against the old tree and all three reported "actually absent".
#
# That failure is dangerous because it is INDISTINGUISHABLE from a real broken
# deploy: identical wording, every check red at once. The response to a broken
# deploy is to start unpicking working code, so a false alarm here costs more
# than a missing check would.
#
# The pushed SHA is known here exactly, with no second network read to be
# stale. verifyship reads this file when no SHA is given.
(stage / ".lastship").write_text(commit["sha"] + "\n")
print("sha recorded for verifyship: .lastship")
