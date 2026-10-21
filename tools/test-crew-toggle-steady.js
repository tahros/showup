/* test-crew-toggle-steady.js DIR -- v4.6.373: hiding the crew on the landscape
 * clock is a fade, not a reload. The toggle used to swap the walking image for
 * the still one on hide and back on show: each Show painted the still in its
 * corner for a frame or two, then restarted the walk from its first frame. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=q=>({matches:/landscape|coarse|max-height/.test(q)&&!/reduce/.test(q),addEventListener(){},removeEventListener(){},addListener(){}});
w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx);
run(`DB={days:{},settings:{onboarded:true,unit:'lb',clubAvatar:'bell',companionName:'Bell',companionFree:'bell'}};checkDate=()=>false;save=()=>{};
 const at=Date.now()-22000;DB.days[todayISO]={w:[{ex:'Bench Press',part:'Chest',w:60,reps:[8],at}],doneEx:[],donePart:[]};lastSetAt=at;
 document.documentElement.dataset.mascotMotion='animated';document.documentElement.classList.add('bigtimer');SEED=deriveAll();view='lift';render();tickRest();`);
const st=()=>JSON.parse(run(`(()=>{const b=document.querySelector('#hTimer .rt-buddy');return JSON.stringify({src:b&&b.getAttribute('src'),roam:b&&b.classList.contains('rt-roaming'),hidden:document.querySelector('#hTimer').classList.contains('rt-crew-hidden')});})()`));
const a=st();
ok('setup: the crew walks', a.roam&&/roaming/.test(a.src||''), a);
run(`document.querySelector('#hTimer .rt-crew-toggle').click();tickRest();`);
const b=st();
ok('Hide: hidden, and the walking image is left as it is', b.hidden&&b.roam&&b.src===a.src, b);
run(`tickRest();tickRest();document.querySelector('#hTimer .rt-crew-toggle').click();tickRest();`);
const c=st();
ok('Show: the same image, never the still in between', !c.hidden&&c.roam&&c.src===a.src, c);
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
ok('hidden is visibility and opacity, not display:none (which would drop the walk)', /rt-crew-hidden \.rt-buddy\{opacity:0;visibility:hidden/.test(css)&&!/rt-crew-hidden :is\(\.rt-buddy/.test(css));
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
