/* test-fontweights.js — v4.5.21.
 * The stylesheet asked IBM Plex Mono for weight 400 in ~156 places while the
 * document only ever loaded 500, 600 and 700. Every one of those was silently
 * substituted, so the app's "regular mono" was never regular and nothing failed
 * to say so. This suite closes that gap in general: whatever weights the CSS
 * asks of a family, the document must load — and it fails in BOTH directions,
 * so a weight that stops being used gets noticed too.
 */
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
const js=['js/stats-story.js','js/mascot.css'].filter(f=>fs.existsSync(path.join(dir,f)))
  .map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
const mascot=fs.existsSync(path.join(dir,'css/mascot.css'))?fs.readFileSync(path.join(dir,'css/mascot.css'),'utf8'):'';
const sheet=css+'\n'+js+'\n'+mascot;
let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};

/* what the document loads */
const link=html.match(/fonts\.googleapis\.com\/css2\?([^"']+)/);
ok('(fixture) the document loads its families from one link', !!link, link?link[1].slice(0,72)+'…':'no link');
const loaded={};
for(const m of (link?link[1]:'').matchAll(/family=([^:&]+):wght@([\d;]+)/g))
  loaded[m[1].replace(/\+/g,' ')]=m[2].split(';').map(Number);
ok('(fixture) both Plex families are loaded with explicit weights',
   !!loaded['IBM Plex Sans']&&!!loaded['IBM Plex Mono'],
   Object.entries(loaded).map(([f,w])=>f+' '+w.join('/')).join(' · '));

/* what the stylesheet asks for.
   Two shapes: the `font:` shorthand carries its weight inline, and a bare
   `font-family:var(--mono)` inherits 400 from the document — the second is the
   one that hid this for two years, so it is counted, not skipped. */
const asked=new Set();
for(const m of sheet.matchAll(/font:(\d{3})\s[\d.]+px(?:\/[\d.]+px)?\s*var\(--mono\)/g)) asked.add(+m[1]);
let bare=0;
for(const m of sheet.matchAll(/font-family:var\(--mono\)/g)) bare++;
if(bare) asked.add(400);
/* an explicit font-weight beside a mono family counts too */
for(const m of sheet.matchAll(/var\(--mono\)[^}]*?font-weight:(\d{3})/g)) asked.add(+m[1]);
for(const m of sheet.matchAll(/font-weight:(\d{3})[^}]*?var\(--mono\)/g)) asked.add(+m[1]);

const want=[...asked].sort((a,b)=>a-b), have=(loaded['IBM Plex Mono']||[]).sort((a,b)=>a-b);
ok('(fixture) the stylesheet really does ask for mono weights', want.length>0, want.join('/'));
ok('...including 400, which bare font-family rules inherit', want.includes(400), bare+' bare mono rules');

const missing=want.filter(w=>!have.includes(w));
ok('EVERY mono weight the stylesheet asks for is actually loaded',
   missing.length===0, missing.length?'not loaded: '+missing.join('/'):'asks '+want.join('/')+' · loads '+have.join('/'));

/* and the same for the sans side, which was already correct -- asserted so it stays that way */
const askedSans=new Set();
for(const m of sheet.matchAll(/font:(\d{3})\s[\d.]+px(?:\/[\d.]+px)?\s*var\(--body\)/g)) askedSans.add(+m[1]);
const missSans=[...askedSans].filter(w=>!(loaded['IBM Plex Sans']||[]).includes(w));
ok('every sans weight the stylesheet asks for is loaded too',
   missSans.length===0, missSans.length?'not loaded: '+missSans.join('/'):'asks '+[...askedSans].sort().join('/'));

/* the other direction: a loaded weight nothing uses is dead payload */
const unusedMono=have.filter(w=>!want.includes(w));
ok('...and no mono weight is downloaded that nothing asks for',
   unusedMono.length===0, unusedMono.length?'unused: '+unusedMono.join('/'):'none');

console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);
