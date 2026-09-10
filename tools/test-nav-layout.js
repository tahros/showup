// Pin the tab bar's one-row contract separately from its glass/appearance.
// Browser geometry checks complement these source/DOM guards on release.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { JSDOM } = require('jsdom');
const dir = process.argv[2] || '.';
let css = fs.readFileSync(path.join(dir, 'css/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
if(process.env.NAV_MUTATE==='silver')css=css.replace('rgba(215,215,215,.92)','rgba(245,245,245,.95)');
if(process.env.NAV_MUTATE==='scope')css=css.replaceAll('[data-theme="dark"][data-bar="light"] nav','[data-bar="light"] nav');
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
const light=css.match(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="light"\] nav::before\{([^}]+)\}/)[1];
assert(light.includes('linear-gradient(180deg,rgba(255,255,255,.97) 0%,rgba(251,251,251,.94) 15%,rgba(241,241,241,.95) 48%,rgba(230,230,230,.94) 78%,rgba(192,192,192,.48) 100%)'),'Airy Silver has a clearer edge and protected icon band');
const lightInk=css.match(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="light"\] nav button\{color:(#[A-Fa-f0-9]+)\}/)[1];
assert.equal(lightInk,'#797979','inactive gray is lighter, scoped to Refined Minimal Light');
assert(light.includes('0 10px 30px rgba(0,0,0,.20),0 1px 2px rgba(0,0,0,.08)'),'soft shadow beneath light bar is slightly darker, without enlarging it');
assert(light.includes('inset 0 1px 0 #FFFFFF'),'silver rim retains its bright highlight');
const rimFill='radial-gradient(ellipse at 50% -35%,#FFFFFF 0%,#FFFFFF55 43%,transparent 72%),linear-gradient(180deg,#F7F7F7 0%,#DFDFDF 42%,#B9B9B9 100%)';
const rimShadow='inset 0 1.5px 0 #FFFFFF,inset 1px 0 .8px #FFFFFFF0,inset -1px 0 .8px #FFFFFFBF,inset 0 -1px 0 #FFFFFF99,0 0 0 .7px #FFFFFFC9,0 -2px 9px 1px #FFFFFFC2,0 3px 6px #00000029';
const lightSelected=css.match(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="light"\] nav button\.on\{([^}]+)\}/)[1];
assert(lightSelected.includes('color:var(--pill-chalk);')&&lightSelected.includes(rimFill)&&lightSelected.includes(rimShadow),'approved B exact fill and rim, with unchanged dark selected icon');
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
// The clear lower edge contains no glyphs. Browser QA pins every icon above
// 78% of the bar; sample that occupied band against worst-case black content.
const lightStops=[...light.split(';')[0].matchAll(/rgba\((\d+),(\d+),(\d+),([.\d]+)\) (\d+)%/g)].map(m=>({rgb:m.slice(1,4).map(Number),alpha:+m[4],at:+m[5]}));
for(let y=0;y<=78;y++){
 const i=Math.max(1,lightStops.findIndex(s=>s.at>=y)),a=lightStops[i-1],b=lightStops[i],t=(y-a.at)/(b.at-a.at);
 const surface=mix(mix(b.rgb,a.rgb,t),[0,0,0],a.alpha+(b.alpha-a.alpha)*t);
 for(const ink of [lightInk,token('light','pill-accent'),token('light','pill-rest')])assert(cr(rgb(ink),surface)>=3,'Airy Silver glyphs retain contrast in the occupied band');
}
assert(cr(rgb(lightInk),rgb(token('light','pill-chalk')))>=4,'selected and inactive inks remain clearly distinct');
assert(cr(rgb(token('light','pill-chalk')),[185,185,185])>=3,'selected luminous capsule retains strong icon contrast at its darkest stop');
// v3.3.524: both appearance attributes must be present on every new rule.
const midScope=':root[data-flow="refined"][data-skin="minimal"][data-theme="dark"][data-bar="light"]';
const midRule=suffix=>{const marker=midScope+' '+suffix+'{';assert.equal(css.split(marker).length,2,'exactly one narrowly scoped '+suffix);return css.split(marker)[1].split('}')[0].trim();};
const mid=midRule('nav::before');
assert(mid.includes('linear-gradient(180deg,rgba(215,215,215,.92) 0%,rgba(181,181,181,.85) 43%,rgba(151,151,151,.88) 100%)'),'exact approved Silver gradient');
assert(mid.includes('0 12px 25px rgba(0,0,0,.40)'),'approved Silver shadow');
assert.equal(midRule('nav button'),'color:#424242','accessible inactive ink on darker silver');
assert(midRule('nav button.on').includes('color:#181818;'),'selected Porcelain icon stays dark');
assert(midRule('nav button.on').includes('linear-gradient(175deg,rgba(255,255,255,.99),rgba(237,237,237,.98) 55%,rgba(205,205,205,.97))'),'exact approved Porcelain fill');
assert(midRule('nav button:not(.on)').includes('--pill-accent:#2032A5;--pill-rest:#18491F'),'only unselected status glyphs use darker silver ink grades');
for(const theme of ['light','dark'])for(const bar of ['light','dark']){
 const el=dom.window.document.documentElement;el.dataset.flow='refined';el.dataset.skin='minimal';el.dataset.theme=theme;el.dataset.bar=bar;
 assert.equal(dom.window.document.querySelectorAll(midScope+' nav').length,theme==='dark'&&bar==='light'?1:0,'Silver + Porcelain applies exclusively to the approved combination');
}
const midStops=[...mid.split(';')[0].matchAll(/rgba\((\d+),(\d+),(\d+),([.\d]+)\) (\d+)%/g)].map(m=>({rgb:m.slice(1,4).map(Number),alpha:+m[4],at:+m[5]}));
for(let y=0;y<=78;y++){
 const i=Math.max(1,midStops.findIndex(s=>s.at>=y)),a=midStops[i-1],b=midStops[i],t=(y-a.at)/(b.at-a.at);
 const surface=mix(mix(b.rgb,a.rgb,t),[0,0,0],a.alpha+(b.alpha-a.alpha)*t);
 for(const ink of ['#424242','#2032A5','#18491F'])assert(cr(rgb(ink),surface)>=3,'Silver glyph band retains contrast: '+ink+' at '+y+'% = '+cr(rgb(ink),surface));
}
assert(cr(rgb(token('light','pill-chalk')),[185,185,185])>=3,'midpoint selected ink retains contrast');
console.log('PASS midpoint silver requires dark content AND light bar, with readable icon band');
console.log('PASS neutral bar tokens, bounded gradients, no blur and readable dark icons over light/dark/blue content');
dom.window.close();
