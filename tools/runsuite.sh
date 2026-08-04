#!/usr/bin/env bash
# runsuite.sh DIR — run every behavioural suite and fail on ANY non-zero exit.
#
# Exists because of a specific hole: the old ad-hoc loop counted "FAIL" lines
# in the output, and a suite that CRASHED printed none — so a crash read as
# green. test-cards and test-sharecard crashed for fourteen releases
# (v3.3.130..143) calling share buttons that no longer existed, and the loop
# reported the suite green every time. Exit codes are the contract each test
# already honours (process.exit(1) on failure, and node exits 1 on a crash);
# this runner simply stops ignoring them.
set -u
DIR="${1:-.}"
NODE_PATH="${NODE_PATH:-/home/claude/node_modules}"
export NODE_PATH
bad=0; total=0
for t in "$DIR"/tools/test-*.js "$DIR"/tools/smoke.js; do
  [ -f "$t" ] || continue
  total=$((total+1))
  OUT=$(node "$t" "$DIR" 2>&1); RC=$?
  NP=$(printf '%s' "$OUT" | grep -c '^PASS')
  NF=$(printf '%s' "$OUT" | grep -c '^FAIL')
  if [ "$RC" -ne 0 ]; then
    bad=$((bad+1))
    if [ "$NF" -eq 0 ]; then
      # no FAIL lines but non-zero exit = a crash, the exact silent case
      echo "CRASH $(basename "$t")  (rc=$RC, $NP passed before dying)"
      printf '%s\n' "$OUT" | grep -m1 -E 'Error|error' | sed 's/^/      /'
    else
      echo "FAIL  $(basename "$t")  ($NF failing)"
      printf '%s\n' "$OUT" | grep '^FAIL' | head -4 | sed 's/^/      /'
    fi
  fi
done
if [ "$bad" -eq 0 ]; then echo "SUITE GREEN — $total suites, all exit 0"; exit 0
else echo "SUITE RED — $bad of $total suites"; exit 1; fi
