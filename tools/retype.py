#!/usr/bin/env python3
"""retype.py DIR -- v4.6.364: one-time type and spacing pass (version B).

Sungjee approved text size B (88%) on 2026-10-20, then rejected the tight
spacing of v4.6.362 ("too crowded") and approved the breathable version B:

  font-size, the size in a `font` shorthand ........ x 0.88
  vertical margin and row gap between blocks ....... x 0.80 (60px and up kept: header/nav clearance)
  line-height ...................................... x 0.94 (unitless floor 1.2)
  padding inside elements, min-height ............... unchanged

Only plain px values change; var(), calc(), env() and percentages are left as
they are. Left whole: the top bar, calendar and heatmap grids, and text fields
of 16px or more (below 16px iOS zooms the page on focus). It runs over
css/*.css (not fonts.css), the stylesheets scripts inject (not stats-story.js,
whose rules lay out the share and story images) and style="..." attributes.
It has run once; running it again would shrink everything again, so it
refuses.
"""
import re, sys, pathlib

FONT, SPACE, LH, LH_FLOOR, TOUCH = 0.88, 0.80, 0.94, 1.2, 44
PX = re.compile(r'^-?\d+(?:\.\d+)?px$')

def num(x):
    # whole pixels: crisp edges, and every guard that reads "Npx" keeps reading it
    n = int(round(x)) if x >= 0 else -int(round(-x))
    return str(n)

def spx(tok, f):
    if PX.match(tok) and float(tok[:-2]) != 0:
        if f == SPACE and abs(float(tok[:-2])) >= 60:
            return tok   # 60px and up is room kept clear of the fixed header and nav, not rhythm
        return num(float(tok[:-2]) * f) + 'px'
    return tok

def num_lh(x):
    return f"{round(x, 3):.3f}".rstrip('0').rstrip('.')

def split_imp(v):
    m = re.match(r'^(.*?)(\s*!important)?\s*$', v, re.S)
    return m.group(1).strip(), (m.group(2) or '')

def box(v):
    """padding/margin shorthand: scale top and bottom only."""
    val, imp = split_imp(v)
    if any(c in val for c in '()'):
        return v
    t = val.split()
    if not 1 <= len(t) <= 4:
        return v
    top, right = t[0], t[1] if len(t) > 1 else t[0]
    bottom = t[2] if len(t) > 2 else t[0]
    left = t[3] if len(t) > 3 else right
    nt, nb = spx(top, SPACE), spx(bottom, SPACE)
    if (nt, nb) == (top, bottom):
        return v
    if right == left:
        out = f"{nt} {right}" if nt == nb else f"{nt} {right} {nb}"
    else:
        out = f"{nt} {right} {nb} {left}"
    return out + imp

def block(v):
    val, imp = split_imp(v)
    if any(c in val for c in '()'):
        return v
    t = val.split()
    if not 1 <= len(t) <= 2:
        return v
    n = [spx(x, SPACE) for x in t]
    return ' '.join(n) + imp if n != t else v

def lh(v):
    val, imp = split_imp(v)
    if re.match(r'^\d+(?:\.\d+)?$', val):
        n = float(val)
        return num_lh(max(LH_FLOOR, n * LH)) + imp if n > 1.2 else v
    if PX.match(val):
        return str(round(float(val[:-2]) * LH)) + 'px' + imp
    return v

def font(v):
    m = re.search(r'(\d+(?:\.\d+)?)px(\s*/\s*([^\s,]+))?', v)
    if not m:
        return v
    size = num(float(m.group(1)) * FONT) + 'px'
    rep = size
    if m.group(3):
        rep += '/' + lh(m.group(3))
    return v[:m.start()] + rep + v[m.end():]

def single(f):
    def go(v):
        val, imp = split_imp(v)
        return spx(val, f) + imp if PX.match(val) else v
    return go

def minh(v):
    val, imp = split_imp(v)
    if not PX.match(val):
        return v
    n = float(val[:-2])
    if n < TOUCH:   # already compact: a smaller floor would shrink a tap target
        return v
    return str(max(TOUCH, round(n * SPACE))) + 'px' + imp

def gap(v):
    val, imp = split_imp(v)
    if PX.match(val) and float(val[:-2]) != 0:
        return f"{spx(val, SPACE)} {val}" + imp
    return v

