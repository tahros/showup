# ShowUp verification harness

Committed so a container reset can't destroy it again (it has been rebuilt
from scratch twice). Nothing here is served to users — the app is
index.html + css/ + js/ + sw.js only.

## Setup in a fresh sandbox
    mkdir -p /home/claude/work/refactor && cd /home/claude/work/refactor
    # pull the repo into stageNN/, copy tools/* alongside it, then:
    npm install jsdom
    python3 buildcheck.py stageNN
    node smoke.js stageNN
    for t in todayhero settings sessfmt histpart reseal scrollpos exitpair \
             continue statspolish repweight enter addsub calreturn pastedit bw \
             bwcard; do
      node test-$t.js stageNN >/dev/null 2>&1 && echo "$t OK" || echo "$t FAIL"
    done

## What each piece does
- `buildcheck.py DIR` — structural gates: one version everywhere, stamped
  assets present and in sw.js SHELL (12), CSS vars defined, shell <8KB, plus
  three learned-the-hard-way guards:
  * SVG rect classes must not match a flex/width CSS rule (v3.3.48)
  * the dismiss badge must not overhang inside #app's clip box (v3.3.49)
  * `header` must never wrap; `.h-date` must truncate (v3.3.55)
  * `.hello` must not wrap; the name must truncate (v3.3.66)
- `smoke.js DIR` — boots all 11 scripts in jsdom, asserts header + view render
- `deploy.py DIR "msg" file...` — GitHub API blobs → tree → commit → ref PATCH
- `perf.js DIR` — render timing at real archive scale (918+ days)
- `test-*.js DIR` — 14 behavioural suites, listed in HANDOFF.md

## Hard-won rules these encode
- jsdom has NO layout. Anything that can only break visually (clipping,
  wrapping, overlap) needs a STRUCTURAL assertion in buildcheck.py, not a
  behavioural test that will pass while the phone shows it broken.
- Put new assertions BEFORE `process.exit(...)`. Appending after it has
  silently skipped them twice.
- Line-anchor CSS regexes (`^\s*\.foo\{`). A bare `\.foo\{` also matches
  `header.live .foo{...}` and will read the wrong rule.
- Fixtures must not key off the wall clock; scope to `todayISO` explicitly.
