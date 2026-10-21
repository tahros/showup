/* test-text-size.js DIR -- v4.6.368: Settings > Appearance > Text size.
 * Five steps half a pixel apart (0, .5, 1, 1.5, 2 px added), Default (+1) in
 * the middle; Auto follows the iPhone text size where it can be read and is
 * Default where it cannot. The source rule that keeps the engine honest: a
 * font shorthand that uses var() and is followed by another font-* longhand
 * hides its size from the CSSOM, so such a rule states font-size itself. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.fetch=async()=>{throw new Error('offline');};w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx);
run(`DB.settings.onboarded=true;save=()=>{};`);
ok('five steps, Default (+1) in the middle', run(`JSON.stringify(TEXT_STEPS)`)==='[0,0.5,1,1.5,2]' && run(`TEXT_DEFAULT`)===1);
ok('a new user gets Default', run(`delete DB.settings.textSize;textAdd()`)===1);
ok('Auto without a readable phone size is Default', run(`DB.settings.textSize='auto';textAdd()`)===1);
ok('a picked step is used', run(`DB.settings.textSize=1.5;textAdd()`)===1.5);
ok('a stray value falls back to Default', run(`DB.settings.textSize=7;textAdd()`)===1);
run(`DB.settings.textSize=2;applyTextSize();`);
ok('applying sets --tsa on the root', w.document.documentElement.style.getPropertyValue('--tsa')==='2px');
const st=w.document.createElement('style');st.textContent='.x{font-size:12px}.y{font-size:1.2em}';w.document.head.append(st);run(`_tsSheets()`);
const rules=[...st.sheet.cssRules].map(r=>r.style.getPropertyValue('font-size'));
ok('a px font size becomes calc(px + --tsa)', /calc\(12px \+ var\(--tsa/.test(rules[0]), rules[0]);
ok('em sizes are left to follow their parent', rules[1]==='1.2em', rules[1]);
const el=w.document.createElement('div');el.innerHTML='<span style="font-size:9px">a</span>';run(`_tsInline`)(el);
ok('inline style font sizes are caught too', /calc\(9px/.test(el.firstChild.style.fontSize), el.firstChild.style.fontSize);
run(`view='sync';clubOpenGroups.add('appearance');render();`);
ok('Settings shows Text size with five steps', w.document.querySelectorAll('#view .ts-step').length===5);
w.document.querySelector('[data-text-size="0"]').click();
ok('tapping a step saves it', run(`DB.settings.textSize`)===0);
ok('the TAB BAR is never resized', run(`TEXT_SKIP.test('nav button')`) && run(`TEXT_SKIP.test('.dr-weather span')`));
/* the source rule */
const bad=[];
for(const f of [...fs.readdirSync(path.join(dir,'css')).map(x=>'css/'+x),...fs.readdirSync(path.join(dir,'js')).map(x=>'js/'+x)]){
  if(!/\.(css|js)$/.test(f)) continue; const t=fs.readFileSync(path.join(dir,f),'utf8');
  for(const m of t.matchAll(/\{([^{}]*)\}/g)){ const b=m[1], fm=/(?:^|;)\s*font:\s*([^;]*var\([^;]*)/.exec(b); if(!fm) continue;
    const rest=b.slice(fm.index+fm[0].length);
    if(/(?:^|;)\s*font-[a-z-]+\s*:/.test(rest)&&!/(?:^|;)\s*font-size\s*:/.test(rest)&&/^\s*(?:(?:italic|normal|bold|[1-9]00)\s+)*\d+(?:\.\d+)?px[\s/]/.test(fm[1])) bad.push(f+': '+b.slice(0,60)); } }
ok('source: a var() font shorthand followed by font-* states its font-size', bad.length===0, bad.slice(0,3).join(' | '));
console.log(fails?`\n${fails} FAILED`:'\nALL PASS'); process.exit(fails?1:0);
