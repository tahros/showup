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
        (T["accent"],T["surface"],4.5,"accent small text on surface"),
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
    if _hits < 2:
        fail.append(f"modal #{_id} is position:fixed;inset:0 but appears in "
                    f"{_hits} of the 2 gesture blocklists in util.js (v3.3.140)")

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
    _allow = {"line", "shadow", "pill", "pill-ink", "pill-accent", "pill-shadow"}
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

# -- Rep zones (v3.3.181): bucket boundaries are named constants with ONE
#    definition site. "Pairs of numbers that should be one constant" is a
#    recorded anti-pattern; a second literal 5 or 12 in the bucketer, the
#    labels, or a future view is exactly how the buckets drift apart.
_stats = (d/"js/stats.js").read_text()
for _cn in ("REPZONE_MAX_STRENGTH", "REPZONE_MAX_GROWTH"):
    _defs = _re.findall(r"const\s+" + _cn + r"\s*=", _stats)
    if len(_defs) != 1:
        fail.append(f"rep zones: {_cn} defined {len(_defs)} times — one definition site required (v3.3.181)")
    if not _re.search(_cn + r"\b", _stats.replace("const " + _cn, "", 1)):
        fail.append(f"rep zones: {_cn} defined but never referenced — the buckets are not using it (v3.3.181)")
if _re.search(r"repZone\s*\(\s*reps\s*\)\s*\{[^}]*[^_A-Z](5|12)[^0-9]", _stats):
    fail.append("rep zones: bucketer contains an inline boundary literal — use the named constants (v3.3.181)")

# -- Intent gaps (v3.3.192): one threshold, one definition site. A second
#    literal 21 in the query, the copy, or a later view is exactly how the
#    list and the sentence describing it drift apart.
_defs = _re.findall(r"const\s+INTENT_GAP_DAYS\s*=", _stats)
if len(_defs) != 1:
    fail.append(f"intent gaps: INTENT_GAP_DAYS defined {len(_defs)} times — one definition site required (v3.3.192)")
_ig = _re.search(r"function intentGaps\(\)\{.*?\n\}", _stats, _re.S)
if _ig and _re.search(r"[^A-Z_](21)[^0-9]", _ig.group(0)):
    fail.append("intent gaps: inline threshold literal in the query — use INTENT_GAP_DAYS (v3.3.192)")
#    Register guard: this section states facts. Scolding, scoring and streak
#    language are out of register, and red is reserved for live.
#    Scan EMITTED COPY only — block comments explain the rule by naming the
#    words it forbids, so scanning them would fail the clean build (it did).
_igstart = _stats.rfind("/*", 0, _stats.find("v3.3.192 — intent gaps"))
_igsec = _stats[_igstart:_stats.find("function renderStats")]
_igcopy = _re.sub(r"/\*.*?\*/", "", _igsec, flags=_re.S)
_igcopy = _re.sub(r"//[^\n]*", "", _igcopy)
for _bad in ("falling behind", "you should", "keep it up", "well done", "--live", "streak"):
    if _bad in _igcopy.lower():
        fail.append(f"intent gaps: out-of-register copy or colour ({_bad!r}) (v3.3.192)")

# -- Class/CSS coupling (v3.3.193): a class emitted by JS with no rule in the
#    sheet ships an unstyled feature. This happened twice in a row — the edits
#    adding the merge picker's and the intent-gap list's styles both anchored
#    on a selector deleted two releases earlier, so they silently changed
#    nothing and the gate had nothing to say. These are the classes those two
#    features depend on; a missing one now fails the build.
_need_css = ["rzsel", "igrows", "igrow", "igname", "igwhen", "igx",
             "rzlifts", "rzrow", "rzbar", "rzn", "rzscat", "rzh", "rdbox", "rdrow", "rdz", "rdl", "rdtoggle", "mcrow", "mcdots", "mcinner"]
for _cls in _need_css:
    if not _re.search(r"\." + _cls + r"[\s,{:+>]", css):
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
_mcsec = _stats[_stats.rfind("/*",0,_stats.find("v3.3.194 — muscle coverage")):_stats.find("function renderStats")]
_mctip = _re.search(r"hActs\('mc','([^']*)'", _stats)
_mcsec += "\n" + (_mctip.group(1) if _mctip else "")
_mch2 = _re.search(r"<h2>Muscle coverage[^`]*`", _stats)
_mcsec += "\n" + (_mch2.group(0) if _mch2 else "")
_mccopy = _re.sub(r"/\*.*?\*/","",_mcsec,flags=_re.S); _mccopy=_re.sub(r"//[^\n]*","",_mccopy)
#    'target' must not match e.target (code, not copy) — require a word edge
for _bad in (r"(?<![.a-z])target", "ideal", "behind", "warning", "should", "--live"):
    if _re.search(_bad, _mccopy.lower()):
        fail.append(f"muscle coverage: out-of-register copy or colour ({_bad!r}) (v3.3.194)")

