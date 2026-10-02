// v4.6.189: Daily runs ("Run by run") -- one year at a time, on an axis that
// holds the runs it shows. The maker's 9'37"-9'53" runs sat on an 11'00" floor:
// the pace axis was calibrated on every run ever logged, so getting faster ran
// the line off the bottom of the chart.
// Covers: the row of years (only years with runs, the latest chosen); the axis
// labels being that year's; no recent run at the rim and none below the floor;
// a slow outlier still at the rim; a year tap switching line, labels and
// footer in place; a past year's footer being the year's; one year = no row.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext(),run=c=>vm.runInContext(c,ctx);
w.fetch=()=>Promise.reject(new Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});
w.HTMLCanvasElement.prototype.toDataURL=()=>"data:image/png;base64,";
for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
let checks=0;
function test(name,code){assert(run(code),name);console.log('PASS '+name);checks++;}
/* miles: a 3.1 mi run at a given pace (sec per mile). 2024 slow, 2025 around
   11'30", 2026 getting faster: 11'30" in January to 9'40" now, one walk at 25'. */
run(`todayISO='2026-10-01';checkDate=()=>false;DB.settings.unit='lb';DB.settings.runMode='pace';
var KM=5,MIv=0.621371,rd=[],put=(d,pace)=>rd.push({d,km:KM,sec:Math.round(pace*KM*MIv),timed:KM});
for(let i=0;i<40;i++)put('2024-'+String(1+Math.floor(i/4)).padStart(2,'0')+'-'+String(1+(i%4)*6).padStart(2,'0'),840-i);
for(let i=0;i<60;i++)put('2025-'+String(1+Math.floor(i/5)).padStart(2,'0')+'-'+String(1+(i%5)*5).padStart(2,'0'),700-(i%7)*4);
for(let i=0;i<54;i++)put('2026-'+String(1+Math.floor(i/6)).padStart(2,'0')+'-'+String(1+(i%6)*4).padStart(2,'0'),690-i*2);
put('2026-05-27',1500);rd.sort((a,b)=>a.d<b.d?-1:1);put('2026-10-01',580);
runDays=()=>rd;
var mountY=()=>{document.getElementById('view').innerHTML=dailyRunsSection();bindDrun();};
var card=()=>({years:[...document.querySelectorAll('[data-drunyear]')].map(b=>b.textContent+(b.classList.contains('on')?'*':'')).join(' '),
  labs:[...document.querySelectorAll('.draxis span')].map(s=>s.textContent),dots:[...document.querySelectorAll('.drdot')].map(c=>({d:c.dataset.d,out:c.classList.contains('out'),cy:+c.getAttribute('cy')})),foot:document.querySelector('.drcard .tot').textContent});
var secs=t=>{const m=/(\\d+)'(\\d+)"/.exec(t);return m?+m[1]*60+ +m[2]:NaN;};
mountY();var c26=card();`);
test('a row of the years that have runs, the latest chosen',`c26.years==='2024 2025 2026*'`);
test('the line is that year only',`c26.dots.length===56&&c26.dots.every(x=>x.d.startsWith('2026'))`);
test('the axis holds the year’s fastest run: no run below the floor',`secs(c26.labs.at(-1))<=580&&secs(c26.labs[0])>=690`);
test('...so the newest runs are on the chart, not on its rim',`c26.dots.slice(-10).every(x=>!x.out)&&new Set(c26.dots.slice(-10).map(x=>x.cy)).size>5`);
test('...and the walked run is still at the rim, without owning the axis',`c26.dots.find(x=>x.d==='2026-05-27').out&&secs(c26.labs[0])<900`);
test('the fastest run has room under it, and the floor is within two steps of it',`(()=>{const l=c26.labs.map(secs),step=l[0]-l[1];return 580-l.at(-1)>=10&&580-l.at(-1)<=2*step;})()`);
test('this year’s footer is this month’s',`/per mi in Oct/.test(c26.foot)`);
run(`document.querySelector('[data-drunyear="2025"]').click();var c25=card();`);
test('tapping 2025 switches the line and the chosen year',`c25.years==='2024 2025* 2026'&&c25.dots.length===60&&c25.dots.every(x=>x.d.startsWith('2025'))`);
test('...and the axis labels, to that year’s own scale',`c25.labs.join()!==c26.labs.join()&&secs(c25.labs.at(-1))<=676&&secs(c25.labs[0])>=700&&secs(c25.labs[0])<=760`);
test('...and no 2025 run is at the rim',`c25.dots.every(x=>!x.out)`);
test('a past year’s footer is the year’s',`/per mi in 2025/.test(c25.foot)&&/best 11'16"/.test(c25.foot)`);
run(`document.querySelector('[data-drunmode]').click();var d25=card();`);
test('distance keeps the chosen year, and its footer is the year’s too',`d25.years==='2024 2025* 2026'&&d25.dots.length===60&&/mi in 2025/.test(d25.foot)&&/60 runs/.test(d25.foot)`);
run(`DRUN_YEAR=null;rd=rd.filter(r=>r.d.startsWith('2026'));DB.settings.runMode='pace';mountY();var one=card();`);
test('one year of runs: no row of years',`one.years===''&&one.dots.length===56`);
run(`DRUN_YEAR=null;rd=rd.concat({d:'2027-01-01',km:5,sec:1800,timed:5});todayISO='2027-01-01';mountY();var jan=card();`);
test('a new year with a single run so far: last year opens, the new year is one tap away',`jan.years==='2026* 2027'&&jan.dots.length===56`);
console.log(checks+' checks');dom.window.close();process.exit(0);
