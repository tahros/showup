// Full production script order. Calendar data and animation never write records.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=function({top}){this.scrollTop=top;};w.navigator.vibrate=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
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
ok('Today pulse counts the actual Today mark',`attendanceView.phase(M,0).count===1&&attendanceView.phase(M,765).zoom>6`);
ok('rewind is monotonic, actual counted days exactly match revealed marks',`(()=>{let prev=0,cursor=M.end;for(let t=0;t<=9550;t+=50){const p=attendanceView.phase(M,t);if(p.count<prev||p.cursor>cursor||p.count!==M.days.filter(d=>d.on&&d.n>=p.cursor).length)return false;prev=p.count;cursor=p.cursor;}return prev===4})()`);
ok('final camera contains every year and every training day',`attendanceView.phase(M,9550).overview===1&&attendanceView.phase(M,9550).count===4&&document.querySelectorAll('.at-mini.on').length===4`);
run(`document.querySelector('.at-part').value='Shoulder';document.querySelector('.at-part').dispatchEvent(new Event('change'));`);
ok('focus highlights one matching date, dims the other training dates blue',`document.querySelectorAll('.at-cell.on:not(.dim)').length===1&&document.querySelectorAll('.at-cell.on.dim').length===3&&document.querySelector('.at-focus b').textContent==='1 day'`);
run(`document.querySelector('.at-motion').value='Off';document.querySelector('.at-motion').dispatchEvent(new Event('change'));`);
ok('Off exposes full history without running a canvas',`document.querySelector('.attendance-card').dataset.overview==='true'&&!heatReplay.live&&!document.querySelector('.at-replay-canvas')`);
ok('preferences, profile and records remain byte-identical',`JSON.stringify(DB)===beforeAttendance`);
run(`delete DB.days[todayISO];SEED=deriveAll();M=attendanceView.model();`);
ok('a rest Today does not invent a workout',`attendanceView.phase(M,0).count===0&&!M.trained.has(M.end)`);
run(`DB.days={};SEED=deriveAll();M=attendanceView.model();`);
ok('empty history is a safe zero, no sample data',`M.total===0&&M.days.length===1&&attendanceView.phase(M,9550).count===0`);
run(`DB.days={[todayISO]:{w:[{part:'Shoulder',ex:'Overhead Press',w:10,reps:[8]}]}};SEED=deriveAll();M=attendanceView.model();`);
ok('first workout has one day and finite camera positions',`M.total===1&&M.years.length===1&&Object.values(attendanceView.geometry(M,280,430).overview(M.days[0])).every(Number.isFinite)`);
run(`DB.days['2010-01-01']={w:[{part:'Legs',ex:'Squat',w:10,reps:[8]}]};SEED=deriveAll();M=attendanceView.model();`);
ok('long history wraps years without truncating the model',`M.years.length===17&&attendanceView.geometry(M,280,430).bands===3&&M.days.every(d=>{const p=attendanceView.geometry(M,280,430).overview(d);return p.x>=0&&p.x+p.w<=280&&p.y>=0&&p.y+p.h<=430})`);
console.log('ALL PASS');process.exit(0);
