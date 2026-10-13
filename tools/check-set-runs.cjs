// v4.6.302: in the grouped set table a run of reps sits under its weight, so a four-rep
// Last and a four-rep Plan no longer touch and read as one line. A single rep stays inline.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const w of [320,402,430])for(const theme of ['light','dark']){const tag=`${w} ${theme}:`;
 const p=await b.newPage({viewport:{width:w,height:874},serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE);await p.waitForTimeout(2500);
 await p.evaluate(theme=>{todayISO='2026-10-13';checkDate=()=>false;DB={days:{},settings:{unit:'lb',theme,onboarded:true}};const ex='Deadlift',lb=x=>x/2.2046226218;
  DB.days['2026-10-07']={w:[{ex,part:'Back',w:lb(135),reps:[8]},{ex,part:'Back',w:lb(235),reps:[4,3,3,3]}]};
  DB.plan={d:todayISO,items:[{ex,lines:[{w:lb(155),reps:[5],warm:true},{w:lb(205),reps:[8,8,8,8]}]}]};
  lift={ex,part:'Back',weight:lb(155)};view='lift';document.querySelector('#onb')?.remove();render();},theme);
 await p.waitForTimeout(700);
 const m=await p.evaluate(()=>{const cells=[...document.querySelectorAll('.sc-session .sc-group-value')].map(v=>{const wt=v.querySelector('.sc-weight').getBoundingClientRect(),reps=[...v.querySelectorAll('.sc-rep')].map(r=>r.getBoundingClientRect());return {text:v.innerText.replace(/\s+/g,' ').trim(),n:reps.length,under:reps.every(r=>r.top>=wt.bottom-1),inline:reps.every(r=>Math.abs((r.top+r.bottom)/2-(wt.top+wt.bottom)/2)<4),oneRow:reps.every(r=>Math.abs(r.top-reps[0].top)<1),td:v.closest('td').getBoundingClientRect(),box:(()=>{const rs=[wt,...reps];return {left:Math.min(...rs.map(r=>r.left)),right:Math.max(...rs.map(r=>r.right))};})()};});
  const card=document.querySelector('.sc-session');return {cells,over:card.scrollWidth>card.clientWidth+1};});
 const runs=m.cells.filter(c=>c.n>1),singles=m.cells.filter(c=>c.n===1);
 ok(`${tag} 235 × 4 3 3 3 and 205 × 8 8 8 8 each put the reps under the weight, on one row`,runs.length===2&&runs.every(c=>c.under&&c.oneRow),runs);
 ok(`${tag} 135 × 8 and 155 × 5 stay on one line`,singles.length===2&&singles.every(c=>c.inline),singles);
 const [a,c]=runs;ok(`${tag} Last and Plan stay apart, each inside its own column`,a&&c&&a.box.right<=a.td.right+1&&c.box.left>=c.td.left-1&&c.box.left-a.box.right>=8&&!m.over,{a:a?.box,c:c?.box});
 ok(`${tag} no page errors`,!errors.length,errors);await p.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
