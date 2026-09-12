/* test-verdictpayload.js — v4.3.9, the verdict reaches the writer.
 * Built on the real record: 215 x 6/6/4/4 must not produce 225 in the package.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};

/* the maker's squat: 215 gave 6/6/4/4, then 225 gave 6/7/8/8 */
run(`DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;DB.settings.bodyweight=70;
  DB.settings.myParts=['Legs','Chest'];todayISO='2026-09-12';checkDate=()=>false;
  const put=(d,ex,sets)=>{DB.days[d]=DB.days[d]||{w:[],upd:1};
    for(const [lb,...reps] of sets) DB.days[d].w.push({part:'Legs',ex,w:toKg(lb),reps,at:1});};
  put('2026-09-05','Squat',[[135,8],[215,6,6,4,4]]);
  put('2026-09-11','Squat',[[135,8],[215,6,6,4,4]]);
  put('2026-09-05','Cable Fly Up',[[30,12,12,12]]);
  put('2026-09-11','Cable Fly Up',[[30,12,12,12]]);
  SEED=deriveAll();dayMeta();`);
/* writerPayload takes the request options -- one day, today's date */
const payload=JSON.parse(run(`JSON.stringify(writerPayload({scope:'day',days:[todayISO],parts:{}}))`));
ok('the package carries a verdict per exercise', !!payload.verdict, JSON.stringify(payload.verdict));
ok('215 x 6/6/4/4 is a HOLD', payload.verdict.Squat==='hold', String(payload.verdict.Squat));
ok('...and the load it carries is 215, not the next plate',
   Math.round(payload.load.Squat)===215, String(payload.load&&payload.load.Squat));
ok('...while `next` still says 225, for the exercises the verdict does not cover',
   Math.round(payload.next.Squat)>215, String(payload.next&&payload.next.Squat));
ok('...and the reason is the maker\'s own numbers',
   /215 × 6\/6\/4\/4/.test(payload.because.Squat||''), payload.because&&payload.because.Squat);
/* with no correction stored, 30 x 12/12/12 DERIVES a 12-14 range, so a clean
   12 is at the floor and the answer is reps. The maker corrected this lift to
   10-12, which would make the same session a weight step -- that difference is
   exactly what the correction step buys, and it is not yet built. */
ok('a clean 12/12/12 climbs in reps on its derived range',
   payload.verdict['Cable Fly Up']==='step up reps' && payload.load['Cable Fly Up']===30,
   payload.verdict['Cable Fly Up']+' at '+payload.load['Cable Fly Up']);
ok('...and the load does not move while reps are climbing',
   payload.load['Cable Fly Up']===30);
/* warm-ups must not reach the verdict */
/* the warm-up matters: 135 under a 215 working set would make the session read
   135/215/215/215/215 -- uneven, and every verdict becomes hold for the wrong
   reason. The reason must name the WORKING weight, never the warm-up. */
ok('the 135 lb warm-up never reaches the verdict',
   /^215 ×/.test(payload.because.Squat||''), payload.because&&payload.because.Squat);
ok('...and the range was built on 215, not on 135',
   Math.round(payload.load.Squat)===215);
/* the case a working-weight vote cannot survive on its own: a BURNOUT with
   more sets than the work. Five sets of twenty at 135 outnumber four sets at
   215, so "the weight with the most sets" picks the burnout -- unless the
   burnout was filtered out as not-real first. */
{
  run(`DB.days['2026-09-11'].w=[];
    [[135,8],[215,6],[215,6],[215,4],[215,4],[135,20],[135,20],[135,20],[135,20],[135,20]]
      .forEach(([lb,r])=>DB.days['2026-09-11'].w.push({part:'Legs',ex:'Squat',w:toKg(lb),reps:[r],at:1}));
    SEED=deriveAll();`);
  const p2=JSON.parse(run(`JSON.stringify(writerPayload({scope:'day',days:[todayISO],parts:{}}))`));
  ok('a burnout with more sets than the work does not become the working weight',
     Math.round(p2.load.Squat)===215, String(p2.load&&p2.load.Squat));
  ok('...and the reason still names 215',
     /^215 ×/.test(p2.because.Squat||''), p2.because&&p2.because.Squat);
}

/* the server side */
const srv=fs.readFileSync(path.join(dir,'supabase/functions/write-session/index.ts'),'utf8');
ok('the prompt receives the verdict', /payload\.verdict/.test(srv) && /payload\.load/.test(srv));
ok('...and is told it is binding, in the sentence that overrides STEP',
   /IT DECIDES and the STEP rule below does not apply to it/.test(srv));
ok('...that hold means do not raise it', /has not finished with that weight/.test(srv));
ok('...that climbing reps never moves the load', /climbing reps never moves the load/.test(srv));
ok('...and that nothing ever lowers a weight', /no verdict that lowers a weight/.test(srv));
/* the three modules must actually load, or every guard silently no-ops */
ok('the app loads realset, reprange and verdict',
   /realset\.js/.test(html)&&/reprange\.js/.test(html)&&/verdict\.js/.test(html));
ok('...and caches them, so an offline plan keeps its verdict',
   (()=>{const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
     return /realset\.js/.test(sw)&&/reprange\.js/.test(sw)&&/verdict\.js/.test(sw);})());
process.exit(fails?1:0);