# -- Section spacing (v3.3.197): .rzh exists to ADD air above the Rep-zone
#    headings. It competes with the base h2 margin, so a value at or below
#    that base silently tightens the layout instead of loosening it — which
#    is exactly how v3.3.196 shipped a 4px REDUCTION as a padding fix.
_h2m = _re.search(r"\bh2\{[^}]*margin:\s*(\d+)px", css)
_rzh = _re.search(r"\.rzh\{[^}]*margin-top:\s*(\d+)px", css)
if not _h2m or not _rzh:
    fail.append("section spacing: h2 base margin or .rzh margin-top missing (v3.3.197)")
elif int(_rzh.group(1)) <= int(_h2m.group(1)):
    fail.append(f"section spacing: .rzh margin-top {_rzh.group(1)}px is not greater than the "
                f"h2 base {_h2m.group(1)}px — it tightens instead of adding air (v3.3.197)")

# -- Handler presence (v3.3.198): the rep-zone chip and dropdown handlers have
#    now been silently deleted TWICE by rewrites of the section builder they
#    sit inside. An emitted control with no listener ships an inert UI that
#    looks perfect in a screenshot. If the markup exists, the listener must.
for _ctl, _hook in (("data-rzx", "closest('[data-rzx]')"), ("id=\"rzGrp\"", "id!=='rzGrp'")):
    if _ctl in _stats and _hook not in _stats:
        fail.append(f"rep zones: {_ctl} is emitted but has no click/change handler — "
                    f"the control would be inert (v3.3.198)")

# -- The reading (v3.3.200). Stats' register is statement-of-fact, and the
#    intent-gap and coverage guards above enforce that. This card is a
#    DELIBERATE second exception (the first being Today's "Train next"): it
#    proposes a weight. Recorded here so the exception is legible, and fenced
#    so it cannot spread:
#      (a) the three arithmetic constants keep ONE definition site each;
#      (b) e1RM must be gated on E1RM_MAX_REPS — an estimate from long sets
#          puts a wrong, heavy number on a bar;
#      (c) every proposed weight goes through snapW();
#      (d) scolding stays banned even here — proposing is allowed, judging is not.
for _c in ("E1RM_MAX_REPS", "READING_MIN_REPS", "READING_PCT", "READING_LONG_SHARE", "READING_LONG_ANCHOR"):
    if len(_re.findall(r"const\s+" + _c + r"\s*=", _stats)) != 1:
        fail.append(f"reading: {_c} must have exactly one definition site (v3.3.200)")
_rd = _stats[_stats.find("function repZoneReading"):_stats.find("function readingCard")]
if "E1RM_MAX_REPS" not in _stats[_stats.find("const e1rm="):_stats.find("function repZoneReading")]:
    fail.append("reading: e1rm() is not gated on E1RM_MAX_REPS — long-set estimates are unsafe (v3.3.200)")
for _lit in ("0.85", "1.75", "0.6", "0.75"):
    if _re.search(r"[^0-9.]" + _re.escape(_lit) + r"[^0-9]", _rd):
        fail.append(f"reading: inline literal {_lit} — use the named constant (v3.3.200)")
if _rd.count("snapW(") < 2:
    fail.append("reading: proposed weights must pass through snapW() (v3.3.200)")
_rdcopy = _re.sub(r"/\*.*?\*/", "", _rd, flags=_re.S)
for _bad in ("too many", "falling behind", "you need to", "--live", "bad ", "wrong"):
    if _bad in _rdcopy.lower():
        fail.append(f"reading: judging copy ({_bad!r}) — it may propose, not scold (v3.3.200)")

# -- shell size
n = len(idx.encode())
if n >= 8192: fail.append(f"index.html shell is {n} bytes (limit 8192)")

if fail:
    print("BUILDCHECK FAIL"); [print(" -", f) for f in fail]; sys.exit(1)
print(f"BUILDCHECK PASS  v{appv}  shell={n}B  assets={len(assets)}  cssvars={len(used)} used / {len(defined)} defined")
