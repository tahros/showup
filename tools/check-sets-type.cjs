/* check-sets-type.cjs — v4.6.109: the Your sets table reads at 13/12px and no
 * value breaks onto a second line on current iPhones (393, 402). The maker's
 * screenshot was a Pull Up table: bodyweight loads, a plan in "BW + 30", and a
 * logged "BW+25 x 6" that wrapped under its check mark. That table, rebuilt.
 * PW_PORT / PW_CHROME override the defaults. */
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(x=>x&&fs.existsSync(x));
const PORT=process.env.PW_PORT||'8784';
const SEED=theme=>`todayISO='2026-09-23';checkDate=()=>false;document.querySelector('#onb')?.remove();
 DB={days:{},settings:{unit:'lb',onboarded:true,theme:'${theme}',mascotMotion:'still'}};const k=lb=>lb/2.20462;
 DB.days['2026-09-15']={w:[{ex:'Pull Up',part:'Back',w:k(25),reps:[5,5,5,4],at:1}],doneAll:true,upd:1};
 DB.plan={d:todayISO,items:[{ex:'Pull Up',lines:[{w:k(30),reps:[4,4,4,4],bw:true}]}]};
 SEED=deriveAll();lift={part:'Back',ex:'Pull Up',weight:k(25),rep:6};view='lift';
 plLog({ex:'Pull Up',part:'Back',w:k(25),reps:[6],at:100});applyTheme();render();`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});try{
 for(const theme of ['light','dark'])for(const width of [402,393]){
  const p=await b.newPage({viewport:{width,height:874},serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:'+PORT+'/')?r.continue():r.abort());
  await p.goto('http://127.0.0.1:'+PORT+'/');await p.evaluate(SEED(theme));await p.waitForTimeout(300);
  const m=await p.evaluate(()=>{const q=s=>document.querySelector(s),cs=e=>getComputedStyle(e);
    const wrapped=[...document.querySelectorAll('.sc-session tbody .sc-value')].filter(v=>{const k=[...v.children].map(c=>c.getBoundingClientRect()).filter(r=>r.width);return k.length&&Math.max(...k.map(r=>r.top))-Math.min(...k.map(r=>r.top))>8;}).length;
    return {w:cs(q('.sc-session .sc-weight')).fontSize,r:cs(q('.sc-session .sc-rep')).fontSize,wrapped,
      row:Math.round(q('.sc-session tbody tr:first-child').getBoundingClientRect().height),
      mark:!!q('.sc-session .sc-outcome-mark'),pageX:document.documentElement.scrollWidth>innerWidth+1};});
  assert.deepEqual([m.w,m.r],['13px','12px'],`${theme} ${width}: weights 13px, reps 12px`);
  assert.equal(m.wrapped,0,`${theme} ${width}: no value breaks onto a second line`);
  assert(m.row<=56,`${theme} ${width}: a row is one line tall (${m.row}px)`);
  assert(m.mark&&!m.pageX,`${theme} ${width}: the check mark is still there, no sideways scroll`);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${theme} ${width}: 13/12px, every value on one line, ${m.row}px rows`);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e.message||e);process.exitCode=1});
