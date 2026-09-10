// Pin the tab bar's one-row contract separately from its glass/appearance.
// Browser geometry checks complement these source/DOM guards on release.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { JSDOM } = require('jsdom');
const dir = process.argv[2] || '.';
const css = fs.readFileSync(path.join(dir, 'css/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const navRule = [...css.matchAll(/(?:^|})\s*nav\{([^}]+)}/g)].map(m => m[1]).find(r => /position:fixed/.test(r));
const buttonRule = [...css.matchAll(/(?:^|})\s*nav button\{([^}]+)}/g)].map(m => m[1]).find(r => /flex:1 1 0/.test(r));
assert(navRule, 'fixed navigation rule exists');
assert(/display:flex\s*;/.test(navRule), 'navigation uses a single flex row');
assert(/flex-flow:row nowrap\s*;/.test(navRule), 'navigation cannot wrap or become a column');
assert(buttonRule && /min-width:0\s*;/.test(buttonRule), 'tabs share available width without content-driven overflow');
console.log('PASS fixed bar has one non-wrapping row with equal flexible tabs');
const dom = new JSDOM(html);
const nav = dom.window.document.querySelector('#nav');
assert.deepStrictEqual([...nav.children].map(b => b.dataset.v), ['today', 'lift', 'stats', 'history']);
assert([...nav.children].every(b => b.tagName === 'BUTTON' && b.getAttribute('aria-label') && b.querySelector('svg')));
assert(!/grid-template-columns/.test(navRule), 'tab layout has no grid-track dependency');
console.log('PASS all four named navigation buttons remain direct children in their original order');
// v3.3.519: neutral chrome and bounded translucency, never fixed-layer blur.
const block=mode=>css.match(new RegExp(':root\\[data-skin="minimal"\\]\\[data-bar="'+mode+'"\\]\\{([^}]+)'))[1];
const token=(mode,k)=>block(mode).match(new RegExp('--'+k+':(#[0-9A-Fa-f]{6})'))[1];
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
for(const mode of ['dark','light'])for(const k of ['pill','pill-ink','pill-chalk'])assert.equal(new Set(rgb(token(mode,k))).size,1,mode+' '+k+' is neutral');
assert(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="light"\] nav::before\{\s*background:linear-gradient\(180deg,var\(--pill\),color-mix\(in srgb,var\(--pill\) 90%,var\(--pill-ink\)\)\)\}/.test(css),'light gradient deepens gently');
const dark=css.match(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="dark"\] nav::before\{([^}]+)\}/)[1];
const stops=[...dark.split(';')[0].matchAll(/rgba\((\d+),(\d+),(\d+),([.\d]+)\) (\d+)%/g)].map(m=>({rgb:m.slice(1,4).map(Number),alpha:+m[4],at:+m[5]}));
assert.deepStrictEqual(stops,[{rgb:[78,78,78],alpha:.98,at:0},{rgb:[46,46,46],alpha:.98,at:15},{rgb:[29,29,29],alpha:.94,at:48},{rgb:[21,21,21],alpha:.82,at:100}],'approved polished highlight with a more transparent lower half');
assert(dark.includes('inset 0 1px 0 rgba(255,255,255,.52)'),'polished top rim remains visible');
assert(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="dark"\] nav button\.on\{\s*background:linear-gradient\(180deg,#4C4C4C,#303030\)/.test(css),'selected capsule stays opaque, dark-bar only');
assert(!/backdrop-filter\s*:\s*blur\([^;{}]*[;}]/.test(css),'no backdrop blur reintroduced');
const mix=(a,b,t)=>a.map((v,i)=>v*t+b[i]*(1-t));
const lum=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const cr=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
for(const behind of [[255,255,255],[10,10,10],[47,75,216]])for(let y=0;y<=100;y++){
 const i=Math.max(1,stops.findIndex(s=>s.at>=y)),a=stops[i-1],b=stops[i],t=(y-a.at)/(b.at-a.at);
 const surface=mix(mix(b.rgb,a.rgb,t),behind,a.alpha+(b.alpha-a.alpha)*t);
 for(const k of ['pill-ink','pill-chalk','pill-accent','pill-rest'])assert(cr(rgb(token('dark',k)),surface)>=3,k+' retains graphic contrast through the polished gradient');
}
assert(cr(rgb(token('dark','pill-chalk')),mix([255,255,255],[76,76,76],.22))>=3,'selected icon stays readable during shimmer');
console.log('PASS neutral bar tokens, bounded gradients, no blur and readable dark icons over light/dark/blue content');
dom.window.close();
