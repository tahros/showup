/* ShowUp — membership.js (v4.6.144): the free trial, the paywall and the gates.
   Classic script, loaded before metrics.js. Runbook 9.7; spec:
   claude/paywall-and-metrics-spec.md (D1-D9, all confirmed 2026-09-26).

   OFF UNTIL LAUNCH. PAYWALL_ON is false: nothing here changes what anyone sees
   or can do. The one exception is the preview switch below, for the owner to
   look at it on his own phone.

   THE RULE (D1, D3, D4). The trial is 20 LOGGED DAYS -- dates in the record
   with at least one set, counted from the record itself, never stored. After
   the 20th, two things need membership: starting a NEW day (the first set on a
   date that has none, from Train, History backfill or History edit) and the
   plan writer. Nothing else: a day already started can be finished and edited,
   history reads, Stats shows, export and paste-a-plan work. The record is
   never held hostage.

   FOUNDING MEMBERS (D7). Every record that exists before the paywall goes
   live is comped for good: while PAYWALL_ON is false, a record with a logged
   day gets settings.founding = the date, a synced setting, so it follows the
   account to a new phone. Once the paywall is live nobody new is marked.

   MEMBERSHIP (9.8 fills this in). The in-app purchase, through RevenueCat,
   writes {status, until} to showup:entitlement on this device. Active or in
   grace until `until` + 7 days, offline included (spec 2.4).

   THE PAYWALL (2.3). One calm screen, shown at the moment of a gated action,
   never on open, never repeated on its own. Your own days, one line on what
   stays free, the two prices (yearly first), Export my data, and Not now. No
   countdown anywhere: the only trace of the trial is one quiet row in
   Settings. */
const PAYWALL_ON=false;                      // flip on launch day (spec 6.7)
const TRIAL_DAYS=20, GRACE_MS=7*864e5;
const MB_PRICES=[{plan:'yearly',label:'Yearly',price:'$29.99',per:'a year',note:'$2.50 a month'},
                 {plan:'monthly',label:'Monthly',price:'$4.99',per:'a month',note:''}];
const MB_TERMS='https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const mbGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const mbSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
/* the owner's preview: localStorage showup:paywall-preview = "1" acts as a NEW
   user on this device (founding ignored), so the gates can be tried for real */
function paywallPreview(){ return mbGet('showup:paywall-preview')==='1'; }
function paywallLive(){ return PAYWALL_ON||paywallPreview(); }
function loggedDays(){ return Object.values(DB.days||{}).filter(d=>d&&(d.w||[]).length).length; }
function memberEntitled(now=Date.now()){
  try{
    const e=JSON.parse(mbGet('showup:entitlement')||'null');
    return !!e&&(e.status==='active'||e.status==='grace')&&Number.isFinite(+e.until)&&now<+e.until+GRACE_MS;
  }catch(e){ return false; }
}
function memberFounding(){ return !!DB.settings?.founding&&!paywallPreview(); }
function trialOver(){ return paywallLive()&&!memberEntitled()&&!memberFounding()&&loggedDays()>=TRIAL_DAYS; }
/* before any set lands on a date: true to go ahead, false when the paywall took over */
function dayGate(iso){
  if((DB.days?.[iso]?.w||[]).length) return true;          // a day already started is always yours to finish
  if(!trialOver()) return true;
  paywallOpen('day'); return false;
}
function writerGate(){
  if(!trialOver()) return true;
  paywallOpen('writer'); return false;
}
/* D7: mark the record a founding member while the paywall is not live */
function foundingMark(){
  if(PAYWALL_ON||!DB?.settings||DB.settings.founding||!loggedDays()) return false;
  DB.settings.founding=todayISO; DB.settingsAt=Date.now(); save(true); return true;
}
setTimeout(()=>{ try{ foundingMark(); }catch(e){} },3000);
setInterval(()=>{ try{ foundingMark(); }catch(e){} },60000);

