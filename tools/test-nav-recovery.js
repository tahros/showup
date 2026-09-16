const fs=require('fs'),path=require('path'),assert=require('assert');
const {JSDOM}=require('jsdom');
const dir=process.argv[2]||'.';
const source=fs.readFileSync(path.join(dir,'js/util.js'),'utf8');
const fn=source.slice(source.indexOf('function repairNavLayout(){'),source.indexOf('let _navCheckFrame='));
assert(fn && fn.includes('return true;'));
const dom=new JSDOM(fs.readFileSync(path.join(dir,'index.html'),'utf8'),{runScripts:'outside-only'});
const w=dom.window,n=w.document.querySelector('#nav'),bs=[...n.children];
/* v4.6.45: jsdom has no dialog. The completion action moved into one in v4.6.44,
   so reaching it needs the same stub test-daydone has carried since that change. */
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;};

w.document.documentElement.dataset.skin='minimal';
Object.defineProperty(w.document.documentElement,'clientWidth',{value:390,configurable:true});
n.style.cssText='position:fixed;display:flex;flex-direction:row';
let rect={left:24,right:366,top:776,width:342,height:58};
let tops=[781,781,781,781];
n.getBoundingClientRect=()=>rect;
bs.forEach((b,i)=>b.getBoundingClientRect=()=>({width:77,height:48,top:tops[i]}));
w.eval(fn);
const before=n.getAttribute('style');
assert.strictEqual(w.repairNavLayout(),false);
assert.strictEqual(n.getAttribute('style'),before);
assert(!n.dataset.layoutRecovered);
console.log('PASS healthy bar receives no inline overrides');
// Emulate the screenshot: a tall overflow panel with four stacked buttons.
n.style.setProperty('display','block','important');
rect={left:24,right:444,top:510,width:420,height:232};tops=[515,573,631,689];
assert.strictEqual(w.repairNavLayout(),true);
for(const [k,v] of Object.entries({display:'flex',position:'fixed','flex-direction':'row','flex-wrap':'nowrap',width:'342px',height:'58px'})){
  assert.strictEqual(n.style.getPropertyValue(k),v);
  assert.strictEqual(n.style.getPropertyPriority(k),'important');
}
assert(bs.every(b=>b.style.flex==='1 1 0px'&&b.style.getPropertyPriority('flex')==='important'));
assert.strictEqual(JSON.parse(n.dataset.layoutFailure).display,'block');
assert.deepStrictEqual([...n.children],bs);
console.log('PASS detected stacking and overflow receive higher-priority row constraints without replacing buttons');
Object.defineProperty(w.document.documentElement,'clientWidth',{value:320,configurable:true});
w.repairNavLayout();assert.strictEqual(n.style.width,'272px');
w.document.documentElement.dataset.skin='classic';w.repairNavLayout();assert.strictEqual(n.style.width,'320px');
console.log('PASS recovered width follows resize and skin changes');
rect={left:0,right:0,top:0,width:0,height:0};
assert.strictEqual(w.repairNavLayout(),false);
assert(source.includes("addEventListener('resize',scheduleNavLayoutCheck"));
assert(source.includes("if(document.visibilityState==='visible') scheduleNavLayoutCheck();"));
/* v4.6.45: the claim is that syncNav SCHEDULES THE LAYOUT CHECK -- not that it is
   the first statement in the body. v4.6.44 added syncLiveWorkout() above it and the
   regex failed on the ordering, which was never the promise. Matched inside the
   function body instead, so another line can join it without a false alarm. */
{
  const src=fs.readFileSync(path.join(dir,'js/app.js'),'utf8');
  const body=(src.match(/function syncNav\(\)\{[\s\S]*?\n\}/)||[''])[0];
  assert(/scheduleNavLayoutCheck\(\)/.test(body),'syncNav schedules the nav layout check');
}
// v3.3.495: the scroll-idle trigger is gone with navReanchor(). repairNavLayout
// keeps render, resize and resume; it no longer re-pins inline !important
// geometry every time a scroll settles.
assert(!/function navReanchor\(\)/.test(source));
assert(!/classList\.(add|remove)\('reanchor'\)/.test(source));
console.log('PASS hidden geometry is ignored and checks are wired to render, resize and resume — never to scroll');
dom.window.close();
