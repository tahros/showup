/* test-vt-capture.js DIR -- v4.6.358: NOTHING TOUCHES THE PAGE BETWEEN A TAB TAP AND ITS PHOTO.
 * A tab switch calls document.startViewTransition(update). The browser photographs the page
 * being left at its next frame and only then runs update(). Anything that changes the page in
 * that gap -- a setTimeout(0), a microtask, a timer -- is photographed as part of the OLD page.
 * WebKit (iPhone) leaves a long gap; Chrome a short one, which is how a click listener that
 * re-classed #view a tick after every tap shrank your name on iPhone only (24px -> 17px) and
 * turned the Stats headings into small capitals as they left.
 * This test makes the gap long, like WebKit, taps every tab from every tab, and fails if the
 * page is restyled before update() runs: a class or attribute on html, body, #view or anything
 * inside it, or visible structure inside the page. The page's own running motion is allowed.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
(async()=>{
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.matchMedia=q=>({matches:/no-preference/.test(q),addEventListener(){},removeEventListener(){}});   /* motion on: tab switches go through the transition */
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  const days={};for(let i=1;i<=40;i++){const d=new Date(Date.UTC(2026,9,18-i)).toISOString().slice(0,10);days[d]={w:[{part:'Chest',ex:'Bench Press',w:60,reps:[8,8],at:Date.parse(d+'T18:00')}],upd:1};}
  w.localStorage.setItem('tracker-v1',JSON.stringify({days,settings:{onboarded:true,unit:'lb',name:'Sungjee Yoo'}}));
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  await sleep(300);
  const run=c=>vm.runInContext(c,ctx);
  run(`todayISO='2026-10-18';checkDate=()=>false;`);
  /* the WebKit-shaped gap: the update runs 120ms after the call; every mutation in between is recorded */
  run(`window.__gap=[];window.__inGap=false;
    document.startViewTransition=function(update){window.__mo.takeRecords();window.__inGap=true;const done=new Promise(r=>setTimeout(()=>{window.__inGap=false;Promise.resolve(update()).then(r,r);},120));return {finished:done,ready:done,updateCallbackDone:done,skipTransition(){}};};
    window.__mo=new MutationObserver(ms=>{if(!window.__inGap)return;for(const m of ms){const t=m.target;if(t.closest&&t.closest('nav'))continue;if(m.type==='attributes'&&m.oldValue===t.getAttribute(m.attributeName))continue;
      /* a page's own running motion (the coin's spin, a replay's frames: inline style and data-* ticks)
         and writes into hidden elements are not restyling; classes, other attributes and visible
         structure inside the page are */
      const root=t===document.documentElement||t===document.body||t.id==='view';
      if(t.closest&&t.closest('[hidden]'))continue;
      if(m.type==='attributes'&&!root&&(m.attributeName==='style'||m.attributeName.startsWith('data-')))continue;
      if(m.type==='childList'&&!(t.closest&&t.closest('#view,header')))continue;window.__gap.push((t.id?'#'+t.id:t.tagName+'.'+String(t.className).slice(0,40))+(m.type==='childList'?' +['+[...m.addedNodes].map(n=>n.nodeName+'.'+String(n.className||'').slice(0,30)+':'+String(n.textContent||'').slice(0,20)).join(',')+'] -['+[...m.removedNodes].map(n=>n.nodeName+'.'+String(n.className||'').slice(0,30)+':'+String(n.textContent||'').slice(0,20)).join(',')+']':'')+' '+m.type+(m.attributeName?':'+m.attributeName:'')+(m.type==='attributes'?' '+String(t.getAttribute(m.attributeName)).slice(0,60):''));}});window.__mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeOldValue:true,characterData:true});`);
  const tabs=[['today','nav button[data-v="today"]'],['lift','nav button[data-v="lift"]'],['progress','nav button[data-progress]'],['settings','nav button[data-v="sync"]']];
  for(const pv of ['stats','history']){
    run(`progressView=${JSON.stringify(pv)}`);
    for(const [from,fs] of tabs)for(const [to,ts] of tabs){if(from===to)continue;
      run(`document.querySelector(${JSON.stringify(fs)}).click()`);await sleep(250);
      /* the page's own motion, with nobody touching it: a second of watching the page being left */
      run(`window.__gap=[];window.__inGap=true`);await sleep(1000);run(`window.__inGap=false`);
      const sig=x=>x.replace(/ \+\[.*$/,'').replace(/ [^ ]*$/,'');
      const idle=new Set(JSON.parse(run(`JSON.stringify(window.__gap)`)).map(sig));
      run(`window.__gap=[]`);
      run(`document.querySelector(${JSON.stringify(ts)}).click()`);await sleep(250);
      const gap=JSON.parse(run(`JSON.stringify(window.__gap)`)).filter(x=>!idle.has(sig(x)));
      ok(`${from} → ${to} (Progress opens on ${pv}): the page being left is not touched before it is photographed`,gap.length===0,gap.slice(0,4));
    }
  }
  const src=order.map(s=>fs.readFileSync(path.join(dir,s),'utf8')).join('\n');
  ok('source: no click listener re-classes #view on a timer',!/addEventListener\('click',\(\)=>setTimeout\(\(\)=>document\.getElementById\('view'\)/.test(src));
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
