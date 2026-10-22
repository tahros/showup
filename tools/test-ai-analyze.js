/* test-ai-analyze.js DIR -- v4.6.390: the AI reads what you bring, within a daily allowance.
 * 1. supabase/functions/write-session/analyze.ts, imported: who the allowance counts
 *    (account, else device, else address -- stored hashed), what one use returns, that a
 *    missing counter lets the call through, the request shape, and how the model's answer
 *    is trimmed.
 * 2. The v4.6.390 SQL in PGlite: ai_use() counts per key per day, says when the day is
 *    spent, and only the service role can call it (skips without @electric-sql/pglite).
 * 3. The app (jsdom): the AI's routine is bounded on the phone (catalog names only); the
 *    quick read takes over without it; the allowance's quiet line and its sheet; import
 *    review answers every duplicate at once; a day's x asks before removing it. */
const fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
(async()=>{
 /* ---- 1. the server module ---- */
 const A=await import(require('url').pathToFileURL(path.join(dir,'supabase/functions/write-session/analyze.ts')).href);
 const hdr=h=>({headers:{get:k=>h[k.toLowerCase()]??null}});
 const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
 const U='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',D='11111111-2222-4333-8444-555555555555';
 ok('a signed-in caller is counted by account', A.capKey(hdr({authorization:'Bearer x.'+b64({role:'authenticated',sub:U})+'.y','x-device':D}))==='u:'+U);
 ok('...a signed-out caller by device', A.capKey(hdr({authorization:'Bearer x.'+b64({role:'anon'})+'.y','x-device':D}))==='d:'+D);
 ok('...and with neither, by address', A.capKey(hdr({'x-forwarded-for':'203.0.113.9, 10.0.0.1'}))==='ip:203.0.113.9');
 const hk=await A.hashKey('d:'+D);
 ok('the stored key is a hash, never the id', /^d:[0-9a-f]{40}$/.test(hk)&&!hk.includes(D.slice(0,8)), hk);
 const env=k=>({SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'svc'})[k];
 const calls=[];const net=v=>async(u,o)=>{calls.push({u,b:JSON.parse(o.body)});return {ok:v!==null,json:async()=>v};};
 const req=hdr({'x-device':D});
 ok('one use returns what is left', JSON.stringify(await A.useAllowance(req,env,net(7)))==='{"left":7,"limit":10}'&&calls[0].u.endsWith('/rest/v1/rpc/ai_use')&&/^d:[0-9a-f]{40}$/.test(calls[0].b.p_key));
 ok('...a spent day says so', (await A.useAllowance(req,env,net(-1))).over===true);
 ok('...a missing counter lets the call through', await A.useAllowance(req,env,net(null))===null&&await A.useAllowance(req,k=>undefined,net(3))===null);
 const P={action:'analyze',v:1,source:'paste',text:'Push\nBench 185 x 5',unit:'lb',objective:'grow',catalog:{Chest:['Barbell Bench Press']},today:'2026-10-22'};
 ok('a paste is a valid request; an empty one is not', A.analyzeOk(P)&&!A.analyzeOk({...P,text:'  '})&&!A.analyzeOk({...P,source:'x'}));
 ok('...an import needs workouts, at most sixty', A.analyzeOk({...P,source:'import',workouts:[{d:'2026-10-01',ex:[['Squat',225,5]]}]})&&!A.analyzeOk({...P,source:'import',workouts:Array(61).fill({d:'x',ex:[]})}));
 ok('the model gets the catalog and the paste', /catalog: \{"Chest":\["Barbell Bench Press"\]\}/.test(A.analyzeUser(P))&&/PASTE:\nPush\nBench 185 x 5/.test(A.analyzeUser(P)));
 ok('...or one line per workout', /IMPORT:\n2026-10-01 \| Squat @ 225 × 5/.test(A.analyzeUser({...P,source:'import',workouts:[{d:'2026-10-01',ex:[['Squat',225,5]]}]})));
 const R=A.readAnalysis('Here: {"sessions":[{"name":"Push","exercises":[{"ex":"Barbell Bench Press","sets":"185 lb × 5 5 5"},{"ex":""}]},{"rest":true,"name":"x"},{"name":"Legs","exercises":[{"ex":"Squat","sets":"225 lb × 5"}]}],"days_per_week":9,"notes":["rows?"]}');
 ok('the answer is trimmed to shape: empty names dropped, rest kept in place, an impossible days-a-week dropped', R&&R.sessions.length===3&&R.sessions[0].exercises.length===1&&R.sessions[1].rest&&R.days_per_week===null&&R.notes[0]==='rows?', R);
 ok('...and an answer with no exercises is no answer', A.readAnalysis('{"sessions":[{"rest":true}]}')===null&&A.readAnalysis('nope')===null);

 /* ---- 2. the SQL ---- */
 let PGlite=null;try{({PGlite}=require('@electric-sql/pglite'));}catch(e){console.log('SKIP the SQL half: @electric-sql/pglite not installed');}
 if(PGlite){
  const sql=fs.readFileSync(path.join(dir,'supabase-setup.sql'),'utf8'),section=sql.slice(sql.indexOf('-- v4.6.390 — the daily AI allowance'));
  const db=new PGlite();await db.exec(`create role anon; create role authenticated; create role service_role;`);await db.exec(section);
  const use=async k=>(await db.query(`select public.ai_use($1,3) as n`,[k])).rows[0].n;
  const seq=[await use('d:a'),await use('d:a'),await use('d:a'),await use('d:a'),await use('d:b')];
  ok('ai_use counts per key: 2, 1, 0 left, then spent; another key starts fresh', seq.join()==='2,1,0,-1,2', seq);
  let refused=false;try{await db.exec(`set role anon; select public.ai_use('d:z',3);`);}catch(e){refused=true;}await db.exec('reset role');
  ok('...and the app’s public key cannot call it', refused);
 }

 /* ---- 3. the app ---- */
 const {JSDOM}=require('jsdom');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
 const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,ctx=dom.getInternalVMContext();
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
 w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};
 for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
 const run=c=>vm.runInContext(c,ctx),q=s=>w.document.querySelector(s),click=s=>q(s).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 run(`DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'},plan:null,week:null,planTracking:null};todayISO='2026-10-22';checkDate=()=>false;save=()=>{};SEED=deriveAll();view='today';render();localStorage.removeItem('showup:ai-quota');`);
 const ai=run(`JSON.stringify(onbFromAI({sessions:[{name:'Push',exercises:[{ex:'Barbell Bench Press',sets:'185 lb × 5 5 5'},{ex:'Made Up Press',sets:'x'}]},{rest:true},{name:'',exercises:[{ex:'Squat',sets:'225 lb × 5'}]}],days_per_week:4,notes:['felt tired']}))`);
 const A2=JSON.parse(ai);
 ok('the AI’s routine keeps catalog names only; the rest become notes', A2.cards.length===3&&A2.cards[0].text.startsWith('Barbell Bench Press\n  185 lb × 5 5 5')&&!/Made Up/.test(A2.cards[0].text)&&A2.unread.includes('Made Up Press')&&A2.unread.includes('felt tired')&&A2.cards[1].rest&&A2.days===4, A2);
 ok('...an answer of only unknown names is no routine', run(`onbFromAI({sessions:[{exercises:[{ex:'Nope'}]}]})`)===null);
 run(`onbHist=['fork'];onbPath='have';onbStep='have';onbRender();onbHave='paste';onbGo('paste');onbPasteText='Push\\nBench Press 185 x 5 5 5\\n\\nRest\\n\\nLegs\\nSquat 3x5';onbReadDone('paste',null,true);`);
 ok('without the AI the quick read takes over, and the heading says the AI is used up today', run(`onbStep`)==='routine'&&/Today’s AI reads are used up/.test(q('#onb .ob-sub').textContent)&&run(`onbF.cards.map(c=>c.rest?'Rest':c.name).join()`)==='Push,Rest,Legs', run(`[onbStep,onbF&&onbF.cards.map(c=>c.name).join()]`));
 ok('the found routine reads on one line, with Change and Edit', /We found your routine\./.test(q('#onb .ob-h1').textContent)&&/Change/.test(q('#onb [data-onbact="fchange"]').textContent)&&/Edit/.test(q('#onb [data-onbact="fcustom"]').textContent));
 click('#onb .ob-rt-xdel[data-v="0"]');
 ok('a day’s x asks before removing it', !!q('#onb .ob-rt-ask')&&run('onbF.cards.length')===3);
 click('#onb [data-onbact="fnoask"]');ok('...Cancel keeps it', !q('#onb .ob-rt-ask')&&run('onbF.cards.length')===3);
 click('#onb .ob-rt-xdel[data-v="0"]');click('#onb .ob-rt-ask-go');ok('...Remove removes it', run('onbF.cards.length')===2);
 run(`aiQuotaSet(2,10)`);ok('two left: the Plan footer says so quietly', /2 AI plans left today/.test(run(`aiLeftHTML()`)));
 run(`aiQuotaSet(0,10)`);let threw=null;try{await run(`writeSession({v:1,days:['2026-10-22']})`);}catch(e){threw=e;}
 ok('spent: no call is made', threw&&threw.cap===true);
 run(`aiCapSheet()`);ok('...and the sheet says when they come back', /That’s today’s AI plans/.test(q('#aiCap').textContent)&&/10 more arrive tomorrow/.test(q('#aiCap').textContent));
 click('[data-aicap-ok]');ok('...Got it closes it', !q('#aiCap'));
 run(`localStorage.removeItem('showup:ai-quota');onbEl().hidden=true;DB.days={};const rows=['Date,Exercise,Weight,Reps'];for(let i=1;i<=30;i++){const d=rtAddDays(todayISO,-i);DB.days[d]={w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[5],at:1}]};rows.push(d+',Barbell Bench Press,60,5');}for(let i=31;i<=35;i++)rows.push(rtAddDays(todayISO,-i)+',Barbell Bench Press,60,5');SEED=deriveAll();impOpen('settings');impLoadText(rows.join('\\n'),'x.csv');`);
 ok('import review: one card answers all 30 duplicates, the first 20 still shown one by one', /30/.test(q('#imp .im-bulk-n').textContent)&&w.document.querySelectorAll('#imp [data-imp="keep"]').length===20&&/10 more/.test(q('#imp .im-more').textContent));
 click('#imp [data-imp="dupall"][data-v="keep"]');
 ok('...Keep all existing answers them, collapses them, and unlocks Continue', run('impPending()')===0&&/30 duplicates answered/.test(q('#imp').textContent)&&!q('#imp [data-imp="toconfirm"]').disabled, [run('impPending()'),q('#imp').textContent.slice(0,300),q('#imp [data-imp="toconfirm"]')?.disabled]);
 click('#imp [data-imp="dupreset"]');ok('...Change asks again', run('impPending()')===30);
 console.log(fails?`\n${fails} FAILING`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exit(1);});
