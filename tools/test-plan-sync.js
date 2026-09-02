// test-plan-sync.js DIR — v3.3.418. Plans are cloud documents.
// The newest day plan and written week travel with the signed-in user;
// timestamped nulls travel too, so Clear cannot be undone by a stale device.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run = c => vm.runInContext(c,ctx);

let fail=0;
const ok=(name,cond,note)=>{ console.log((cond?"PASS":"FAIL"),name,note?"→ "+note:""); if(!cond) fail++; };
const plan=(ex,wgt=50)=>({d:run(`todayISO`),items:[{ex,lines:[{w:wgt,bw:false,reps:[8,8]}]}],note:'',raw:''});
const day=run(`todayISO`);

run(`(function(){DB.days={};DB.plan=null;DB.week=null;DB.planAt=0;DB.weekAt=0;DB.suggest=null;
  DB.settings.demo=false;DB.settings.onboarded=true;})()`);

/* newer remote plan wins whole and immediately feeds the tappable rail */
const remotePlan=plan('Squat',60);
let changed=run(`adoptRemotePlans(${JSON.stringify({plan:remotePlan,planAt:200})})`);
ok("a newer cloud plan is adopted",changed===1&&run(`DB.plan.items[0].ex`)==='Squat'&&run(`DB.planAt`)===200);
ok("...and is tappable immediately",run(`(sugOv().Squat||{}).from`)==='plan'&&run(`(sugOv().Squat||{}).sets.length`)===2);

/* a non-plan suggestion belongs to the person and is not erased by a plan refresh */
run(`sugOv()['Cable Fly Up']={sets:[{w:10,r:12}],d:todayISO,from:'history'}`);
const newerPlan=plan('Romanian Deadlift',70);
changed=run(`adoptRemotePlans(${JSON.stringify({plan:newerPlan,planAt:300})})`);
ok("a replacement removes the old plan rail",changed===1&&!run(`sugOv().Squat`)&&run(`(sugOv()['Romanian Deadlift']||{}).from`)==='plan');
ok("...without removing a non-plan suggestion",run(`(sugOv()['Cable Fly Up']||{}).from`)==='history');

/* stale cloud state never overwrites a newer local edit */
changed=run(`adoptRemotePlans(${JSON.stringify({plan:remotePlan,planAt:250})})`);
ok("an older cloud plan cannot overwrite the device",changed===0&&run(`DB.plan.items[0].ex`)==='Romanian Deadlift'&&run(`DB.planAt`)===300);

/* null plus a newer stamp is a deletion, not missing data */
changed=run(`adoptRemotePlans({plan:null,planAt:400})`);
ok("clearing a plan syncs as a deletion",changed===1&&run(`DB.plan===null`)&&run(`DB.planAt`)===400);
ok("...and clears only plan-fed suggestions",!run(`sugOv()['Romanian Deadlift']`)&&run(`(sugOv()['Cable Fly Up']||{}).from`)==='history');

/* written weeks have their own clock and today's block becomes today's rail */
const week={from:day,to:day,days:{[day]:{title:'Legs',items:[{ex:'Squat',lines:[{w:80,bw:false,reps:[6,6]}]}],note:'',raw:''}},raw:''};
changed=run(`adoptRemotePlans(${JSON.stringify({week,weekAt:500})})`);
ok("a newer written week is adopted independently",changed===1&&run(`DB.week.days[todayISO].title`)==='Legs'&&run(`DB.weekAt`)===500);
ok("...and today's week block is tappable",run(`(sugOv().Squat||{}).from`)==='plan');
changed=run(`adoptRemotePlans(${JSON.stringify({week:null,weekAt:450})})`);
ok("an older week deletion is ignored",changed===0&&run(`!!DB.week`));
changed=run(`adoptRemotePlans({week:null,weekAt:600})`);
ok("a newer week deletion clears it and its rail",changed===1&&run(`DB.week===null`)&&!run(`sugOv().Squat`));

/* saving a week replaces today's standalone plan and timestamps both facts */
run(`DB.plan=${JSON.stringify(plan('Deadlift',90))};DB.planAt=700`);
run(`weekSave(${JSON.stringify(week)})`);
ok("saving a week timestamps the standalone-plan deletion",run(`DB.plan===null`)&&run(`DB.planAt===DB.weekAt`)&&run(`DB.planAt>700`));

/* the actual REST body carries documents, edit clocks, and null tombstones */
(async()=>{
  run(`DB.plan=${JSON.stringify(plan('Squat',60))};DB.planAt=900;DB.week=null;DB.weekAt=901;
    DB.settings.demo=false;session={access_token:'tok',refresh_token:'r',expires_at:Date.now()+600000,user:{id:'u1'}};pulledOK=true;`);
  let sent=null;
  w.fetch=async(_url,opt)=>{ sent=JSON.parse(opt.body); return {ok:true,json:async()=>({})}; };
  const pushed=await run(`cloudPushNow()`);
  const doc=sent&&sent.doc;
  ok("the cloud push contains the active plan and its clock",pushed===true&&doc.plan.items[0].ex==='Squat'&&doc.planAt===900);
  ok("...and contains a timestamped cleared week",doc.week===null&&doc.weekAt===901);

  process.exit(fail?1:0);
})();
