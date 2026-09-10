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
const light=css.match(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="light"\] nav::before\{([^}]+)\}/)[1];
assert(light.includes('linear-gradient(180deg,rgba(255,255,255,.97) 0%,rgba(251,251,251,.94) 15%,rgba(241,241,241,.95) 48%,rgba(230,230,230,.94) 78%,rgba(192,192,192,.48) 100%)'),'Airy Silver has a clearer edge and protected icon band');
const lightInk=css.match(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="light"\] nav button\{color:(#[A-Fa-f0-9]+)\}/)[1];
assert.equal(lightInk,'#797979','inactive gray is lighter, scoped to Refined Minimal Light');
assert(light.includes('0 10px 30px rgba(0,0,0,.20),0 1px 2px rgba(0,0,0,.08)'),'soft shadow beneath light bar is slightly darker, without enlarging it');
assert(light.includes('inset 0 1px 0 #FFFFFF'),'silver rim retains its bright highlight');
assert(/\[data-flow="refined"\]\[data-skin="minimal"\]\[data-bar="light"\] nav button\.on\{\s*color:var\(--pill-chalk\);\s*background:linear-gradient\(180deg,#F7F7F7 0%,#DEDEDE 38%,#BDBDBD 100%\)/.test(css),'selected icon remains near-black on its opaque silver capsule');
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
assert(cr(rgb(token('light','pill-chalk')),[189,189,189])>=3,'selected silver capsule retains strong icon contrast');
// v3.3.524: both appearance attributes must be present on every new rule.
const midScope=':root[data-flow="refined"][data-skin="minimal"][data-theme="dark"][data-bar="light"]';
const midRule=suffix=>{const marker=midScope+' '+suffix+'{';assert.equal(css.split(marker).length,2,'exactly one narrowly scoped '+suffix);return css.split(marker)[1].split('}')[0].trim();};
const mid=midRule('nav::before');
assert(mid.includes('linear-gradient(180deg,rgba(245,245,245,.95) 0%,rgba(251,251,251,.90) 15%,rgba(241,241,241,.88) 48%,rgba(239,239,239,.84) 78%,rgba(234,234,234,.36) 100%)'),'exact approved midpoint gradient');
assert(mid.includes('0 10px 30px rgba(0,0,0,.20),0 1px 2px rgba(0,0,0,.08)'),'under-bar shadow preserved');
assert.equal(midRule('nav button'),'color:#6B6B6B','midpoint inactive ink');
assert(midRule('nav button.on').includes('color:var(--pill-chalk);'),'selected midpoint icon stays dark');
assert(midRule('nav button.on').includes('linear-gradient(180deg,#E0E0E0 0%,#C9C9C9 38%,#ABABAB 100%)'),'approved midpoint capsule');
const midStops=[...mid.split(';')[0].matchAll(/rgba\((\d+),(\d+),(\d+),([.\d]+)\) (\d+)%/g)].map(m=>({rgb:m.slice(1,4).map(Number),alpha:+m[4],at:+m[5]}));
for(let y=0;y<=78;y++){
 const i=Math.max(1,midStops.findIndex(s=>s.at>=y)),a=midStops[i-1],b=midStops[i],t=(y-a.at)/(b.at-a.at);
 const surface=mix(mix(b.rgb,a.rgb,t),[0,0,0],a.alpha+(b.alpha-a.alpha)*t);
 for(const ink of ['#6B6B6B',token('light','pill-accent'),token('light','pill-rest')])assert(cr(rgb(ink),surface)>=3,'midpoint glyph band retains contrast');
}
assert(cr(rgb(token('light','pill-chalk')),[171,171,171])>=3,'midpoint selected ink retains contrast');
console.log('PASS midpoint silver requires dark content AND light bar, with readable icon band');
console.log('PASS neutral bar tokens, bounded gradients, no blur and readable dark icons over light/dark/blue content');
dom.window.close();
