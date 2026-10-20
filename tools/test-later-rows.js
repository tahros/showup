/* test-later-rows.js DIR -- v4.6.365: three things that looked broken on the phone.
 *  1. After a workout, the days after tomorrow are Tomorrow-style rows (date · sets over the parts,
 *     a chevron), never the planner's raw fold with its bare disclosure triangle.
 *  2. A glyph turned icon ("+ Year", "Latest ↗") stays inline at letter size, whatever card it is in.
 *  3. Strength-progress chips say Core and Cardio, not the stored Sixpack / Run.
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
  w.matchMedia=q=>({matches:false,addEventListener(){},removeEventListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});await sleep(200);
  const run=c=>vm.runInContext(c,ctx);
  run(`DB={days:{'2026-10-20':{w:[{part:'Back',ex:'Lat Pulldown',w:50,reps:[10,10],at:Date.now()-7200e3}],doneAll:1,completedAt:Date.now()-3600e3,upd:1}},settings:{onboarded:true,unit:'lb'}};todayISO='2026-10-20';checkDate=()=>false;save=()=>{};
    DB.week={days:{}};const P={'2026-10-21':"Lat Pulldown\\n  120 lb x 10 10 10",'2026-10-22':"Barbell Bench Press\\n  135 lb x 8 8 8",'2026-10-23':"Squat\\n  185 lb x 8 8 8"};
    for(const [d,t] of Object.entries(P)){const {items}=planItemsFrom(parsePlan(t));planSave(items,'',t,d);DB.week.days[d]=JSON.parse(JSON.stringify(DB.plan));}DB.plan=null;SEED=deriveAll();`);
  const h=run(`closedTodayHTML(DB.days[todayISO])`);
  const d=new w.DOMParser().parseFromString('<div>'+h+'</div>','text/html');
  const rows=[...d.querySelectorAll('.ld-later-list>.ld-later-day')];
  ok('the days after tomorrow are rows of their own',rows.length===2,rows.length);
  ok('each row: date and sets over the parts, a chevron, a styled fold summary',rows.every(r=>{const s=r.querySelector(':scope>summary');return s&&s.classList.contains('pw-fold-summary')&&/Oct 2\d · \d+ sets?/.test(s.querySelector('.lt-head small')?.textContent||'')&&s.querySelector('.lt-head b')&&s.querySelector('svg');}));
  ok('...and no raw planner fold (the bare ▶ triangle) in the list',!d.querySelector('.ld-later-list .pw-later-day'));
  ok('an opened row carries Edit, Paste and Copy',rows.every(r=>['open-date','paste-open','plan-copy'].every(a=>r.querySelector(`[data-pw="${a}"]`))));
  const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
  ok('a glyph icon stays inline at letter size',/\.ic\.ic-glyph\{display:inline-block!important;width:1\.1em!important;height:1\.1em!important/.test(css));
  ok('the "+ Year" pill has no disclosure triangle',/\.comparison-years summary::-webkit-details-marker\{display:none\}/.test(css)&&/\.comparison-years summary\{list-style:none/.test(css));
  const pg=fs.readFileSync(path.join(dir,'js/progression.js'),'utf8');
  ok('strength chips show display names (Core, Cardio)',/partLabel\(p\)/.test(pg)&&run(`partLabel('Sixpack')+partLabel('Run')`)==='Core'+run('CARDIO_PART'));
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
