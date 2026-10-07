// Full production script order. Calendar data and animation never write records.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=function({top,left}){if(top!==undefined)this.scrollTop=top;if(left!==undefined)this.scrollLeft=left;};w.navigator.vibrate=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx),ok=(name,s)=>{assert.ok(run(s),name);console.log('PASS '+name);};
run(`todayISO='2026-10-06';checkDate=()=>false;DB.settings={...DB.settings,onboarded:true,name:'A < B & C',weekStart:'monday'};DB.days={
 '2021-12-01':{w:[{part:'Shoulder',ex:'Overhead Press',w:10,reps:[8]},{part:'Legs',ex:'Squat',w:20,reps:[8]}]},
 '2024-02-29':{w:[{part:'Run',ex:'Run',w:5,mins:30}]},
 '2026-10-04':{w:[{part:'Run',ex:'Cycling',w:10,mins:30}]},
 '2026-10-06':{w:[{part:'Legs',ex:'Squat',w:20,reps:[8]}]},
 '2026-10-07':{w:[{part:'Chest',ex:'Dip',w:0,reps:[8]}]}};SEED=deriveAll();view='stats';render();window.beforeAttendance=JSON.stringify(DB);window.M=attendanceView.model();`);
ok('deduplicates two body parts on one date and excludes future dates',`M.total===4&&M.days.filter(d=>d.on).length===4`);
ok('includes leap day and no DST duplicates or skipped dates',`M.days.length===M.end-M.start+1&&M.days.some(d=>d.n===Date.parse('2024-02-29')/86400000)&&M.days.every((d,i)=>!i||d.n===M.days[i-1].n+1)`);
ok('uses older full exercise records, not only recent partDays',`M.parts.get(M.start).has('Shoulder')&&M.parts.get(M.start).has('Legs')`);
ok('Run means running, not cycling',`M.parts.get(Date.parse('2024-02-29')/86400000).has('Run')&&!M.parts.get(Date.parse('2026-10-04')/86400000).has('Run')`);
ok('respects Monday week start',`M.dow===1&&document.querySelector('.at-weekdays span').textContent==='M'`);
ok('profile is safely rendered as text',`document.querySelector('.at-owner').textContent==='A < B & C'`);
ok('share overview keeps six vertical year columns; weeks advance downward',`(()=>{const g=attendanceView.geometry(M,940,685,true),a=g.overview(M.days[0]),b=g.overview(M.days[7]);return g.cols===6&&g.bands===1&&a.x===b.x&&b.y>a.y})()`);
ok('vertical share overview keeps every square inside the graph and above the footer',`(()=>{const g=attendanceView.geometry(M,940,685,true);return M.days.every(d=>{const r=g.overview(d);return r.x>=0&&r.x+r.w<=940&&r.y>=0&&r.y+r.h<=685})})()`);
ok('image uses the same calendar coordinates as the completed animated frame',`(()=>{const g=attendanceView.geometry(M,940,685,true),p=attendanceView.phase(M,14000);return M.days.every(d=>{const a=g.overview(d),b=g.position(d,p);return ['x','y','w','h'].every(k=>Math.abs(a[k]-b[k])<.0001)})})()`);
ok('Today pulse counts the actual mark with a restrained, smooth breath',`attendanceView.phase(M,0).count===1&&attendanceView.phase(M,1330).zoom===1.65&&attendanceView.phase(M,2660).zoom===1`);
ok('rewind is monotonic, actual counted days exactly match revealed marks',`(()=>{let prev=0,cursor=M.end;for(let t=0;t<=heatReplay.duration();t+=50){const p=attendanceView.phase(M,t);if(p.count<prev||p.cursor>cursor||p.count!==M.days.filter(d=>d.on&&d.n>=p.cursor).length)return false;prev=p.count;cursor=p.cursor;}return prev===4})()`);
ok('final camera contains every year and every training day',`attendanceView.phase(M,heatReplay.duration()).overview===1&&attendanceView.phase(M,heatReplay.duration()).count===4&&document.querySelectorAll('.at-mini.on').length===4`);
ok('camera is fractional rather than stepping whole days or weeks',`!Number.isInteger(attendanceView.phase(M,5000).cursor)&&(()=>{const g=attendanceView.geometry(M,320,430),d=M.days[500],a=g.timeline(d,M.days[500].n),b=g.timeline(d,M.days[500].n+.1);return Math.abs(a.y-b.y)>0&&Math.abs(a.y-b.y)<1;})()`);
ok('camera stays continuous at every phase boundary and ends at overview coordinates',`(()=>{const g=attendanceView.geometry(M,320,430);for(const t of [2660,8540,8680,8820,11900,14000])for(const d of M.days){const a=g.position(d,attendanceView.phase(M,t-.001)),b=g.position(d,attendanceView.phase(M,t+.001));if(Math.hypot(a.x-b.x,a.y-b.y)>1)return false;}return M.days.every(d=>{const a=g.position(d,attendanceView.phase(M,14000)),b=g.overview(d);return ['x','y','w','h'].every(k=>Math.abs(a[k]-b[k])<.0001);});})()`);
ok('one group light clock continues after the journey without changing counts',`attendanceView.sweepAt(14000)!==attendanceView.sweepAt(15000)&&attendanceView.sweepAt(14000)===attendanceView.sweepAt(20000)&&attendanceView.phase(M,15000).count===4`);
ok('Today remains anchored throughout the pulse on every weekday',`(()=>{const g=attendanceView.geometry(M,232,430);return Array.from({length:7},(_,col)=>({...M.days[M.days.length-1],col})).every(d=>{const a=g.position(d,attendanceView.phase(M,0));return [1,665,1330,1995,2659].every(t=>{const r=g.position(d,attendanceView.phase(M,t));return Math.abs(r.x+r.w/2-a.x-a.w/2)<.0001&&Math.abs(r.y+r.h/2-a.y-a.h/2)<.0001;});});})()`);
run(`window.ac=document.querySelector('.attendance-card');heatReplay.play(ac);window.scene=ac._attendance.scene;window.replayCanvas=ac.querySelector('canvas');scene.seek(heatReplay.duration());`);
ok('natural completion retains the identical canvas for persistent shimmer',`ac.querySelector('canvas')===replayCanvas&&ac._attendance.scene===scene&&ac.dataset.phase==='complete'&&!heatReplay.live`);
run(`scene.finish();`);
run(`document.querySelector('.at-parts button[data-attendance-part="Shoulder"]').click();`);
ok('top rail exposes all body parts and running with a pressed selection',`document.querySelectorAll('.at-parts button').length===9&&document.querySelector('.at-parts [aria-pressed="true"]').dataset.attendancePart==='Shoulder'&&!document.querySelector('.at-part')`);
ok('focus highlights one matching date, dims the other training dates blue',`document.querySelectorAll('.at-cell.on:not(.dim)').length===1&&document.querySelectorAll('.at-cell.on.dim').length===3&&document.querySelector('.at-focus b').textContent==='1 day'`);
run(`document.querySelector('.at-motion').value='Off';document.querySelector('.at-motion').dispatchEvent(new Event('change'));`);
ok('Off exposes full history without running a canvas',`document.querySelector('.attendance-card').dataset.overview==='true'&&!heatReplay.live&&!document.querySelector('.at-replay-canvas')`);
ok('preferences, profile and records remain byte-identical',`JSON.stringify(DB)===beforeAttendance`);
run(`delete DB.days[todayISO];SEED=deriveAll();M=attendanceView.model();`);
ok('a rest Today does not invent a workout',`attendanceView.phase(M,0).count===0&&!M.trained.has(M.end)`);
run(`DB.days={};SEED=deriveAll();M=attendanceView.model();`);
ok('empty history is a safe zero, no sample data',`M.total===0&&M.days.length===1&&attendanceView.phase(M,heatReplay.duration()).count===0`);
ok('empty vertical share remains finite without invented days',`Object.values(attendanceView.geometry(M,940,685,true).overview(M.days[0])).every(Number.isFinite)`);
run(`DB.days={[todayISO]:{w:[{part:'Shoulder',ex:'Overhead Press',w:10,reps:[8]}]}};SEED=deriveAll();M=attendanceView.model();`);
ok('first workout has one day and finite camera positions',`M.total===1&&M.years.length===1&&Object.values(attendanceView.geometry(M,280,430).overview(M.days[0])).every(Number.isFinite)`);
run(`DB.days['2010-01-01']={w:[{part:'Legs',ex:'Squat',w:10,reps:[8]}]};SEED=deriveAll();M=attendanceView.model();`);
ok('long history wraps years without truncating the model',`M.years.length===17&&attendanceView.geometry(M,280,430).bands===3&&M.days.every(d=>{const p=attendanceView.geometry(M,280,430).overview(d);return p.x>=0&&p.x+p.w<=280&&p.y>=0&&p.y+p.h<=430})`);
ok('long vertical share wraps all years into bands without dropping dates',`(()=>{const g=attendanceView.geometry(M,940,685,true);return g.bands===3&&M.days.every(d=>{const p=g.overview(d);return p.x>=0&&p.x+p.w<=940&&p.y>=0&&p.y+p.h<=685})})()`);
run(`DB.settings.weekStart='sunday';DB.days['2000-01-01']={w:[{part:'Legs',ex:'Squat',w:10,reps:[8]}]};SEED=deriveAll();M=attendanceView.model();`);
ok('54-week leap-year layout never clips the final December cell',`(()=>{const g=attendanceView.geometry(M,940,685,true),d=M.days.find(d=>d.n===Date.parse('2000-12-31')/86400000),p=g.overview(d);return p.x+p.w<=940&&p.y+p.h<=g.bh})()`);
assert.match(fs.readFileSync(path.join(dir,'js/heat-replay.js'),'utf8'),/showCard\(\(\)=>render\(\)/);
assert.match(fs.readFileSync(path.join(dir,'js/heat-replay.js'),'utf8'),/bindPlateExport\(data,null,gifModule,videoModule,\{render,/);
console.log('PASS still image shares the vertical renderer with animated exports');
const shareSource=fs.readFileSync(path.join(dir,'js/heat-replay.js'),'utf8');
assert.doesNotMatch(shareSource,/\.filter\s*=/);
assert.doesNotMatch(shareSource,/showuppp-a\.svg/);
assert.match(shareSource,/showuppp-lifted-lockup-/);
for(const theme of ['dark','light']){
 const asset='assets/showuppp-lifted-lockup-'+theme+'.png';
 assert(fs.readFileSync(path.join(dir,asset)).equals(fs.readFileSync(path.join(dir,'brand/ShowUppp-Lifted-Trio-Brand-Kit-2026-10-01/02-lockups',theme,'showuppp-horizontal-1024.png'))),'lockup must be the exact approved brand asset');
 assert(fs.readFileSync(path.join(dir,'sw.js'),'utf8').includes(asset),'approved lockup must work offline');
}
console.log('PASS exact approved Lifted P Trio + Pip assets, both themes, cached offline');
console.log('ALL PASS');process.exit(0);
