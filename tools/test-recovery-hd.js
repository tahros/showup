// Deterministic HD player contract: resolution, page seams, clock seeks and failures.
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'../js/derive.js'),'utf8');
const code=source.slice(source.indexOf('function recoveryFrame('),source.indexOf('function tickRest('));
const classes=new Set(['recovery']),draws=[];
const cl={contains:x=>classes.has(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};
let canvas,now=1,raf,fail=false;
const ctx={clearRect(){},drawImage(...args){draws.push(args);}};
const el={classList:cl,dataset:{recoveryAnchor:'1'},querySelector:()=>canvas,appendChild:c=>canvas=c};
const offsets=Array.from({length:840},(_,i)=>i%1681);
const manifest={fps:60,count:840,cycleMs:14000,tileWidth:480,tileHeight:240,columns:8,framesPerPage:60,pages:14,crews:{pip:{x:offsets},bag:{x:offsets}}};
class Image{set src(value){this.url=value;queueMicrotask(()=>{if(fail){this.onerror();return;}this.naturalWidth=3840;this.naturalHeight=1920;this.onload();});}}
const sandbox={Map,Image,Date:{now:()=>now},Number,Math,fetch:async()=>({ok:true,json:async()=>manifest}),
 document:{hidden:false,documentElement:{classList:{contains:()=>true}},createElement:()=>({setAttribute(){},dataset:{},getContext:()=>ctx})},
 requestAnimationFrame:f=>{raf=f;return 1;},cancelAnimationFrame:()=>{raf=null;},paintQuietClock(){}};
vm.createContext(sandbox);vm.runInContext(code,sandbox);
const flush=()=>new Promise(r=>setImmediate(r));
async function at(ms){now=1+ms;raf();await flush();raf();}
(async()=>{
 sandbox.syncRecoveryCrew(el,'pip',true);await flush();await at(0);
 assert.equal(canvas.width,2160);assert.equal(canvas.height,240);assert(classes.has('rt-synced'));
 assert.equal(canvas.dataset.frame,0);assert.equal(el._recoveryCrew.pages.size,2);
 await at(1000);assert.equal(canvas.dataset.frame,60);
 assert.deepEqual(draws.at(-1).slice(1),[0,0,480,240,60,0,480,240]);
 for(const ms of [6999,7000,13999,14000,68000]){await at(ms);assert.equal(canvas.dataset.frame,sandbox.recoveryFrame(ms));assert(el._recoveryCrew.pages.size<=2);}
 fail=true;await at(4000);assert(!classes.has('rt-synced'),'failed page shows fallback');
 fail=false;await at(18000);assert(classes.has('rt-synced'),'failed page retries after cooldown');
 sandbox.syncRecoveryCrew(el,'bag',true);assert(!classes.has('rt-synced'),'old Crew is never shown after selection');await flush();await at(0);
 assert(draws.at(-1)[0].url.endsWith('/bag.webp'));
 sandbox.syncRecoveryCrew(el,'bag',false);assert.equal(el._recoveryCrew.pages.size,0);assert(!classes.has('rt-synced'));assert.equal(raf,null);
 sandbox.syncRecoveryCrew(el,'bag',true);await at(7000);assert.equal(canvas.dataset.frame,420);
 sandbox.syncRecoveryCrew.manifest=Promise.resolve({...manifest,count:600});el._recoveryCrew.id=null;
 sandbox.syncRecoveryCrew(el,'pip',true);await flush();await at(0);assert(!classes.has('rt-synced'),'reject stale manifest');
 console.log('PASS HD recovery: 2160px canvas, 7s arrivals, 60fps, bounded paging, page seams, retries, selection and stale-asset fallback');
})().catch(e=>{console.error(e);process.exitCode=1;});
