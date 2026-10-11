// v4.6.274: Bring your workouts, in the browser -- source, review (match, new part, duplicate), confirm, done, undo.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT,BASE=`http://127.0.0.1:${PORT}/`;
const strong=fs.readFileSync(path.join(__dirname,'fixtures/strong-sample.csv'),'utf8');
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]])for(const theme of ['dark','light']){const tag=`${theme} ${w}:`;
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:SHOT?3:1,serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE+'?theme='+theme);await p.waitForTimeout(1200);
 await p.evaluate(async theme=>{DB={days:{'2026-09-28':{w:[{part:'Shoulder',ex:'Lateral Raise',w:9,reps:[12],at:1}],upd:1}},settings:{onboarded:true,unit:'lb',theme,bar:theme,mascotMotion:'still',skin:'minimal'}};todayISO='2026-10-11';checkDate=()=>false;document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();save=()=>{};view='sync';render();await new Promise(r=>setTimeout(r,500));},theme);
 const before=await p.evaluate(()=>JSON.stringify(DB.days['2026-09-28']));
 await p.evaluate(()=>document.querySelector('[data-imp-open="settings"]').click());await p.waitForTimeout(300);
 const fit=()=>p.evaluate(()=>({sw:document.documentElement.scrollWidth,vw:innerWidth,over:[...document.querySelectorAll('#imp button,#imp p,#imp h1')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>innerWidth+0.5||r.left<-0.5);}).length}));
 let d=await p.evaluate(()=>({h:document.querySelector('#imp .im-h')?.textContent,src:!!document.querySelector('#imp [data-imp="file"]'),tpl:!!document.querySelector('#imp [data-imp="template"]')}));
 ok(`${tag} source: "You’re not starting from zero.", Upload a CSV, the template`,d.h==='You’re not starting from zero.'&&d.src&&d.tpl,d);
 let f=await fit();ok(`${tag} source fits`,f.sw<=f.vw&&!f.over,f);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/imp-1-${theme}.png`});
 await p.evaluate(t=>impLoadText(t,'strong.csv'),strong);await p.waitForTimeout(200);
 d=await p.evaluate(()=>({h:document.querySelector('#imp .im-h')?.textContent,sub:document.querySelector('#imp .im-sub2')?.textContent,att:document.querySelector('#imp .im-att')?.textContent||'',unit:!!document.querySelector('#imp .im-unit'),dis:document.querySelector('#imp [data-imp="toconfirm"]').disabled}));
 ok(`${tag} review: what was found, the unit asked (Strong), items needing attention, Continue held`,d.h==='Here’s what we found.'&&/3 workouts/.test(d.sub)&&/Strong/.test(d.sub)&&d.unit&&/need attention/.test(d.att)&&d.dis,d);
 f=await fit();ok(`${tag} review fits`,f.sw<=f.vw&&!f.over,f);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/imp-2-${theme}.png`});
 /* resolve: confirm the guess, choose a part for the new lift, keep the existing day */
 for(let i=0;i<8;i++){const did=await p.evaluate(()=>{const c=document.querySelector('#imp [data-imp="confirm"]');if(c){c.click();return 1;}const pt=document.querySelector('#imp .im-item:not(.im-ok) [data-imp="part"]');if(pt){pt.click();return 1;}const k=document.querySelector('#imp [data-imp="keep"]');if(k){k.click();return 1;}return 0;});if(!did)break;await p.waitForTimeout(80);}
 d=await p.evaluate(()=>({dis:document.querySelector('#imp [data-imp="toconfirm"]').disabled,label:document.querySelector('#imp [data-imp="toconfirm"]').textContent,saved:Object.values(DB.days).filter(x=>(x.w||[]).length).length}));
 ok(`${tag} every item resolved by tapping: Continue opens; still nothing saved`,!d.dis&&d.label==='Continue'&&d.saved===1,d);
 await p.click('#imp [data-imp="toconfirm"]');await p.waitForTimeout(150);
 d=await p.evaluate(()=>({h:document.querySelector('#imp .im-h')?.textContent,big:document.querySelector('#imp .im-big b')?.textContent,go:document.querySelector('#imp [data-imp="commit"]')?.textContent,checks:document.querySelector('#imp .im-checks')?.textContent}));
 ok(`${tag} confirm: 2 workouts (the duplicate excluded), Import 2 workouts`,d.h==='Ready when you are.'&&d.big==='2'&&d.go==='Import 2 workouts'&&/1 duplicate excluded/.test(d.checks)&&/Existing workouts unchanged/.test(d.checks),d);
 f=await fit();ok(`${tag} confirm fits`,f.sw<=f.vw&&!f.over,f);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/imp-3-${theme}.png`});
 await p.click('#imp [data-imp="commit"]');await p.waitForTimeout(200);
 d=await p.evaluate(()=>({h:document.querySelector('#imp .im-h')?.textContent,count:document.querySelector('#imp .im-count b')?.textContent,heat:document.querySelectorAll('#imp .im-wk i.on').length,days:Object.values(DB.days).filter(x=>(x.w||[]).length).length,kept:JSON.stringify(DB.days['2026-09-28'])}));
 ok(`${tag} done: "Your work came with you.", 2 imported, the days lit, your own day untouched`,d.h==='Your work came with you.'&&d.count==='2'&&d.heat===2&&d.days===3&&d.kept===before,d);
 f=await fit();ok(`${tag} done fits`,f.sw<=f.vw&&!f.over,f);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/imp-4-${theme}.png`});
 await p.click('#imp [data-imp="undo"]');await p.waitForTimeout(200);
 d=await p.evaluate(()=>({open:!!document.getElementById('imp'),sets:Object.values(DB.days).flatMap(x=>x.w||[]).length,kept:JSON.stringify(DB.days['2026-09-28']),toast:document.getElementById('toast').textContent}));
 ok(`${tag} undo: the batch is gone, your day exactly as it was`,!d.open&&d.sets===1&&d.kept===before&&/Import undone/.test(d.toast),d);
 ok(`${tag} no page errors`,!errors.length,errors);await p.close();}
 /* first run: the fourth way to start, and it fits a small phone */
 {const p=await b.newPage({viewport:{width:320,height:640},serviceWorkers:'block'});await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForTimeout(4000);
  await p.click('[data-onbact="local"]');await p.waitForTimeout(400);await p.click('[data-onbact="skip"]');await p.waitForTimeout(2400);
  const d=await p.evaluate(()=>{const c=document.querySelector('[data-onbgo="import"]');const r=c?.getBoundingClientRect();return {txt:c?.textContent,seen:!!r&&r.bottom<=innerHeight&&r.top>=0};});
  ok('first run: "Bring my past workouts" is a way to start, in view on a small phone',/Bring my past workouts/.test(d.txt||'')&&d.seen,d);
  await p.click('[data-onbgo="import"]');await p.waitForTimeout(300);
  const e=await p.evaluate(()=>({imp:!!document.getElementById('imp'),onb:getComputedStyle(document.getElementById('onb')).display,done:!!DB.settings.onboarded,later:document.querySelector('#imp [data-imp="later"]')?.textContent}));
  ok('...it finishes the first run and opens the importer, with Do this later',e.imp&&e.onb==='none'&&e.done&&e.later==='Do this later',e);await p.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
