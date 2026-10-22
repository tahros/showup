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
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
