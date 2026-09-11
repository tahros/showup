// Execute the actual TypeScript Edge handler with Deno/fetch replaced. No network.
const ts=require('typescript'),fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const source=fs.readFileSync(path.join(process.argv[2]||'.','supabase/functions/write-session/index.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},reportDiagnostics:true});
assert(!compiled.diagnostics.some(d=>d.category===ts.DiagnosticCategory.Error),'server TypeScript syntax');
let handler,called=[];
const response={days:[{date:'2026-09-11',part:'Legs',title:'Legs',text:'Squat\n  205 lb × 8 8 8'}],reason:null};
vm.runInNewContext(compiled.outputText,{Deno:{env:{get:k=>k==='ANTHROPIC_API_KEY'?'test-only':undefined},serve:f=>handler=f},Request,Response,AbortController,setTimeout,clearTimeout,fetch:async(url,opts)=>{called.push(JSON.parse(opts.body));return new Response(JSON.stringify({content:[{text:JSON.stringify(response)}]}));}});
const base={v:1,days:['2026-09-11'],date:'2026-09-11',unit:'lb',scope:'day',objective:'grow',history:[],skeleton:[{date:'2026-09-11',resting:[{part:'Chest',on:'2026-09-10'}],due:['Legs']}],shape:{min:3,median:5,max:6},recovery_days:2};
async function invoke(body){return handler(new Request('https://example.test/write-session',{method:'POST',body:JSON.stringify(body)}));}
(async()=>{
  assert.equal((await invoke(base)).status,200);const old=called.at(-1);assert.equal(old.model,'claude-sonnet-4-5');assert.equal(old.max_tokens,2500);assert.equal(old.temperature,.4);
  assert(old.messages[0].content.includes(JSON.stringify(base.skeleton)));assert(old.messages[0].content.includes(JSON.stringify(base.shape)));
  const workspace={version:1,today:'2026-09-10',action:'adjust',schedule:[{date:'2026-09-11',parts:['Legs','Sixpack']}],drafts:[{date:'2026-09-11',target_total_sets:17,text:'Squat\n  205 lb × 8 8',locked_exercises:['Squat\n  205 lb × 8 8']}]};
  assert.equal((await invoke({...base,workspace})).status,200);const next=called.at(-1);assert.equal(next.model,old.model);assert.equal(next.system,old.system);assert.equal(next.temperature,old.temperature);
  assert(next.messages[0].content.includes(JSON.stringify(workspace)));assert(next.messages[0].content.includes('Today is 2026-09-10'));assert(next.messages[0].content.includes('Change ONLY the number of sets'));assert(next.messages[0].content.includes('locked_exercises exactly'));
  const invalid=await invoke({...base,workspace,days:Array(8).fill('2026-09-11')});assert.equal(invalid.status,400);assert.equal(called.length,2);
  console.log('PASS Edge handler: unchanged model/system/temperature; calendar, shape, explicit focus, fixed edits and total-set contract included; bounded request');
})().catch(e=>{console.error(e);process.exit(1)});