RULES = {
    'font-size': single(FONT), 'font': font, 'line-height': lh,
    'margin': box,
    'margin-top': single(SPACE), 'margin-bottom': single(SPACE),
    'margin-block': block,
    'row-gap': single(SPACE), 'gap': gap,
}
DECL = re.compile(r'(?P<pre>(?:^|[{;\s"\']))(?P<prop>' + '|'.join(sorted(map(re.escape, RULES), key=len, reverse=True)) + r')\s*:\s*(?P<val>[^;{}"\'`]+?)(?=\s*(?:;|}|"|\'|`|$))', re.M)

# Two kinds of rule keep values the preview would have changed:
#  - a text field whose type is 16px or more stays there: below 16px iOS zooms the page on focus;
#  - a calendar or heatmap grid is left whole: its cells, gaps and labels are measured against each other.
FIELD = re.compile(r'input|textarea|select\b|\.planta|contenteditable')
DAYGRID = re.compile(r'header|\.h-|hglass|brandrow|hbtns|wdrail|heat|\.cal\b|calendar|attend|ledger|month|\.yr|\.sq\b|h-week|daygrid|squares')

def rewrite(text, sel=''):
    n = 0
    field, daygrid = bool(FIELD.search(sel)), bool(DAYGRID.search(sel))
    def sub(m):
        nonlocal n
        prop, old = m.group('prop'), m.group('val')
        if daygrid:
            return m.group(0)
        if prop == 'gap' and not re.search(r'grid|column|wrap', text):
            return m.group(0)   # a single-line row has no rows to bring closer
        new = RULES[prop](old)
        if field and prop in ('font-size', 'font'):
            o = re.search(r'(\d+(?:\.\d+)?)px', old)
            if o and float(o.group(1)) >= 16:
                new = old
        if new != old:
            n += 1
        return f"{m.group('pre')}{prop}:{new}"
    return DECL.sub(sub, text), n

RULE = re.compile(r'([^{}]+)\{([^{}]*)\}')
def rewrite_css(text):
    n = 0
    def sub(m):
        nonlocal n
        body, k = rewrite(m.group(2), m.group(1))
        n += k
        return m.group(1) + '{' + body + '}'
    return RULE.sub(sub, text), n

def rewrite_styles(text):
    n = 0
    def sub(m):
        nonlocal n
        body, k = rewrite(m.group(2))
        n += k
        return m.group(1) + body + m.group(3)
    return re.sub(r'(style=")([^"]*)(")', sub, text), n

d = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else '.')
stamp = d / 'css/app.css'
if '/* v4.6.364 retype applied */' in stamp.read_text():
    sys.exit('retype: already applied (v4.6.364); refusing to shrink twice')
total = 0
for f in sorted((d / 'css').glob('*.css')):
    if f.name == 'fonts.css':
        continue
    t, n = rewrite_css(f.read_text())
    total += n
    if '--check' not in sys.argv:
        f.write_text(t)
    print(f"{f.relative_to(d)}: {n}")
def rewrite_embedded(text):
    """stylesheets the scripts inject: <style> blocks and style.textContent=`...`"""
    n = 0
    def sub(m):
        nonlocal n
        body, k = rewrite_css(m.group(2))
        n += k
        return m.group(1) + body + m.group(3)
    text = re.sub(r'(<style[^>]*>)([\s\S]*?)(</style>)', sub, text)
    text = re.sub(r'(\.textContent\s*=\s*`)([^`]*\{[^`]*)(`)', sub, text)
    text = re.sub(r"(\.textContent\s*=\s*')([^'\n]*\{[^'\n]*)(')", sub, text)
    return text, n

for f in sorted((d / 'js').glob('*.js')) + [d / 'index.html']:
    # stats-story.js styles the share and story cards: approved image layouts, not screen chrome
    t0, n0 = rewrite_embedded(f.read_text()) if f.name != 'stats-story.js' else (f.read_text(), 0)
    t, n = rewrite_styles(t0)
    n += n0
    if n:
        total += n
        if '--check' not in sys.argv:
            f.write_text(t)
        print(f"{f.relative_to(d)}: {n}")
if '--check' not in sys.argv:
    s = stamp.read_text()
    stamp.write_text(s + "\n/* v4.6.364 retype applied */\n:root{font-size:88%}\n")
print(f"retype: {total} values")
