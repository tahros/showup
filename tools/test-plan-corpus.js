// Twenty real-world workout-log shapes. This suite tests the parser's most
// important contract: read a prescription completely, or keep it visibly as
// a note. A plausible-looking partial read is a failure.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only",
  pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run = code => vm.runInContext(code,ctx);
const corpus = JSON.parse(fs.readFileSync(path.join(dir,"tools","fixtures","plan-real-world.json"),"utf8"));

let fail=0;
const ok=(name,cond,note)=>{
  console.log(cond?"PASS":"FAIL",name,note?"→ "+note:"");
  if(!cond) fail++;
};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

for(const test of corpus){
  const rows=run(`parsePlan(${JSON.stringify(test.input)})`);
  const accepted=run(`planItemsFrom(parsePlan(${JSON.stringify(test.input)}))`);
  if(test.expect.mode==="preserve"){
    ok(`${test.id}: ${test.shape} is preserved, not guessed`,
      accepted.items.length===0 && accepted.note.includes(test.expect.note),
      JSON.stringify({items:accepted.items.length,note:accepted.note}));
    continue;
  }
  const row=rows.find(r=>r.kind==="ex"&&r.ex===test.expect.exercise);
  ok(`${test.id}: ${test.shape} becomes one plan item`,
    !!row && accepted.items.length===1,
    JSON.stringify(rows.map(r=>({kind:r.kind,ex:r.ex,raw:r.raw}))));
  if(!row) continue;
  ok(`${test.id}: every written set survives`,row.lines.length===test.expect.lines.length,
    `${row.lines.length} lines`);
  test.expect.lines.forEach((want,i)=>{
    const got=row.lines[i]||{};
    const fields=Object.keys(want);
    ok(`${test.id}: line ${i+1} reads exactly`,
      fields.every(k=>same(got[k],want[k])),
      JSON.stringify(Object.fromEntries(fields.map(k=>[k,got[k]]))));
  });
}

ok("the corpus contains twenty distinct human log shapes",
  corpus.length===20 && new Set(corpus.map(x=>x.id)).size===20);
ok("every corpus entry retains its research source",
  corpus.every(x=>/^https:\/\//.test(x.source)));

process.exit(fail?1:0);
