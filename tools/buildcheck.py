#!/usr/bin/env python3
"""buildcheck.py DIR — pre-push structural assertions for ShowUp.
Rebuilt 2026-07-21 (container reset lost the original; behavior per handoff doc):
  - every ?v= stamped asset in index.html exists on disk
  - one single version everywhere: APP_VERSION, all index stamps, sw CACHE, all SHELL stamps
  - every stamped asset appears in sw.js SHELL (12 assets)
  - every var(--x) used in css/app.css is defined in css/app.css
  - index.html shell < 8 KB
Exit 0 = pass. Any assertion failure prints and exits 1.
"""
import re, sys, pathlib

d = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "stage")
fail = []

idx = (d/"index.html").read_text()
sw  = (d/"sw.js").read_text()
core= (d/"js/core.js").read_text()
css = (d/"css/app.css").read_text()

# -- single version everywhere
vers = set(re.findall(r"\?v=(\d+\.\d+\.\d+)", idx))
m = re.search(r"APP_VERSION = 'v(\d+\.\d+\.\d+)'", core)
appv = m.group(1) if m else None
cm = re.search(r"CACHE = 'showup-v(\d+\.\d+\.\d+)'", sw)
cachev = cm.group(1) if cm else None
swvers = set(re.findall(r"\?v=(\d+\.\d+\.\d+)", sw))
allv = vers | swvers | {appv, cachev}
if len(allv) != 1 or None in allv:
    fail.append(f"version drift: index={vers} core={appv} sw-cache={cachev} sw-shell={swvers}")

# -- stamped assets exist and are in SHELL
assets = re.findall(r"(?:href|src)=\"([^\"?]+)\?v=", idx)
for a in assets:
    if not (d/a).exists(): fail.append(f"stamped asset missing on disk: {a}")
    if f"./{a}?v=" not in sw: fail.append(f"asset not in sw SHELL: {a}")
shell_count = len(re.findall(r"'\./[^']+\?v=", sw))
if shell_count != 12: fail.append(f"sw SHELL has {shell_count} stamped assets, expected 12")

# -- CSS vars used are defined (runtime-set vars from js/app.js are allowlisted)
RUNTIME = {"--i", "--len", "--sat"}   # set via style.setProperty / env() default
used = set(re.findall(r"var\((--[A-Za-z0-9-]+)", css))
defined = set(re.findall(r"(--[A-Za-z0-9-]+)\s*:", css))
undef = used - defined - RUNTIME
for v in sorted(undef): fail.append(f"CSS var used but never defined: {v}")

# -- SVG rect classes must not collide with flex/width HTML CSS (v3.3.48)
#    An SVG <rect class="x"> that also matches a CSS rule setting flex/width
#    renders as a giant overlapping block — and jsdom has no layout, so no
#    behavioral test can catch it. Guard the seam structurally.
import glob as _glob
svg_rect_classes = set()
for jsf in _glob.glob(str(d/"js"/"*.js")):
    src = pathlib.Path(jsf).read_text()
    for m in re.finditer(r'<rect class=\\?"([^"\\]+)', src):
        svg_rect_classes.update(m.group(1).split())
for cls in sorted(svg_rect_classes):
    # find that class's own rule body (not descendant/compound selectors)
    for m in re.finditer(r'(?<![\w.-])\.'+re.escape(cls)+r'\{([^}]*)\}', css):
        body = m.group(1)
        if re.search(r'(?:^|;)\s*(?:flex|width)\s*:', body):
            fail.append(f"SVG rect class .{cls} matches a flex/width CSS rule — will render as a block")

# -- badge-in-clipping-box guard (v3.3.49)
#    #app sets overflow-x:clip, which per spec forces overflow-y to compute as
#    'auto' — so #app clips vertically too. Any absolutely-positioned dismiss
#    badge with a NEGATIVE offset gets shaved at the content edge. This bug
#    survived two "fixes" because jsdom has no layout; assert it structurally.
_app_clips = bool(re.search(r'#app\{[^}]*overflow(?:-x)?:\s*clip', css))
if _app_clips:
    _badge = re.search(r'\.lschip \.lsx\{([^}]*)\}', css)
    if _badge and re.search(r'(?:top|left|right|bottom):\s*-\d', _badge.group(1)):
        fail.append("dismiss badge overhangs inside #app's clip box — it will be shaved (see v3.3.46-48)")

# -- the header is ONE row, always (v3.3.55)
#    flex-wrap:wrap on <header> let a long exercise title push the timer and
#    gear onto a second row. jsdom has no layout, so assert it structurally:
#    the header rule must not wrap, and its title must be able to truncate.
_hdr = re.search(r'(?<![\w.-])header\{([^}]*)\}', css)
if _hdr:
    _b = _hdr.group(1)
    if re.search(r'flex-wrap:\s*wrap', _b):
        fail.append("header sets flex-wrap:wrap — it can break onto two rows (see v3.3.55)")
    if 'display:flex' in _b and not re.search(r'flex-wrap:\s*nowrap', _b):
        fail.append("header is flex but never states flex-wrap:nowrap — wrapping is the default risk")
_hd = re.search(r'^\s*\.h-date\{([^}]*)\}', css, re.M)
if _hd and 'text-overflow:ellipsis' not in _hd.group(1):
    fail.append(".h-date cannot truncate — a long title will force the header wider or taller")

# -- the arrival greeting is ONE row (v3.3.66)
#    .hello puts a free-text name beside the day count, both nowrap. A long
#    name must truncate rather than push the count off-screen or onto a second
#    line. jsdom has no layout, so assert it structurally.
_hello = re.search(r'^\s*\.hello\{([^}]*)\}', css, re.M)
if _hello:
    if not re.search(r'flex-wrap:\s*nowrap', _hello.group(1)):
        fail.append(".hello does not state flex-wrap:nowrap — the greeting can break onto two rows")
    _hi = re.search(r'^\s*\.hello \.hi\{([^}]*)\}', css, re.M)
    if not _hi or 'text-overflow:ellipsis' not in _hi.group(1):
        fail.append(".hello .hi cannot truncate — a long name will push the day count off-screen")

# -- .btn is width:100%, so it must never be flex:0 0 auto (v3.3.68)
#    A .btn dropped into a flex row with flex:0 0 auto resolves its basis to
#    the FULL container width and then refuses to shrink: it overflows the card
#    and crushes whatever shares the row down to min-content. jsdom has no
#    layout and this renders perfectly in the DOM, so assert it at the source.
_btnw = re.search(r'^\s*\.btn\{([^}]*)\}', css, re.M)
if _btnw and 'width:100%' in _btnw.group(1):
    for _jsf in _glob.glob(str(d/"js"/"*.js")):
        _src = pathlib.Path(_jsf).read_text()
        for _m in re.finditer(r'<button[^>]*class=\\?"btn[^"\\]*\\?"[^>]*>', _src):
            if re.search(r'flex:\s*0\s+0\s+auto', _m.group(0)):
                fail.append(f"{pathlib.Path(_jsf).name}: a .btn uses flex:0 0 auto while .btn is "
                            f"width:100% — it will overflow its row (see v3.3.68). Use .btnrow.")

# -- shell size
n = len(idx.encode())
if n >= 8192: fail.append(f"index.html shell is {n} bytes (limit 8192)")

if fail:
    print("BUILDCHECK FAIL"); [print(" -", f) for f in fail]; sys.exit(1)
print(f"BUILDCHECK PASS  v{appv}  shell={n}B  assets={len(assets)}  cssvars={len(used)} used / {len(defined)} defined")
