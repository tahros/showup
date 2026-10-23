/* test-set-rows.js DIR -- v4.6.381: a set with nothing beside it does not split
 * a run. Your sets groups consecutive sets into one row when every column agrees;
 * a column that has run out (no planned set 6, no set 6 last time) no longer
 * breaks the row, but it can't come back inside it, and a real change of weight
 * still starts a new row. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx);
/* rows: [label, last weight|null, plan weight|null, warm-up?] */
const labels=rows=>run(`(()=>{const S=(w,q)=>w==null?null:{w,r:6,su:'',qualifier:q||''};
  const rows=${JSON.stringify(rows)}.map(([l,a,b,q])=>({label:l,last:S(a,q),target:S(b,q),actual:[]}));
  return plSessionGroups(rows).map(g=>g.rows.length>1?g.rows[0].label+'–'+g.rows.at(-1).label:g.rows[0].label).join(' ');})()`);
let g=labels([['1',115,115,'warm-up'],['2',165,175],['3',175,175],['4',175,175],['5',175,175],['6',175,null]]);
ok('the reported table: last time\'s sixth set at 175 joins 3–5 (no planned set 6)',g==='1 2 3–6',g);
g=labels([['3',175,175],['4',175,175],['5',null,175],['6',null,175]]);
ok('the other way: planned sets past last time\'s join the run',g==='3–6',g);
g=labels([['3',175,175],['4',null,175],['5',175,175]]);
ok('a column that has run out does not come back inside a row (no hole mid-reps)',g==='3–4 5',g);
g=labels([['3',175,175],['4',175,175],['5',180,null]]);
ok('a real change of weight still starts a new row',g==='3–4 5',g);
g=labels([['1',null,175],['2',175,175]]);
ok('a column cannot start partway into a row either',g==='1 2',g);
const solo=run(`(()=>{const A=w=>({w,r:8,su:''});const rows=[{label:'1',last:{w:100,r:8,su:''},target:null,actual:[]},{label:'+',last:null,target:null,actual:[A(100)]},{label:'+',last:null,target:null,actual:[A(100)]}];return plSessionGroups(rows).map(g=>g.rows.length).join();})()`);
ok('sets logged with nothing to compare still group only with each other',solo==='1,2',solo);
/* v4.6.392: a set with no weight is its own row */
const feelRows=run(`(()=>{const F=r=>({w:0,r,su:'',nw:true});const rows=[10,10,10,10,8,8,8,8,8,8,8,8].map((r,i)=>({label:String(i+1),last:null,target:F(r),actual:[]}));return plSessionGroups(rows).length;})()`);
ok('twelve sets by feel are twelve rows, not one "1–12"',feelRows===12,feelRows);
const zeroLast=run(`(()=>{const Z=r=>({w:0,r,su:''});const rows=[1,2,3].map(i=>({label:String(i),last:Z(10),target:{w:0,r:10,su:'',nw:true},actual:[]}));return plSessionGroups(rows).length;})()`);
ok('last time with reps and no weight does not merge either',zeroLast===3,zeroLast);
const bw=run(`(()=>{const B=()=>({w:0,r:12,su:'',bw:true});const rows=[1,2,3].map(i=>({label:String(i),last:B(),target:B(),actual:[]}));return plSessionGroups(rows).length;})()`);
ok('bodyweight sets still group (BW is a load)',bw===1,bw);
const pull=run(`(()=>{const Z=()=>({w:0,r:8,su:''});const rows=[1,2,3].map(i=>({label:String(i),last:Z(),target:Z(),actual:[]}));return plSessionGroups(rows,'Pull Up').length;})()`);
ok('a bodyweight exercise at no added weight still groups',pull===1,pull);
const hold=run(`(()=>{const H=()=>({w:0,r:60,su:'s'});const rows=[1,2,3].map(i=>({label:String(i),last:H(),target:H(),actual:[]}));return plSessionGroups(rows).length;})()`);
ok('timed holds at no weight still group',hold===1,hold);
const line=run(`(()=>{SEED.lastSess=SEED.lastSess||{};SEED.lastSess['Leg Press']={d:'2026-10-01',rows:[[0,[10,10]],[0,[8,8]]]};SEED.lastSess['Bench Press']={d:'2026-10-01',rows:[[60,[8,8,8]]]};return [pwLastLine('Leg Press'),pwLastLine('Bench Press')];})()`);
ok('history with reps and no weight plans by feel, not "0 kg"',line[0]&&line[0].load==='by feel'&&line[0].reps.join(' ')==='10 10 8 8',line[0]);
ok('history with a weight still plans that weight',line[1]&&/^60 /.test(line[1].load),line[1]);
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