/* ---- the screen ---- */
let _mbPick='yearly';
function paywallOpen(why){
  if(document.getElementById('paywall')) return;
  const el=document.createElement('div');
  el.id='paywall';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','pwTitle');
  el.dataset.why=why||'';
  el.innerHTML=paywallHTML();
  document.body.appendChild(el);
  el.addEventListener('click',paywallClick);
  if(mbGet('showup:ev-paywall')!==todayISO){ mbSet('showup:ev-paywall',todayISO); if(typeof mTrack==='function') mTrack('paywall_seen'); }
}
function paywallClose(){ document.getElementById('paywall')?.remove(); }
function paywallHTML(){
  const days=Object.keys(DB.days||{}).filter(d=>(DB.days[d].w||[]).length).sort();
  const first=days.slice(0,TRIAL_DAYS);
  const squares=first.map(d=>`<i title="${d}"></i>`).join('');
  const since=first.length?new Date(first[0]+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
  const opts=MB_PRICES.map(p=>`<button type="button" class="mb-opt" data-mb-plan="${p.plan}" aria-pressed="${_mbPick===p.plan}">
      <span class="mb-opt-l">${p.label}${p.note?`<small>${p.note}</small>`:''}</span><span class="mb-opt-p"><b>${p.price}</b> ${p.per}</span></button>`).join('');
  return `<div class="mb-card">
    <div class="mb-grid" aria-label="${first.length} logged days">${squares}</div>
    <p class="mb-since">${days.length} days logged${since?' since '+since:''}</p>
    <h2 id="pwTitle">Twenty days on the record.</h2>
    <p class="mb-line">Everything you logged stays yours: history, editing and export are free, always. Starting a new day and the plan writer are part of membership.</p>
    <div class="mb-opts" role="group" aria-label="Membership">${opts}</div>
    <button type="button" class="btn mb-buy" data-mb-buy>Become a member</button>
    <div class="mb-links"><button type="button" class="btn ghost" data-mb-export>Export my data</button><button type="button" class="btn ghost" data-mb-restore>Restore purchases</button><button type="button" class="btn ghost mb-later" data-mb-later>Not now</button></div>
    <p class="mb-fine">Payment is charged to your Apple ID. Membership renews automatically unless cancelled at least 24 hours before the end of the period; manage or cancel it in Settings → your name → Subscriptions. <a href="${MB_TERMS}" target="_blank" rel="noopener">Terms of Use</a> · <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></p>
  </div>`;
}
function paywallClick(e){
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.mbPlan){ _mbPick=b.dataset.mbPlan; document.querySelectorAll('#paywall [data-mb-plan]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.mbPlan===_mbPick)); return; }
  if(b.hasAttribute('data-mb-later')){ paywallClose(); return; }
  if(b.hasAttribute('data-mb-export')){
    dlFile('showup-backup-'+todayISO+'.json','application/json',JSON.stringify({app:'showup',v:APP_VERSION,exported:new Date().toISOString(),doc:DB}));
    if(typeof mTrack==='function') mTrack('export');
    return;
  }
  if(b.hasAttribute('data-mb-buy')){ memberBuy(_mbPick); return; }
  if(b.hasAttribute('data-mb-restore')){ memberRestore(); return; }
}
/* 9.8 replaces these two with RevenueCat's purchase and restore */
async function memberBuy(plan){ toast('Membership opens with the App Store version.'); return 'unavailable'; }
async function memberRestore(){ toast('Nothing to restore yet.'); return 'unavailable'; }

/* ---- the one Settings row (never elsewhere: no countdown, no badge) ---- */
function membershipRowHTML(){
  if(!paywallLive()) return '';
  let body;
  if(memberFounding()) body='Founding member · free for good';
  else if(memberEntitled()) body='Member';
  else if(loggedDays()<TRIAL_DAYS) body=`Free logged days: ${loggedDays()} of ${TRIAL_DAYS}`;
  else body='Free logged days: 20 of 20 · <button type="button" class="linkbtn" data-mb-open>Membership options</button>';
  return `<div class="mb-row mono" id="mbRow">${body}</div>`;
}
document.addEventListener('click',e=>{ if(e.target.closest&&e.target.closest('[data-mb-open]')) paywallOpen('settings'); });

(function(){
  const s=document.createElement('style');s.id='mbStyle';
  s.textContent=`#paywall{position:fixed;inset:0;z-index:8500;overflow:auto;background:var(--ground);color:var(--chalk);display:flex;justify-content:center;align-items:flex-start;padding:calc(env(safe-area-inset-top) + 40px) 22px calc(env(safe-area-inset-bottom) + 28px)}
#paywall .mb-card{width:100%;max-width:420px}
#paywall .mb-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;max-width:260px}
#paywall .mb-grid i{aspect-ratio:1;border-radius:4px;background:var(--accent)}
#paywall .mb-since{font:400 12px var(--mono);color:var(--muted);margin:10px 0 26px}
#paywall h2{font:600 26px/1.2 var(--body);letter-spacing:-.4px;margin:0 0 10px;text-transform:none;color:var(--chalk);opacity:1;display:block}
#paywall h2::after{display:none}
#paywall .mb-line{font:400 15px/1.55 var(--body);color:var(--muted);margin:0 0 22px}
#paywall .mb-opts{display:grid;gap:10px}
#paywall .mb-opt{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;text-align:left;border:1.5px solid var(--line);background:var(--surface);color:var(--chalk);border-radius:14px;padding:14px 16px;font:500 15px var(--body);cursor:pointer;min-height:56px}
#paywall .mb-opt[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
#paywall .mb-opt small{display:block;font:400 12px var(--body);color:var(--muted);margin-top:2px}
#paywall .mb-opt-p{color:var(--muted);font-size:14px;white-space:nowrap}#paywall .mb-opt-p b{color:var(--chalk);font-weight:600;font-size:16px}
#paywall .mb-buy{width:100%;margin:18px 0 8px;font:600 16px var(--body);min-height:52px}
#paywall .mb-links{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#paywall .mb-links .btn{width:100%;margin:0;padding:12px 10px;min-height:48px;font:500 14px var(--body);color:var(--chalk);background:var(--surface);border:1px solid var(--line);border-radius:12px;display:flex;align-items:center;justify-content:center}
#paywall .mb-links .mb-later{grid-column:1/-1;background:none;color:var(--muted)}
#paywall .mb-fine{font:400 11px/1.5 var(--body);color:var(--faint);margin:18px 0 0}#paywall .mb-fine a{color:var(--muted)}
.mb-row{font-size:12px;color:var(--muted);margin:2px 0 10px;text-align:center}.mb-row .linkbtn{border:0;background:none;color:var(--accent-ink);font:inherit;padding:0;cursor:pointer}`;
  document.head.appendChild(s);
})();
