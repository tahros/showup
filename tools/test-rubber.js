/* test-rubber.js DIR — v4.6.121: the bottom rubber-band follows UIScrollView's curve.
 * Real: every script in index.html order. jsdom has no layout, so the page
 * reads as "at the bottom" and a drag up is measured through #view's transform. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
(async()=>{
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.localStorage.setItem('showup:planning-interface','previous');
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=()=>Promise.reject(new Error('offline'));
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  Object.defineProperty(w,'innerHeight',{value:874,configurable:true});
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  await new Promise(r=>setTimeout(r,50));
  const touch=(type,y)=>{const e=new w.Event(type,{bubbles:true});e.touches=y==null?[]:[{clientY:y}];w.document.getElementById('view').dispatchEvent(e);};
  const shift=()=>{const m=/translateY\((-?[\d.]+)px\)/.exec(w.document.getElementById('view').style.transform||'');return m?+m[1]:0;};
  const drag=d=>{touch('touchstart',600);touch('touchmove',600-d);const s=shift();touch('touchend',null);return -s;};
  const H=874, curve=d=>(1-1/(d*0.55/H+1))*H;
  const r100=drag(100), r300=drag(300), r900=drag(900);
  ok('100px of drag stretches ~52px (UIScrollView curve; was 38)', Math.abs(r100-curve(100))<0.2, r100.toFixed(1));
  ok('300px stretches ~139px (was capped at 80)', Math.abs(r300-curve(300))<0.2, r300.toFixed(1));
  ok('no hard stop: 900px goes further than 300px, but less than 3x', r900>r300 && r900<3*r300, r900.toFixed(1));
  ok('diminishing returns: the second 100px adds less than the first', curve(200)-curve(100)<curve(100));
  ok('release clears the transform (the spring takes it back)', shift()===0 && w.document.body.classList.contains('bandback'));
  ok('the spring overshoots (y2 > 1.4 in the band-back curve)', /body\.bandback #view\{transition:transform \.6s cubic-bezier\(\.3,1\.6,\.5,1\)\}/.test(css));
  console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
