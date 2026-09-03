#!/usr/bin/env python3
"""buildcheck.py DIR — pre-push structural assertions for ShowUp.
Rebuilt 2026-07-21 (container reset lost the original; behavior per handoff doc):
  - every ?v= stamped asset in index.html exists on disk
  - one single version everywhere: APP_VERSION, all index stamps, sw CACHE, all SHELL stamps
  - every stamped asset appears in sw.js SHELL (13 assets; writer.js joined in v3.3.400)
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
if shell_count != 13: fail.append(f"sw SHELL has {shell_count} stamped assets, expected 13")   # v3.3.400: js/writer.js joins the shell

# -- CSS vars used are defined (runtime-set vars from js/app.js are allowlisted)
# v3.3.324: --planw/--planr are measured in js/lift.js and written onto the
# plan card's inline style, so the plan's rows all lay out on the SAME columns.
# v3.3.352: --mcd/--mcu/--mcs are GONE. They were ch widths declared on the
# coverage row, where ch resolves in the row's font while the cells render in
# mono -- every track cut for a wider character than it holds. The card is one
# grid with max-content tail columns now: the layout measures itself, and
# there is nothing left to allowlist.
RUNTIME = {"--i", "--len", "--sat", "--planw", "--planr"}   # set via style.setProperty / inline style / env() default
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

# -- a tip is ONE breath, not a paragraph (v3.3.71)
#    The bw tip shipped at 367 chars / 62 words / 4 sentences and covered the
#    chart it was describing. Measured against the five tips that predate it
#    (41-94 chars, 8-18 words, 1-2 sentences) it was 3.9x the longest. Cap it
#    structurally so the next one cannot drift either. Tips must be inline
#    literals at the iBtn call site, as all of them now are.
TIP_MAX = 120
for _jsf in _glob.glob(str(d/"js"/"*.js")):
    _src = pathlib.Path(_jsf).read_text()
    for _m in re.finditer(r"iBtn\(\s*'[^']+'\s*,\s*(`[^`]*`|'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")", _src):
        _t = re.sub(r'\$\{[^}]*\}', 'XX', _m.group(1)[1:-1])
        if len(_t) > TIP_MAX:
            fail.append(f"{pathlib.Path(_jsf).name}: an iBtn tip is {len(_t)} chars "
                        f"(cap {TIP_MAX}) \u2014 tips are one sentence (see v3.3.71): {_t[:48]}...")
    if re.search(r"iBtn\(\s*'[^']+'\s*,\s*[A-Za-z_$][\w$]*\s*\)", _src):
        fail.append(f"{pathlib.Path(_jsf).name}: an iBtn tip is passed as a variable \u2014 "
                    f"inline the literal so its length can be checked (see v3.3.71)")

# -- installed-app zoom doctrine (v3.3.78): page zoom off, chart zoom on
#    The viewport must pin scale (iOS honours it only in standalone, which is
#    exactly the split we want), html must keep touch-action:manipulation,
#    and chart surfaces must keep touch-action:none so their own pinch works.
if 'user-scalable=no' not in idx:
    fail.append("viewport meta lost user-scalable=no \u2014 installed app will pinch-zoom (v3.3.78)")
if not re.search(r'html\{[^}]*touch-action:manipulation', css):
    fail.append("html lost touch-action:manipulation \u2014 double-tap zoom returns (v3.3.78)")
if not re.search(r'\.zoom\{[^}]*touch-action:none', css):
    fail.append(".zoom lost touch-action:none \u2014 chart pinch will fight the page (v3.3.78)")

# -- token contrast (v3.3.92): the WCAG floor is arithmetic, so it is a
#    guard. Every pair below failed or nearly failed the first audit; a
#    token edit that re-breaks one fails the build, not the user's eyes.
import re as _re
def _blk(css, sel):
    m=_re.search(_re.escape(sel)+r"\{(.*?)\}", css, _re.S)
    return m.group(1) if m else ""
def _tok(blk, name):
    m=_re.search(r"--"+name+r":\s*(#[0-9A-Fa-f]{6})", blk)
    return m.group(1) if m else None
def _rl(h):
    r,g,b=(int(h[i:i+2],16)/255 for i in (1,3,5))
    f=lambda v: v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def _cr(a,b):
    x,y=_rl(a),_rl(b); return (max(x,y)+0.05)/(min(x,y)+0.05)
def _mix(a,b,pa):
    return "#"+"".join(f"{round(int(a[i:i+2],16)*pa+int(b[i:i+2],16)*(1-pa)):02X}" for i in (1,3,5))
_dark=_blk(css,":root"); _light=_blk(css,':root[data-theme="light"]')
for _name,_blkc in (("dark",_dark),("light",_light)):
    T={k:_tok(_blkc,k) or _tok(_dark,k) for k in
       ("ground","surface","surface2","accent","accent-ink","record","rest","rest-ink","chart-soft","muted","faint","chalk","live")}
    if not all(T.values()):
        fail.append(f"contrast guard: missing token in {_name} theme: "+",".join(k for k,v in T.items() if not v)); continue
    _wash=_mix(T["rest"],T["ground"],0.52)
    for _fg,_bg,_need,_what in (
        (T["rest-ink"],_wash,4.5,"rest ink on its wash"),
        (T["muted"],T["surface2"],4.5,"muted on surface2"),
        (T["muted"],T["surface"],4.5,"muted on surface"),
        # v3.3.201: was 3.0 -- the loophole that let --faint ship at 4.06:1
        # (dark) and 2.60:1 on light --surface2. Faint carries unit-faint
        # grammar, day counts and chart annotations: real text a person has to
        # read at low brightness, so it owes the full 4.5 on EVERY ground it
        # sits on, not just the one that happened to be checked.
        (T["faint"],T["surface"],4.5,"faint on surface"),
        (T["faint"],T["surface2"],4.5,"faint on surface2"),
        (T["faint"],T["ground"],4.5,"faint on ground"),
        (T["muted"],T["ground"],4.5,"muted on ground"),
        (T["accent-ink"],T["surface"],4.5,"accent ink on surface"),
        (T["accent-ink"],T["surface2"],4.5,"accent ink on surface2"),
        (T["accent-ink"],T["ground"],4.5,"accent ink on ground"),
        (T["chart-soft"],T["surface"],3.0,"chart-soft stroke on surface"),
        # v3.3.202: --accent is a FILL now, not an ink (--accent-ink took the
        # text job). So the thing that owes 4.5 is the WHITE LABEL on it --
        # selected chips, segmented controls, primary buttons all put #fff on
        # this colour, and it was 3.67:1 for the app's whole life. As a
        # graphic it still owes 3:1 against the canvas.
        ("#FFFFFF",T["accent"],4.5,"white label on accent fill"),
        (T["accent"],T["ground"],3.0,"accent fill as a graphic on ground"),
        # v3.3.202: record was only ever checked on --surface, and sat at
        # 3.94 (dark) / 4.41 (light) on --surface2 unnoticed.
        (T["record"],T["surface2"],4.5,"record text on surface2"),
        (T["record"],T["surface"],4.5,"record text on surface"),
        ("#FFFFFF",T["live"],4.5,"white on live header"),
        (T["chalk"],T["surface"],7.0,"chalk on surface (reading text \u2192 AAA-ish)"),
    ):
        _r=_cr(_fg,_bg)
        if _r<_need:
            fail.append(f"contrast: {_what} = {_r:.2f} (< {_need}) in {_name} theme (v3.3.92)")

# -- part colours (v3.3.118): chart fills are graphical objects, so they owe
#    3:1 against their own theme's ground. This floor is what rejected
#    yellow-600 (2.65) and amber-600 (2.87) during the Tailwind mapping;
#    without it the palette would have shipped a Legs bar you cannot see.
for _name, _blkc, _ground_name in (("dark", _dark, "ground"), ("light", _light, "ground")):
    _g = _tok(_blkc, _ground_name) or _tok(_dark, _ground_name)
    for _m in _re.finditer(r"--p-([a-z]+):\s*(#[0-9A-Fa-f]{6})", _blkc):
        _r = _cr(_m.group(2), _g)
        if _r < 2.0:
            fail.append(f"part colour --p-{_m.group(1)} = {_r:.2f}:1 on {_name} ground (< 2.0) (v3.3.121)")

# -- card rhythm (v3.3.138): the containers stacked down the Lift view are
#    different classes with the same job — a card in a column. They drifted
#    apart once (.lastcard sat at 26px against .zone's 14px, which read as a
#    section break under "Logged today" that nobody intended). One number,
#    asserted, so the next person to touch either rule has to touch both.
_margins = {}
for _cls in ("zone", "lastcard"):
    _m = _re.search(r"\.%s\{[^}]*?margin-top:\s*(\d+)px" % _cls, css)
    if not _m:
        fail.append(f"card rhythm: .{_cls} has no margin-top to check (v3.3.138)")
    else:
        _margins[_cls] = int(_m.group(1))
if len(_margins) == 2 and len(set(_margins.values())) != 1:
    fail.append("card rhythm: " + ", ".join(f".{k}={v}px" for k, v in _margins.items())
                + " — stacked cards must share one margin (v3.3.138)")

# -- modal gesture isolation (v3.3.140): overlays mounted on <body> sit
#    OUTSIDE #app, so the global touch gestures (tab-swipe, pull-to-refresh)
#    track them unless explicitly blocked. That shipped as a real bug: the
#    share overlay rotated its card AND changed tab underneath. Any
#    position:fixed;inset:0 overlay is a modal by definition, so every one of
#    them must appear in both blocklists. Catches the NEXT one, not this one.
_util = (d/"js/util.js").read_text()
for _m in _re.finditer(r"#([A-Za-z][\w-]*)\{[^}]*position:fixed[^}]*inset:0[^}]*\}", css):
    _id = _m.group(1)
    _hits = _util.count("#" + _id)
    # v3.3.356: ONE blocklist now, not two. The tab swipe is gone and its list
    # with it; pull-to-refresh is the only global gesture left that a modal
    # must sit above. The rule v3.3.140 was defending is unchanged -- a
    # full-screen overlay must not let a page gesture run underneath it -- so
    # the count moves from 2 to 1 rather than the check being dropped.
    if _hits < 1:
        fail.append(f"modal #{_id} is position:fixed;inset:0 but is not in "
                    f"the pull-to-refresh blocklist in util.js (v3.3.140/356)")

# -- Minimal skin (v3.3.168): the DEFAULT skin is a chrome layer, not an ink
#    layer. Three guards: (1) its token blocks may only define an allowlisted
#    set, so every contrast pair the theme guard cleared above is still the
#    pair on screen — the skin cannot quietly restyle an ink out from under
#    its own audit; (2) the pill chrome it introduces is a NEW ink-on-ground
#    pair, so it owes the same 4.5 arithmetic as every other small-text ink;
#    (3) --live is untouchable anywhere under the skin selector — red-means-
#    live is a law, not a style. Plus: the pre-paint must carry the skin, or
#    every cold start flashes Classic for one frame.
_sk_d = _blk(css, ':root[data-skin="minimal"]')
_sk_l = _blk(css, ':root[data-skin="minimal"][data-theme="light"]')
if not _sk_d or not _sk_l:
    fail.append("minimal skin: token blocks missing (dark AND light are required) (v3.3.168)")
else:
    # v3.3.328: --whisper joins the allowlist beside --line. Same category:
    # a divider tone is chrome (it separates, it never carries meaning), and
    # the skin tints its dividers to its own surface family. The ink tokens
    # this rule protects (chalk/faint/muted/accent/live) stay forbidden.
    _allow = {"line", "whisper", "shadow", "pill", "pill-ink", "pill-accent", "pill-shadow"}
    for _bn, _bc in (("dark", _sk_d), ("light", _sk_l)):
        _bad = [t for t in _re.findall(r"--([a-z][a-z-]*):", _bc) if t not in _allow]
        if _bad:
            fail.append(f"minimal skin ({_bn}) defines non-chrome tokens: "
                        + ",".join(_bad) + " — the skin is chrome, not ink (v3.3.168)")
        _p, _pi, _pa = _tok(_bc, "pill"), _tok(_bc, "pill-ink"), _tok(_bc, "pill-accent")
        if not all((_p, _pi, _pa)):
            fail.append(f"minimal skin ({_bn}): pill token trio incomplete (v3.3.168)")
        else:
            for _fg, _what in ((_pi, "pill ink"), (_pa, "pill accent")):
                _r = _cr(_fg, _p)
                if _r < 4.5:
                    fail.append(f"contrast: {_what} on pill = {_r:.2f} (< 4.5) in minimal/{_bn} (v3.3.168)")
if _re.search(r'data-skin="minimal"[^{]*\{[^}]*--live:', css):
    fail.append("minimal skin redefines --live — red-means-live is a law (v3.3.168)")
if "showup-skin" not in idx:
    fail.append("index.html pre-paint lost the skin — cold starts flash Classic (v3.3.168)")

# -- Bottom-anchored fixed chrome (v3.3.179): nav and the calendar-return
#    button are pinned to the viewport bottom, where iOS only re-anchors
#    position:fixed at the END of a scroll gesture. Without an explicit
#    compositing layer they visibly hang mid-screen mid-scroll. This guard
#    keeps the hint attached to BOTH — it was found in Minimal but the base
#    sheet owns the bug, so a skin-only fix would have left Classic broken.
_layer = _re.search(r"nav,\.calreturn\{([^}]*)\}", css)
if not _layer:
    fail.append("bottom-anchored fixed chrome lost its compositing rule (v3.3.179)")
else:
    _body = _layer.group(1)
    if "translateZ(0)" not in _body or "will-change" not in _body:
        fail.append("nav/.calreturn compositing hint incomplete — "
                    "needs translateZ(0) AND will-change or iOS hangs them mid-scroll (v3.3.179)")
if _re.search(r'data-skin="minimal"\]\s*nav\{[^}]*overflow:hidden', css):
    fail.append("minimal nav re-added overflow:hidden — extra iOS layer trigger (v3.3.179)")

# -- Session head (v3.3.180): the right column carries the volume string and
#    the Share/Edit controls together. If it loses its own flex context the
#    three collapse back into one inline flow and wrap into each other the
#    moment a day has three body parts.
_headcol = _re.search(r"\.day summary>span:last-child\{([^}]*)\}", css)
if not _headcol or "display:flex" not in _headcol.group(1):
    fail.append("session head right column is not a flex line — "
                "volume and controls will re-jumble on long part lists (v3.3.180)")
if not _re.search(r"\.day summary>span:first-child\{[^}]*min-width:0", css):
    fail.append("session head left column lost min-width:0 — it cannot shrink, "
                "so it pushes the controls off (v3.3.180)")

# -- Growth Audit (v3.3.209): time/confidence thresholds have one definition
#    site, the retired Rep-zone claim is gone, and comparison remains strictly
#    exercise-local. These are product truth guards, not formatting checks.
_stats = (d/"js/stats.js").read_text()
for _cn in ("GA_RECENT_DAYS", "GA_HISTORY_DAYS", "GA_PR_DAYS"):
    _defs = _re.findall(r"const\s+" + _cn + r"\s*=", _stats)
    if len(_defs) != 1:
        fail.append(f"growth audit: {_cn} defined {len(_defs)} times — one definition site required (v3.3.209)")
    if not _re.search(_cn + r"\b", _stats.replace("const " + _cn, "", 1)):
        fail.append(f"growth audit: {_cn} defined but never referenced (v3.3.209)")
_stats_code = _re.sub(r"/\*.*?\*/", "", _stats, flags=_re.S)
_stats_code = _re.sub(r"//[^\n]*", "", _stats_code)
if "Rep zones" in _stats_code or _re.search(r"\brepZone(?:Data|Sets|ScatterSvg)?\s*\(", _stats_code):
    fail.append("growth audit: retired Rep-zone UI or bucketing logic survives (v3.3.209)")
# v3.3.241: no frosted chrome may mix a state colour straight into
# transparent — that leaves the header without a body, and a scrolled page
# bleeds through it (the resting-day smudge). A frost must carry the ground:
# mix the state into the ground FIRST, then let a little light through.
_css_frost = css[css.find("@supports ((-webkit-backdrop-filter"):]
_css_frost = _css_frost[:_css_frost.find(".h-sub")]
# The rule is a BODY FLOOR, not a construction style: whatever is mixed
# with transparent must keep at least 70% of itself, matching the weakest
# deliberate frost. This still guards NAV.
for _m in _re.finditer(r"background:color-mix\(in srgb,[^;}]*?(\d+)%,transparent\)", _css_frost):
    if int(_m.group(1)) < 70:
        fail.append(f"frosted chrome: a frost keeps only {_m.group(1)}% of its body — "
                    "below the 70% floor, a scrolled page bleeds through (v3.3.241)")
# v3.3.242: and the HEADER is never frosted at all. A backdrop blur cannot
# sample pixels above the first row of the viewport, so iOS clamps and the
# strip behind the status bar washes out — the seam lands exactly on
# env(safe-area-inset-top). Nav is fine: it sits at the bottom edge with a
# full backdrop beneath it.
# v3.3.245: Safari 26 tints and blurs the status bar from background-color /
# backdrop-filter declared ON a fixed element near the viewport edge, and
# skips position:absolute children. So the fixed header must declare NEITHER,
# and all of its paint lives on .hglass.
for _m in _re.finditer(r"\n\s*header(?:\.[\w-]+)*\{([^}]*)\}", css):
    _body = _m.group(1)
    if _re.search(r"backdrop-filter", _body):
        fail.append("the fixed header must not declare backdrop-filter — Safari 26 "
                    "samples it and composites a blur over the status bar (v3.3.245)")
    _bg = _re.search(r"background(?:-color)?:\s*([^;}]+)", _body)
    if _bg and _bg.group(1).strip() not in ("transparent", "none"):
        fail.append(f"the fixed header must not paint a background ({_bg.group(1).strip()[:40]}) — "
                    "move it to the absolute .hglass child (v3.3.245)")
# match the STANDALONE .hglass rule, not `header.live .hglass`
_hg = _re.search(r"(?:^|\})\s*\.hglass\{([^}]*)\}", css.replace("\r",""), _re.M)
if not _hg or "position:absolute" not in _hg.group(1):
    fail.append(".hglass must exist and be position:absolute — Safari 26 skips "
                "absolute children when tinting, which is the whole point (v3.3.245)")
# v3.3.246: content must NOT sit behind the status bar. iOS 26 composites a
# progressive blur over anything in that strip, and no CSS defeats it — the
# only remedy is to let the system inset the web view below it.
_html = (d/"index.html").read_text()
_sbs = _re.search(r'<meta\s+name="apple-mobile-web-app-status-bar-style"\s+content="([^"]+)"', _html)
if _sbs and _sbs.group(1) == "black-translucent":
    fail.append("apple-mobile-web-app-status-bar-style must not be black-translucent — "
                "it puts the header under the status bar, where iOS 26 blurs it (v3.3.246)")
if 'class="hglass"' not in (d/"index.html").read_text():
    fail.append("the header is missing its .hglass paint layer (v3.3.245)")
# the article's other requirement: an explicit root colour for Safari to fall back to
if not _re.search(r"html,\s*body\{[^}]*background:", css):
    fail.append("html/body must declare an explicit background — Safari 26 falls "
                "back to white when the root is transparent (v3.3.245)")
# v3.3.244: the shell must actually register its service worker. Without a
# register() call the worker on a device is whatever a past version installed,
# and shipped fixes arrive a launch late (or never).
_derive = (d/"js/derive.js").read_text()
if "serviceWorker.register(" not in _derive:
    fail.append("no serviceWorker.register() call — deployed updates cannot reach "
                "an installed app reliably (v3.3.244)")
if "reg.update()" not in _derive and ".update()" not in _derive:
    fail.append("service worker is registered but never asked to update (v3.3.244)")
if "function gaPR" not in _stats:
    fail.append("growth audit: exercise-local comparable-best logic is missing (v3.3.209)")
# v3.3.220: the badge and the mark must come from ONE computation. They shipped
# as two machines on two clocks and contradicted each other on real rows ("+2.5
# kg" beside a flat mark). If a row's icon is ever chosen by anything other
# than the same record object that prints the badge, that regression is back.
# v3.3.221: anchor without the closing quote -- the row's class is now
# dynamic (`garow${...open}`), and a find() that misses returns -1, which
# silently slices from the END of the file and fails an otherwise fine build.
_garow = _stats[_stats.find('<div class="garow'):]
_garow = _garow[:_garow.find("</div>`).join")]
if "e.record.live" not in _garow:
    fail.append("growth audit: row icon must be driven by the same record as the badge — "
                "badge and mark cannot use separate standards (v3.3.220)")
if "Heaviest" in _garow or "garecord" in _garow:
    fail.append("growth audit: exercise rows must not display the retired Heaviest summary (v3.3.226)")
if _re.search(r"state\.key|gaExerciseState|gaRecord\(", _stats):
    fail.append("growth audit: a second growth standard survives alongside gaPR (v3.3.220)")
_gapr = _stats[_stats.find("function gaPR"): _stats.find("function growthAuditData")]
_day_boundary = _gapr.find("Only after every set has been judged")
# v3.3.253 restates the comment phrase: completion was never part of the rule
# (an in-progress PR lights the audit, pinned in test-stats-repzone), so the
# words "completed" left the comment. The structural check is unchanged:
# seen.push must sit after the day boundary.
if (_day_boundary < 0 or _gapr.find("seen.push") < _day_boundary
        or "sets from earlier days only" not in _gapr):
    fail.append("growth audit: sets from one workout must not become baselines until the next day (v3.3.227)")
if not _re.search(r"const GA_SIGNAL_LABELS=\{empty:'Empty',flat:'Flat',up:'Going up'\}", _stats):
    fail.append("growth audit: public model must contain exactly Empty, Flat and Going up (v3.3.211)")
# v3.3.357: bound the slice to the growth-audit row itself. This used to run
# from "shown.map" to the next "</div>`).join" ANYWHERE in the file -- which
# happened to be inside muscleCard, thousands of lines later. Editing muscleCard
# for the muscle roster removed that occurrence, the slice ran on to the next
# one, and the guard failed on a <small> in the attendance hero it was never
# meant to read. A guard whose extent depends on unrelated code reports on
# unrelated code. It now ends at the row template's own terminator.
_gastart = _stats.find("shown.map")
_gaend = _stats.find("`).join('')", _gastart)
_gareceipt = _stats[_gastart:_gaend if _gaend > _gastart else _gastart]
if "GA_ICONS" in _stats or "<small>" in _gareceipt:
    fail.append("growth audit: text glyph map or exercise subtitle returned (v3.3.211)")
for _asset in ("status-flat.png", "status-up.png"):
    if not (d/"assets"/_asset).exists():
        fail.append(f"growth audit: Noun Project asset missing: assets/{_asset} (v3.3.211)")
    if _asset not in css or f"./assets/{_asset}" not in sw:
        fail.append(f"growth audit: assets/{_asset} is not wired through CSS and service worker (v3.3.211)")
if (d/"assets"/"status-empty.png").exists() or "status-empty.png" in css or "./assets/status-empty.png" in sw:
    fail.append("growth audit: Empty must remain a native CSS dot, not an image asset (v3.3.211)")
if not _re.search(r"\.ga-empty\{[^}]*radial-gradient", css):
    fail.append("growth audit: Empty CSS dot is missing (v3.3.211)")
if not (_re.search(r"\.ga-empty\{[^}]*color:var\(--faint\)[^}]*opacity:\.55", css)
        and _re.search(r"\.ga-flat\{[^}]*color:var\(--faint\)[^}]*opacity:\.55", css)):
    fail.append("growth audit: Empty and Flat must share the same muted gray treatment (v3.3.212)")
_gahelp = _stats[_stats.find("function growthAuditSection"):_stats.find("function sessionBuild")]
# v3.3.253: every receipt row is built by ONE formatter, mk(), which always
# carries gaDay(p.d) — the v3.3.226 property (Previous best has its own source
# date) now holds by construction. Guard the construction: the row for
# pr.beat must go through mk, and mk must print the date.
if ("mk('Previous best',pr.beat)" not in _gahelp
        or not _re.search(r"const mk=\(k,p\)=>\[k,[^\]]*gaDay\(p\.d\)\]", _gahelp)):
    fail.append("growth audit: Previous best must carry its own source date (v3.3.226)")
if not _re.search(r"\.garcrow\{[^}]*grid-template-columns:100px auto minmax\(0,1fr\)", css):
    fail.append("growth audit: receipt dates must stay beside values, not at the far edge (v3.3.226)")
if not all(_phrase in _gahelp for _phrase in (
        "Dot: no sets in 7 days", "line: no clear gain",
        "trend: a later day went heavier than anything in the last six months, "
        "or did more reps at a load used in them")):
    fail.append("growth audit: information control must explain all three signals (v3.3.212)")
# v3.3.252: the trend phrasing above is NOT decoration. It is the only place a
# user is told what earns a record, and it said "comparable load and reps"
# while the code had accepted a heavier load at any rep count since v3.3.237.
# Guard the retired clause by name so it cannot return through any of its four
# homes (this file, the section comment, the tip, the test).
if "matches or beats the reps on the previous heaviest set" in _stats:
    fail.append("growth audit: the rep clause deleted in v3.3.237 has returned to js/stats.js")
if any(_credit in _gahelp for _credit in ("Noun Project", "ARIPATUT DASUKI", "Travis Avery")):
    fail.append("growth audit: icon credits belong in Settings, not the information control (v3.3.212)")

# -- Session Build (v3.3.228): the approved minimal legend keeps real,
#    thumb-sized controls but removes the filled capsule cloud and the
#    permanently visible instruction line. The info control owns that copy.
if any(_retired in _stats for _retired in ('function pmixHint', 'id="pmixRead"', 'class="pmixread"')):
    fail.append("session build: retired always-visible instruction returned (v3.3.228)")
if not all(_contract in _stats for _contract in (
        'class="pmixlgd" role="group" aria-label="Follow a body part"',
        '<button type="button" data-pt=', 'aria-pressed=',
        'Tap a label to follow it; tap again for all.')):
    fail.append("session build: minimal legend semantics or info copy are incomplete (v3.3.228)")
_flat_css = css.replace("\n", "")
# v3.3.306 RESTATES the three v3.3.228/229 legend guards. They pinned the
# 4+3 GRID and the underline that marked a selection inside it. The legend is
# now one scrolling line of colour bars over names, so those literals describe
# a layout that no longer exists — but every PROPERTY they defended still
# holds and is guarded here: thumb-sized transparent targets, a visible
# selected state, and (new, because the line can clip) an edge fade plus a
# blocklist entry so a sideways drag cannot change tab.
if not _re.search(r"\.pmixlgd\{[^}]*display:flex[^}]*overflow-x:auto", _flat_css):
    fail.append("session build: the legend must be one scrolling line (v3.3.306)")
if _re.search(r"\.pmixlgd\{[^}]*display:grid", _flat_css):
    fail.append("session build: the legend grid returned — seven parts hole its second row (v3.3.306)")
if not _re.search(r"\.pmixlgd button\{[^}]*min-height:44px", _flat_css) \
   or not _re.search(r"\.pmixlgd button\{[^}]*background:transparent", _flat_css):
    fail.append("session build: legend targets must remain transparent and thumb-sized (v3.3.228)")
if not _re.search(r"\.pmixlgd button\.on\{[^}]*color:var\(--chalk\)", _flat_css) \
   or not _re.search(r"\.pmixlgd button\.on i\{[^}]*opacity:1", _flat_css):
    fail.append("session build: the selected part must be visibly selected (v3.3.306)")
if not _re.search(r"\.pmixlgdwrap::after\{[^}]*linear-gradient", _flat_css):
    fail.append("session build: a clipped legend name must fade, not cut off (v3.3.306)")
# v3.3.356: the legend's blocklist guard is gone with the gesture it protected.
# A guard that outlives its feature is a rule waiting to be quoted back as
# current (v3.3.252). The legend still scrolls sideways; nothing competes for
# that axis any more.
if not all(_logic in _stats for _logic in (
        "let latestIndex=rows.length-1", "if(PMIX_FOCUS)",
        "latest=i===latestIndex", "p===PMIX_FOCUS")):
    fail.append("session build: latest animation must follow the selected body part (v3.3.229)")
_settings = (d/"js/settings.js").read_text()
# v3.3.359: the day's share and edit marks join the same line. The Noun
# Project's free tier is royalty-free ON CONDITION of credit, so this is the
# licence being satisfied, not a courtesy -- and it belongs somewhere
# permanent rather than in a README nobody opens. One list, not a second
# convention beside it.
if not all(_credit in _settings for _credit in (
        "minus-8363736", "trend-2344331", "ARIPATUT DASUKI",
        "Travis Avery", "share-2438501", "edit-1751206", "Timur Minvaleev",
        "Noun Project")):
    fail.append("settings: an icon credit or source link is missing (v3.3.212/359)")
if not _re.search(r"ShowUp \$\{APP_VERSION\}</div>\s*<div class=\"note assetcredits\"", _settings):
    fail.append("settings: icon credits must sit beneath the app version (v3.3.212)")

if any(_old in _stats for _old in ("Stated, not trained", "INTENT_GAP_DAYS",
        "intentGaps", "intentGapCard", "data-igretire")):
    fail.append("stats: retired Stated, not trained feature returned")
if "data-igback" in _settings or "Hidden from \\u201cStated, not trained\\u201d" in _settings:
    fail.append("settings: controls for retired Stated, not trained feature returned")

# -- Class/CSS coupling (v3.3.193): a class emitted by JS with no rule in the
#    sheet ships an unstyled feature. This happened twice in a row — the edits
#    adding the merge picker's and the intent-gap list's styles both anchored
#    on a selector deleted two releases earlier, so they silently changed
#    nothing and the gate had nothing to say. These are the classes those two
#    features depend on; a missing one now fails the build.
_need_css = ["gasel", "gahead", "gastate", "garows", "garow",
             "gabadge", "ga-empty", "ga-flat", "ga-up",
             "mcrow", "mcdots", "mcinner"]
for _cls in _need_css:
    # v3.3.205: a compound selector (.rzdot.on{) is still a rule for .rzdot,
    # as is an attribute or descendant form. The original character set
    # omitted "." and "[" and so reported a styled class as unstyled.
    if not _re.search(r"\." + _cls + r"[\s,{:+>.\[]", css):
        fail.append(f"class .{_cls} is emitted by JS but has no CSS rule — "
                    f"feature would ship unstyled (v3.3.193)")

# -- Muscle taxonomy (v3.3.194): three structural laws. (1) Every catalog
#    exercise except Run maps to a primary muscle — an unmapped one silently
#    falls to a part fallback and the coverage card under-reports. (2) Every
#    mapped muscle belongs to exactly one visible group. (3) Register: the
#    coverage card states days; targets, warnings and prescriptions are out.
_dv = (d/"js/derive.js").read_text()
_exm = dict(_re.findall(r"'([^']+)':'([a-z-]+)'", _dv[_dv.find("const EX_MUSCLE="):_dv.find("const EX_MUSCLE_2ND")]))
_mv  = dict(_re.findall(r"'?([a-z-]+)'?:'([A-Za-z]+)'", _dv[_dv.find("const MUSCLE_VISIBLE="):_dv.find("const EX_MUSCLE=")]))
_cat = _re.findall(r'"([^"]+)":"(?:Chest|Back|Shoulder|Legs|Biceps|Triceps|Sixpack)"', core)
_missing = [e for e in _cat if e not in _exm]
if _missing:
    fail.append(f"muscle taxonomy: {len(_missing)} catalog exercise(s) unmapped: "
                + ", ".join(_missing[:4]) + ("…" if len(_missing)>4 else "") + " (v3.3.194)")
_badm = sorted({m for m in _exm.values() if m not in _mv})
if _badm:
    fail.append("muscle taxonomy: primary muscle(s) with no visible group: "
                + ",".join(_badm) + " (v3.3.194)")
_vgm = _re.search(r"const VISIBLE_GROUPS=\[([^\]]+)\]", _dv)
_visible = _re.findall(r"'([^']+)'", _vgm.group(1)) if _vgm else []
if _visible != ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"]:
    fail.append("muscle taxonomy: visible groups must be Chest, Back, Shoulders, "
                "Arms, Legs, Core — Glutes stays internal (v3.3.210)")
_mcsec = _stats[_stats.rfind("/*",0,_stats.find("v3.3.194 — muscle coverage")):_stats.find("function currentRhythmSection")]
_mctip = _re.search(r"hActs\('mc','([^']*)'", _stats)
_mcsec += "\n" + (_mctip.group(1) if _mctip else "")
# v3.3.370: the heading is "The last 7 days" now; the guard follows the tip's
# own id so a future rename cannot silently drop this card out of the scan.
_mch2 = _re.search(r"<h2>[^<`]*\$\{hActs\('mc'[^`]*`", _stats)
_mcsec += "\n" + (_mch2.group(0) if _mch2 else "")
_mccopy = _re.sub(r"/\*.*?\*/","",_mcsec,flags=_re.S); _mccopy=_re.sub(r"//[^\n]*","",_mccopy)
#    'target' must not match e.target (code, not copy) — require a word edge
for _bad in (r"(?<![.a-z])target", "ideal", "behind", "warning", "should", "--live"):
    if _re.search(_bad, _mccopy.lower()):
        fail.append(f"muscle coverage: out-of-register copy or colour ({_bad!r}) (v3.3.194)")

# -- v3.3.216: Growth Audit follows the same card-to-heading gap as every
#    neighbouring Stats section. A dedicated heading class or margin override
#    would silently recreate the oversized gap removed in this release.
if 'class="gah"' in _stats or _re.search(r"\.gah[\s,{:+>.\[]", css):
    fail.append("section spacing: Growth Audit must use the base h2 gap (v3.3.216)")

# -- Handler presence (v3.3.209): a perfect-looking body-part selector with no
#    listener is still broken. Keep the emitted control and delegated hook paired.
if 'id="gaGrp"' in _stats and "id!=='gaGrp'" not in _stats:
    fail.append("growth audit: gaGrp is emitted but has no change handler (v3.3.209)")
if any(_old in _stats for _old in ('class="gabase"', 'class="ganext"', 'What the record says')):
    fail.append("growth audit: retired explanatory prose block returned (v3.3.210)")

# -- v3.3.230: attendance is one hero; the longer comparisons remain intact.
for _fn in ("currentRhythmSection", "consistencyRaceSection", "monthlyPaceSection"):
    if _stats.count("function " + _fn) != 1:
        fail.append(f"stats: {_fn} must have one definition (v3.3.213)")
# v3.3.257: the declared order now leads with Session build (maker's order);
# the guard anchors on the assignment shape, not on which section leads, and
# still requires the three attendance sections present and no retired ones.
_order = _re.search(r"h\s*=\s*_S\.\w+[^;]+;", _stats)
if not _order or not all(_seg in _order.group(0) for _seg in
        ("_S.kpis", "_S.consrace", "_S.mpace")) or any(_seg in _order.group(0) for _seg in ("_S.rhythm", "_S.em")):
    fail.append("stats: unified attendance, Consistency and Monthly pace must render without duplicate time sections (v3.3.230)")
if _order and _re.search(r"_S\.(?:cons|dbm|last6|wd)\b", _order.group(0)):
    fail.append("stats: a retired time section returned to the declared order (v3.3.213)")
_util = (d/"js/util.js").read_text()
# -- v3.3.287: THE REP RULER'S LAYOUT CANNOT BE TESTED BY THE SUITES.
# jsdom has no layout engine, so 51 green suites shipped a ruler that rendered
# as an empty grey strip: the centre band was a float+position:sticky child of
# the scroll container, and it displaced the flex track out of view. The
# behaviour was perfect and invisible. What IS checkable is the structure that
# made it possible, so these are the guards:
#   1. the band must be a sibling of the scroller, never a child of it;
#   2. neither band nor track may use float or position:sticky;
#   3. the track must carry the lead/tail padding that lets the first and last
#      notch reach the centre — without it the ends are unselectable.
_lift_rr = (d/"js/lift.js").read_text()
_m = _re.search(r'<div class="repwrap">([\s\S]{0,400}?)</div>\s*`', _lift_rr)
if not _m:
    fail.append("ruler: .repwrap not found in js/lift.js (v3.3.287)")
else:
    _blk = _m.group(1)
    _ib, _is = _blk.find('class="rrband"'), _blk.find('id="repRuler"')
    if _ib < 0:
        fail.append("ruler: the centre band is missing from .repwrap (v3.3.287)")
    elif _is < 0:
        fail.append("ruler: the scroller is missing from .repwrap (v3.3.287)")
    elif _ib > _is:
        fail.append("ruler: the band must precede the scroller, not sit inside it — the v3.3.287 blank-ruler bug")
_css_rr = (d/"css/app.css").read_text()
_rr_block = _css_rr[_css_rr.find(".repwrap{"): _css_rr.find(".repgrid{")]
for _bad in ("float:", "position:sticky"):
    if _bad in _rr_block:
        fail.append(f"ruler: {_bad} in the ruler's CSS — it displaced the track once already (v3.3.287)")
# v3.3.289 RESTATES this guard. It pinned the centring PADDING — which turned
# out to be the bug: WebKit drops a flex scroller's trailing padding from the
# scrollable overflow area, so the last notch could never reach the band. The
# room is now two real spacer elements, and the property to defend is that
# BOTH ends have one. A single spacer would centre the first notch and strand
# the last, which is exactly the state the maker photographed.
if not _re.search(r"\.rrpad\{[^}]*flex:0 0 calc\(50% ?- ?22px\)", _rr_block):
    fail.append("ruler: .rrpad lost its half-width — the ends cannot reach the centre band (v3.3.289)")
if len(_re.findall(r'class="rrpad"', _lift_rr)) != 2:
    fail.append("ruler: the track needs exactly TWO spacers, lead and tail — one strands the far end (v3.3.289)")
if "padding:0 calc(50%" in _rr_block.replace(" ", " "):
    fail.append("ruler: .rrtrack is using padding for centring again — WebKit drops the trailing side (v3.3.289)")
# v3.3.291: the ruler owns its axis. Without touch-action:pan-x a drag that
# starts on the ruler and wanders off the horizontal scrolls the PAGE, which
# is what the maker felt. jsdom cannot compute this, so the declaration is
# what gets guarded.
if not _re.search(r"\.repruler\{[^}]*touch-action:pan-x", _rr_block.replace("\n", "").replace("\r", "")):
    fail.append("ruler: .repruler lost touch-action:pan-x — a drag on it can scroll the page again (v3.3.291)")
# v3.3.293: the edge fade must stay OFF the scroller. A mask on a scrolling
# element has a long WebKit history of killing momentum, and per-notch opacity
# in JS would refill the scroll path v3.3.289/290 emptied. Two static overlays
# in the wrapper, and nothing else.
_rr_flat = _rr_block.replace("\n", "").replace("\r", "")
if _re.search(r"\.repruler\{[^}]*mask-image", _rr_flat):
    fail.append("ruler: a mask on .repruler risks killing momentum — fade in .repwrap instead (v3.3.293)")
# match each SIDE's own rule, not the shared declaration block: a combined
# ".repwrap::before,.repwrap::after{...}" selector satisfies a naive search
# for either name even after one side's positioning rule is deleted.
if not (_re.search(r"\.repwrap::before\{[^}]*left:0", _rr_flat)
        and _re.search(r"\.repwrap::after\{[^}]*right:0", _rr_flat)):
    fail.append("ruler: the edge fade needs BOTH sides positioned — one side would fade alone (v3.3.293)")
# and the iOS haptic must be feature-detected, never browser-sniffed
_app_hap = (d/"js/app.js").read_text()
if "'switch' in HTMLInputElement.prototype" not in _app_hap:
    fail.append("haptics: the iOS switch tap must be feature-detected on the property (v3.3.291)")
if _re.search(r"(iPhone|iPad|navigator\.userAgent)[^\n]*hapt", _app_hap, _re.I):
    fail.append("haptics: browser-sniffing for the haptic path — detect the feature (v3.3.291)")

# -- v3.3.278: A PLAN IS NOT A CONTRACT. Three properties, enforced, because
# every one of them is a thing a future release could quietly break:
#   1. the record never learns about plans — derive.js, report.js and stats.js
#      must not read DB.plan, so nothing can be scored against it;
#   2. planSave never writes to DB.days — a plan cannot log itself;
#   3. no adherence vocabulary anywhere — the moment "completed/remaining/
#      adherence/of N done" appears next to a plan, ShowUp has a failure state.
for _f in ("js/derive.js", "js/report.js", "js/stats.js"):
    if "DB.plan" in (d/_f).read_text():
        fail.append(f"plan: {_f} reads DB.plan — the record must not know about plans (v3.3.278)")
    # v3.3.398: a week is a document of plans; the same wall stands around it
    if "DB.week" in (d/_f).read_text():
        fail.append(f"week: {_f} reads DB.week — the record must not know about weeks (v3.3.398)")
_ws = _util_plan_ws = (d/"js/util.js").read_text().find("function weekSave(")
if _ws < 0:
    fail.append("week: weekSave() missing from js/util.js (v3.3.398)")
else:
    _u = (d/"js/util.js").read_text()
    _wsb = _u[_ws:_u.find("\nfunction ", _ws + 10)]
    if "DB.days" in _wsb:
        fail.append("week: weekSave() touches DB.days — a week must never log itself (v3.3.398)")
_util_plan = (d/"js/util.js").read_text()
_ps = _util_plan.find("function planSave(")
if _ps < 0:
    fail.append("plan: planSave() missing from js/util.js (v3.3.278)")
else:
    _psb = _util_plan[_ps:_util_plan.find("\nfunction ", _ps + 10)]
    if "DB.days" in _psb:
        fail.append("plan: planSave() touches DB.days — a plan must never log itself (v3.3.278)")
# comments must be stripped first: the prose explaining WHY there is no
# adherence number necessarily contains the words it bans (the v3.3.106
# lesson, in a new place). camelCase defeats \b, so match per line, not by word.
_ADHERE = _re.compile(r"adheren|completed|completion|remaining|missed", _re.I)
# v3.3.281 draws the line precisely, because a per-row tick is NOT a score
# and this build adds one. Reading the ledger and reporting "this exercise is
# logged" is a fact about the record. AGGREGATING those facts into a count,
# fraction or percentage of the plan is the failure state. So: planLoggedToday
# may be called, but never counted.
_AGG = _re.compile(r"planLoggedToday[^\n]*(\.filter|\.reduce|\.length|\bcount\b)"
                   r"|(\.filter|\.reduce)[^\n]*planLoggedToday")
for _f in ("js/util.js", "js/lift.js", "js/today.js", "js/app.js"):
    _src = (d/_f).read_text()
    _code = _re.sub(r"/\*[\s\S]*?\*/", "", _src)
    _code = _re.sub(r"(^|[^:])//[^\n]*", r"\1", _code)
    for _ln in _code.split("\n"):
        # v3.3.398: "week" joins "plan" -- a past day folds and dims, it is never missed
        if ("plan" in _ln.lower() or "week" in _ln.lower()) and _ADHERE.search(_ln):
            fail.append(f"plan: {_f} scores against the plan or the week ({_ln.strip()[:52]!r}) — no failure state (v3.3.278/398)")
            break
    _agg = _AGG.search(_code)
    if _agg:
        fail.append(f"plan: {_f} counts ticked plan rows ({_agg.group(0)[:44]!r}) — a tick is a fact, a tally is a verdict (v3.3.281)")

# -- v3.3.270: THE MOTION VOICE. One settle curve, three speeds, and three
# allowlisted physics (press spring, save spring, iOS band-back). Any other
# cubic-bezier literal in css/app.css is an ad-hoc curve and fails by name,
# which is what keeps "one voice" true after this release.
_css_motion = (d/"css/app.css").read_text()
for _tok in ("--settle:", "--dur-quick:", "--dur-move:", "--dur-arrive:"):
    if _tok not in _css_motion:
        fail.append(f"motion: token {_tok} missing from css/app.css (v3.3.270)")
_MOTION_ALLOW = {"cubic-bezier(.22,1,.36,1)",   # the settle voice itself
                 "cubic-bezier(.2,.9,.3,1.4)",  # tap press spring
                 "cubic-bezier(.3,1.4,.4,1)",   # save celebration spring
                 "cubic-bezier(.16,1.06,.3,1)"} # band-back overshoot, like iOS
for _cb in set(_re.findall(r"cubic-bezier\([^)]*\)", _css_motion)):
    if _cb not in _MOTION_ALLOW:
        fail.append(f"motion: ad-hoc curve {_cb} — speak with var(--settle) or allowlist it (v3.3.270)")
for _site in ("animation:vtin var(--dur-arrive) var(--settle)",
              "animation:cardin var(--dur-arrive) var(--settle)",
              "animation:msin var(--dur-arrive) var(--settle)"):
    if _site.replace("animation:vtin ","animation:vtin ") not in _css_motion and _site not in _css_motion:
        fail.append(f"motion: arrival site lost the voice: {_site} (v3.3.270)")

# -- v3.3.256: the weight table must cover every equipment class in both
# units. Increments are per-unit physical facts (lb dumbbells rack in 5s,
# kg in 2s); a class without a declared row would silently inherit the
# stack fallback, which is exactly the class of bug this table exists to
# end. Adding an equipment class without declaring its physics fails here.
_lbl = _re.search(r"const EQUIP_LABEL=\{(.*?)\};", _util, _re.S)
_tbl = _re.search(r"const W_TABLE=\{(.*?)\n\};", _util, _re.S)
if not _lbl or not _tbl:
    fail.append("weights: EQUIP_LABEL or W_TABLE missing from js/util.js (v3.3.256)")
else:
    _classes = set(_re.findall(r"(\w+)\s*:\s*'", _lbl.group(1)))
    _rows = dict(_re.findall(r"(\w+)\s*:\s*(\{[^\n]*\})", _tbl.group(1)))
    for _c in sorted(_classes):
        if _c not in _rows:
            fail.append(f"weights: equipment class '{_c}' has no W_TABLE row (v3.3.256)")
        elif not ("kg:" in _rows[_c] and "lb:" in _rows[_c]):
            fail.append(f"weights: W_TABLE.{_c} must declare BOTH kg and lb cells (v3.3.256)")
if "const STEP=" in _util or "STEP()" in _util:
    fail.append("weights: the unit-free STEP constant returned (retired v3.3.256)")
for _fn in ("monthlyPaceData", "consistencyRaceData"):
    if _util.count("function " + _fn) != 1:
        fail.append(f"util: {_fn} must have one definition (v3.3.213)")
_report = (d/"js/report.js").read_text()
if "id:'wd'" in _report or "id:'heat'" in _report:
    fail.append("report card: retired Weekdays or Last 6 months card returned (v3.3.213)")
if "label:'Monthly pace'" not in _report or "monthlyPaceData(12)" not in _report:
    fail.append("report card: Monthly pace must share the same fair cutoff data as Stats (v3.3.213)")
if "h+=moGoalCardHTML()" in _stats or "h+=runStatsHTML();" in _stats:
    fail.append("stats: retired This month card or legacy running story returned (v3.3.217)")
if "runStatsHTML217" not in (d/"js/lift.js").read_text():
    fail.append("stats: v3.3.217 running story is missing")
_lift = (d/"js/lift.js").read_text()
if "<h2>Monthly milestone" in _lift or "runmonthgoal" not in _lift:
    fail.append("running: monthly milestone must be embedded in the Running month card (v3.3.230)")
if 'id="secReport"' in _stats or "reportCardSection()" not in (d/"js/history.js").read_text():
    fail.append("report card: must live once in History, not Stats (v3.3.230)")
if "if(!ds.length&&!bwEdit) return '';" not in _stats:
    fail.append("weight: empty Stats card must stay hidden (v3.3.230)")

# -- v3.3.214: the year race keeps the old chart's press-and-drag reading.
_app = (d/"js/app.js").read_text()
if _stats.count('data-scrub="race"') != 1 or _stats.count('data-con-count=') != 2:
    fail.append("consistency: race chart must expose one scrub surface and two scoreboard values (v3.3.214)")
if 'data-values=' not in _stats or "mode==='race'" not in _app:
    fail.append("consistency: exact daily counts are not wired to the shared scrubber (v3.3.214)")
if "raceCard.classList.add('scrubbing')" not in _app or "raceCard.classList.remove('scrubbing')" not in _app:
    fail.append("consistency: scrub state must hide endpoints while held and restore them on release (v3.3.214)")

# -- v3.3.215 made Current rhythm and History two views of ONE calendar, and
# pinned this card to History's 1.45:1 cells and 4px gap. v3.3.307 ends that
# relationship deliberately: History keeps the month calendar, and this card
# became a year heatmap, because carrying a second, worse copy of History's
# grid was most of what made it look broken. The guards now defend the
# heatmap's own geometry — square cells, and a run that visibly JOINS.
if not _re.search(r"\.heatgrid \.hc\{[^}]*aspect-ratio:1", css.replace("\n", "")):
    fail.append("show up: heatmap cells must stay square (v3.3.307)")
# v3.3.307 required consecutive days to JOIN into a stroke — "that is the
# whole idea". v3.3.314 reverses it after side-by-side use: every day is its
# own square. The guard reverses with it, because a stale guard enforcing a
# retired idea is worse than no guard. What must hold now is that no cell is
# displaced to fake adjacency — the v3.3.310 bug, where negative margins
# shrank the row tracks and cells bled into their neighbours.
_heat_flat = css.replace("\n", "")
if _re.search(r"\.heatgrid \.hc[^{]*\{[^}]*margin-(top|bottom):\s*-", _heat_flat):
    fail.append("show up: a heatmap cell may not be pulled out of its track (v3.3.314)")
if _re.search(r"\.heatgrid \.hc\.j[ud]\{", _heat_flat):
    fail.append("show up: the joined-stroke variant was retired — every day is its own square (v3.3.314)")
if not _re.search(r"\.heatgrid\{[^}]*row-gap:\d+px", _heat_flat):
    fail.append("show up: the day gap belongs on the grid track (v3.3.314)")
# v3.3.356: same -- the heatmap's blocklist guard retires with the tab swipe.

# -- shell size
n = len(idx.encode())
if n >= 8192: fail.append(f"index.html shell is {n} bytes (limit 8192)")

# -- v3.3.345: the bumper is tested, not the prose.
# v3.3.342 fixed a real bug -- a blunt old->new replace across index.html,
# sw.js and js/core.js had been rewriting version numbers inside comments for
# 95 releases -- and then guarded it by BANNING the version from prose in
# those three files. That was over-strict, and it bit within two releases: a
# perfectly ordinary "v3.3.344: ..." comment on a new declaration in core.js
# failed the build. The convention in this codebase is that a comment cites
# the release that made the decision; a guard that forbids it in three files
# is a guard fighting the thing it protects.
# tools/bump.py is now precise, so such a comment is SAFE. What needs proving
# is not the prose but the TOOL. So: run the real bumper over a fixture that
# contains both a stamp and a comment citing the version, and require it to
# move the one and leave the other. An effect test of the thing that broke,
# rather than a rule about what may be written near it.
import subprocess as _sp, tempfile as _tf, shutil as _sh, os as _os, io as _io
_fix = _tf.mkdtemp()
try:
    _os.makedirs(_os.path.join(_fix, "js"), exist_ok=True)
    _prose = "/* v9.9.9: a note that must survive the bump */"
    _files = {"index.html": f'<script src="./js/core.js?v=9.9.9"></script>\n<!-- v9.9.9: prose -->\n',
              "sw.js": "const CACHE = 'showup-v9.9.9';\n// v9.9.9: prose\n",
              "js/core.js": "const APP_VERSION = 'v9.9.9';\n" + _prose + "\n"}
    for _r, _t in _files.items():
        _io.open(_os.path.join(_fix, _r), "w", encoding="utf-8", newline='').write(_t)
    _sp.run([sys.executable, str(d / "tools" / "bump.py"), _fix, "9.9.9", "9.9.10"],
            check=True, capture_output=True)
    _after = {_r: _io.open(_os.path.join(_fix, _r), encoding="utf-8", newline='').read()
              for _r in _files}
    if "?v=9.9.10" not in _after["index.html"]: fail.append("bump.py: did not move the ?v= stamp")
    if "showup-v9.9.10" not in _after["sw.js"]: fail.append("bump.py: did not move the sw cache name")
    if "'v9.9.10'" not in _after["js/core.js"]: fail.append("bump.py: did not move APP_VERSION")
    if _prose not in _after["js/core.js"]:
        fail.append("bump.py REWROTE A COMMENT — the v3.3.342 bug is back "
                    f"({_after['js/core.js'].strip().splitlines()[-1][:60]})")
    if "v9.9.9: prose" not in _after["index.html"] or "v9.9.9: prose" not in _after["sw.js"]:
        fail.append("bump.py rewrote prose in index.html or sw.js — the v3.3.342 bug is back")
finally:
    _sh.rmtree(_fix, ignore_errors=True)

# -- v3.3.356: no gesture may change the tab.
# The swipe carried FOURTEEN opt-outs, each added after it had already broken
# something (v3.3.39 through v3.3.307), and its failure mode was silent: a new
# horizontally scrolling control worked until someone swiped it. The rep ruler
# shipped in v3.3.286 and was unprotected until v3.3.288 -- two releases where
# scrubbing reps mid-set could throw you off the Train tab. The nav bar reaches
# all four destinations in one tap; a second path was never worth that tax.
# This is the guard that keeps it gone: no touch handler may assign `view`.
_util = (d/"js/util.js").read_text()
if _re.search(r"touch(start|move|end)[\s\S]{0,3000}?\bview\s*=", _util):
    fail.append("a touch gesture assigns view — the tab swipe was removed in v3.3.356")
# the first version of this also failed on any PROSE containing "tab-swipe
# blocklist" -- which caught the comment that records why the list was
# deleted. A guard that forbids describing the past is worse than no guard;
# this one looks for the mechanism instead.
if "TABS=['today'" in _util:
    fail.append("the tab-swipe tab list is back; it was deleted with the gesture (v3.3.356)")

# -- v3.3.378: THE SQUARE IS ONE SHAPE.
# Every day in this app is drawn as the same square at the same corner ratio:
# a heatmap cell, a coverage mark, today in the ceremony, the empty one on day
# one, the filled one on the finished card. They had drifted to SIX different
# ratios -- .227 .250 .261 .273 .292 .300 -- near-misses nobody can name and
# everybody feels. A percentage rather than a pixel value keeps the 10px mark
# and the 44px hero provably the same object at any size.
# This guard is the part that lasts: a new day-square added next year gets it
# right by default, or this fails.
_SQ_SELECTORS = [".d1sq", ".heatgrid .hc", ".heat i", "#dayDone .ddsq",
                 ".mcdots i", ".dayclosed .dcsq", ".writing .wsq"]   # v3.3.406: the writer's wait draws days too
_css_flat_sq = _re.sub(r"/\*[\s\S]*?\*/", "", css).replace("\r", "")
for _sel in _SQ_SELECTORS:
    _m = _re.search(_re.escape(_sel) + r"\s*\{([^}]*)\}", _css_flat_sq)
    if not _m:
        fail.append(f"the square: {_sel} is gone — if a day is drawn some other way now, this guard needs to say so (v3.3.378)")
        continue
    _r = _re.search(r"border-radius:\s*([^;}]+)", _m.group(1))
    if not _r:
        continue
    if "var(--sq)" not in _r.group(1):
        fail.append(f"the square: {_sel} sets its own corner radius ({_r.group(1).strip()}) "
                    f"instead of var(--sq) — six near-misses is how it drifted before (v3.3.378)")
if not _re.search(r"--sq:\s*\d+%", css):
    fail.append("the square: --sq must be a PERCENTAGE, so one ratio holds at every size (v3.3.378)")

# -- v3.3.396: a "did you mean" strip sits UNDER its name, never beside it.
# .planpv .pb is min-width:0 (so a long name can truncate), which also lets it
# shrink to nothing when the candidate buttons are wide -- the name then wraps
# one letter per line beneath the buttons. jsdom has no layout; assert at the
# source that the ask row wraps and the strip claims the full width. Anchored
# to the exact selectors so a sibling rule cannot satisfy it.
_ask = re.search(r'^\s*\.planpv\.ask\{([^}]*)\}', css, re.M)
_askpc = re.search(r'^\s*\.planpv\.ask \.pc\{([^}]*)\}', css, re.M)
if not _ask or not re.search(r'flex-wrap:\s*wrap', _ask.group(1)):
    fail.append(".planpv.ask must flex-wrap:wrap, or a long unresolved name is crushed under its candidates (v3.3.396)")
if not _askpc or not re.search(r'flex-basis:\s*100%', _askpc.group(1)):
    fail.append(".planpv.ask .pc must take flex-basis:100% so candidates sit on their own line (v3.3.396)")

# -- v3.3.398: the four Noun Project glyphs are credited, by name, on the line
#    Settings already keeps. Royalty-free is not credit-free.
_cred = (d/"js/settings.js").read_text()
for _who in ("Eliricon", "Barracuda", "LAFS", "maria icon", "Alvida Black"):
    if _who not in _cred:
        fail.append(f"credits: {_who} missing from the Settings asset line (v3.3.398)")

# -- v3.3.411: ONE ICON SYSTEM.
# Every icon shared one viewBox while the ink inside filled 52% to 100% of it,
# so a toolbar asking for three icons at one size got three different sizes.
# icon() now scales each path's measured ink to a shared live area. Two things
# must stay true for that to keep working, and neither is obvious from a diff:
#   1. every icon has measured ink bounds. A new path with no entry silently
#      falls back to the full box and renders at the wrong size.
#   2. call sites use the size tokens. A raw pixel number at a call site is
#      exactly how the 11/12/14/16/17/44 spread happened in the first place.
_util = (d / "js/util.js").read_text(encoding="utf-8")
_names = set(_re.findall(r"^\s*(\w+):\s*['\"]M", _util, _re.M))
_ink = _re.search(r"const ICON_INK=\{(.*?)\};", _util, _re.S)
if not _ink:
    fail.append("the icon system: ICON_INK is gone - icon() cannot size anything without it (v3.3.411)")
else:
    _measured = set(_re.findall(r"(\w+):\s*\[", _ink.group(1)))
    for _n in sorted(_names - _measured):
        fail.append(f"the icon system: '{_n}' has no measured ink in ICON_INK - "
                    f"it will render at the wrong size against every other icon (v3.3.411)")
for _f in ("js/lift.js", "js/writer.js", "js/today.js", "js/history.js", "js/stats.js"):
    _p = d / _f
    if not _p.exists():
        continue
    for _m in _re.finditer(r"icon\('(\w+)',\s*(\d+)", _p.read_text(encoding="utf-8")):
        fail.append(f"the icon system: {_f} calls icon('{_m.group(1)}', {_m.group(2)}) with a raw size - "
                    f"use ICON_SZ.sm/md/lg/hero, or the sizes drift apart again (v3.3.411)")

# -- v3.3.423: THE APP ICON IS THE MARK.
# The brand mark is a single evenodd path: a rounded tile with the chevron
# KNOCKED OUT. That is right for a logo on a page and wrong for an app icon --
# iOS composites alpha onto black, so a black mark shipped as-is becomes a
# black tile with a black chevron. The shipped icons are therefore the mark on
# a plate: ink field, white chevron, full bleed (every OS applies its own
# corner mask, and a mark keeping its own corners inside that mask shows white
# slivers). The favicon is the exception -- browsers do not mask, so it keeps
# the mark's own corners on white.
# Checked here because a PNG cannot be diffed in the JS suites, and because
# this is exactly the kind of asset that gets regenerated wrongly later.
_ICONS = {"icon-192.png": 192, "icon-512.png": 512,
          "icon-maskable-512.png": 512, "apple-touch-icon.png": 180}
def _png_size(p):
    b = p.read_bytes()
    if b[:8] != b"\x89PNG\r\n\x1a\n": return None
    return int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")
for _n, _sz in _ICONS.items():
    _p = d / _n
    if not _p.exists():
        fail.append(f"the icon: {_n} is missing (v3.3.423)")
        continue
    _wh = _png_size(_p)
    if _wh != (_sz, _sz):
        fail.append(f"the icon: {_n} is {_wh}, expected {_sz}x{_sz} (v3.3.423)")
if not (d / "favicon-32.png").exists():
    fail.append("the icon: favicon-32.png is missing — the browser tab falls back to a 192px app icon (v3.3.423)")
if 'href="favicon-32.png"' not in idx:
    fail.append("the icon: index.html does not point rel=icon at favicon-32.png (v3.3.423)")
if "./favicon-32.png" not in sw:
    fail.append("the icon: sw.js does not cache favicon-32.png, so it will not work offline (v3.3.423)")

# -- v3.3.430: ONE FOLD CONTROL.
# A fold was drawn two ways: the plan used the icon system's chevron, rotated;
# the last-time card used the text glyphs U+25B8 / U+25BE, swapped for one
# another. Same job, two shapes, two weights, and one of them cannot inherit
# the live-area or stroke rules the icon system enforces. A text triangle is
# also a FONT's idea of an arrow, which changes with the font.
# The chevron is the app's own; typing one is how the drift starts.
_TRI = "\u25b8\u25be\u25b6\u25bc\u25c2\u25b4"
for _f in ("js/lift.js", "js/today.js", "js/stats.js", "js/history.js",
           "js/settings.js", "js/writer.js", "js/app.js"):
    _p = d / _f
    if not _p.exists():
        continue
    for _t in _TRI:
        if _t in _p.read_text(encoding="utf-8"):
            fail.append(f"one fold control: {_f} draws a triangle glyph (U+{ord(_t):04X}) - "
                        f"use icon('chevron', ICON_SZ.sm, open?90:0), which carries the "
                        f"system's shape and weight (v3.3.430)")

# -- v3.3.433: THE PROMPT IS A TEMPLATE LITERAL.
# v3.3.432 added prompt text containing ten backticks -- used as code quotes
# around payload keys -- into a backtick-delimited literal. That closes the
# string. The app deployed fine; the Edge Function's workflow failed, so the
# new laws were live in the client and absent from the model's instructions.
# Exactly the failure this release exists to prevent, one layer down: a rule
# the model was never told. Checked here because the JS suites do not compile
# Deno sources.
_fn = d / "supabase/functions/write-session/index.ts"
if _fn.exists():
    _src = _fn.read_text(encoding="utf-8")
    import re as _re
    _ticks = [m.start() for m in _re.finditer(r"(?<!\\)`", _src)]
    if len(_ticks) % 2:
        fail.append("the writer prompt: unpaired backtick in write-session/index.ts - "
                    "a backtick inside the prompt closes the template literal (v3.3.433)")
    if "const SYSTEM" in _src:
        _i = _src.index("const SYSTEM")
        try:
            _o = _src.index("`", _i); _c = _src.index("`", _o + 1)
            for _law in ("THE SKELETON IS THE CALENDAR", "SESSION LENGTH IS NOT YOURS"):
                if _law in _src and _law not in _src[_o:_c]:
                    fail.append(f"the writer prompt: '{_law[:28]}...' sits OUTSIDE the SYSTEM "
                                f"literal - the model never receives it (v3.3.433)")
        except ValueError:
            fail.append("the writer prompt: SYSTEM literal is not delimited (v3.3.433)")

if fail:
    print("BUILDCHECK FAIL"); [print(" -", f) for f in fail]; sys.exit(1)
print(f"BUILDCHECK PASS  v{appv}  shell={n}B  assets={len(assets)}  cssvars={len(used)} used / {len(defined)} defined")
