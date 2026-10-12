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
const MB_PRICES=[{plan:'yearly',label:'Yearly',price:'$29.99',per:'a year',note:'$2.50 a month, billed yearly',badge:'Save 50%'},
                 {plan:'monthly',label:'Monthly',price:'$4.99',per:'a month',note:'Cancel anytime'}];
const MB_TERMS='https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const mbGet=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
const mbSet=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
/* the owner's preview: localStorage showup:paywall-preview = "1" acts as a NEW
   user on this device (founding ignored), so the gates can be tried for real */
function paywallPreview(){ return (typeof SANDBOX!=='undefined'&&SANDBOX)||mbGet('showup:paywall-preview')==='1'; }  /* v4.6.283: test mode is a new user after launch */
function paywallLive(){ return PAYWALL_ON||paywallPreview(); }
/* v4.6.287: sample data is not a record -- it counts toward neither the free days nor founding */
function loggedDays(){ if(DB?.settings?.demo) return 0; return Object.values(DB.days||{}).filter(d=>d&&(d.w||[]).length).length; }
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
  if(PAYWALL_ON||(typeof SANDBOX!=='undefined'&&SANDBOX)||!DB?.settings||DB.settings.demo||DB.settings.founding||!loggedDays()) return false;
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
/* v4.6.278: the coin is a member's. The paywall shows it as what membership adds; Settings shows
   it only to members (founding or entitled). */
function isMember(){ return memberFounding()||memberEntitled(); }
function mbBuyLabel(plan){ const p=MB_PRICES.find(x=>x.plan===plan)||MB_PRICES[0]; return `Continue · ${p.price} ${p.per}`; }
function paywallHTML(){
  const days=Object.keys(DB.days||{}).filter(d=>(DB.days[d].w||[]).length).sort();
  const first=days.slice(0,TRIAL_DAYS);
  const squares=first.map((d,i)=>`<i title="${d}" style="--i:${i}"></i>`).join('');
  const since=first.length?new Date(first[0]+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
  const num=typeof clubMembershipFacts==='function'?String(clubMembershipFacts().number).replace(/,/g,''):'';
  const coin=typeof clubCoinHTML==='function'?`<div class="club-brand mb-coin" aria-hidden="true">${clubCoinHTML(num)}</div>`:'';
  const opts=MB_PRICES.map(p=>`<button type="button" class="mb-opt" data-mb-plan="${p.plan}" aria-pressed="${_mbPick===p.plan}">${p.badge?`<span class="mb-badge">${p.badge}</span>`:''}<span class="mb-rd" aria-hidden="true"></span>
      <span class="mb-opt-l">${p.label}${p.note?`<small>${p.note}</small>`:''}</span><span class="mb-opt-p"><b>${p.price}</b><small>${p.per}</small></span></button>`).join('');
  return `<div class="mb-card">
    <div class="mb-top"><img class="mb-wm" src="assets/showuppp-wordmark-${document.documentElement.dataset.theme==='dark'?'dark':'light'}.svg" alt="ShowUppp"><button type="button" class="mb-x" data-mb-later aria-label="Not now"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="mb-hero">${coin}${first.length?`<div><div class="mb-grid" aria-label="${first.length} logged days">${squares}</div>
    <p class="mb-since">${days.length} ${days.length===1?'day':'days'} logged${since?' since '+since:''}</p></div>`:''}</div>
    ${days.length>=TRIAL_DAYS?`<h2 id="pwTitle">Twenty days.<br>You’re a regular now.</h2>
    <p class="mb-line">Membership keeps every new day open.</p>`:`<h2 id="pwTitle">Join the club.</h2>
    <p class="mb-line">Members log every day, plan with the writer and carry the coin.</p>`}
    <ul class="mb-gets">
      <li><span class="mb-ic">＋</span><span>Log every new day<small>Day 21 and every day after.</small></span></li>
      <li><span class="mb-ic">✦</span><span>The plan writer<small>Plans built from your own record.</small></span></li>
      <li><span class="mb-ic mb-ic-coin" aria-hidden="true"></span><span>Your member coin<small>With your number, in Settings.</small></span></li>
      <li class="mb-free"><span class="mb-ic">✓</span><span>Free for everyone<small>History, editing and export are free, always. Your record stays yours.</small></span></li>
    </ul>
    <div class="mb-opts" role="group" aria-label="Membership">${opts}</div>
    <button type="button" class="btn mb-buy" data-mb-buy><span>${mbBuyLabel(_mbPick)}</span></button>
    <p class="mb-cancel">Cancel anytime in your Apple ID settings.</p>
    <div class="mb-links"><button type="button" class="mb-link" data-mb-export>Export my data</button><button type="button" class="mb-link" data-mb-restore>Restore purchases</button></div>
    <p class="mb-fine">Payment is charged to your Apple ID. Membership renews automatically unless cancelled at least 24 hours before the end of the period; manage or cancel it in Settings → your name → Subscriptions. <a href="${MB_TERMS}" target="_blank" rel="noopener">Terms of Use</a> · <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a></p>
  </div>`;
}
function paywallClick(e){
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.mbPlan){ _mbPick=b.dataset.mbPlan; document.querySelectorAll('#paywall [data-mb-plan]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.mbPlan===_mbPick)); const l=document.querySelector('#paywall .mb-buy span'); if(l){ l.textContent=mbBuyLabel(_mbPick); l.classList.remove('mb-swap'); void l.offsetWidth; l.classList.add('mb-swap'); } return; }
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
async function memberBuy(plan){
  /* v4.6.283: in test mode Continue makes a free test membership, so the paid side can be tried */
  if(typeof SANDBOX!=='undefined'&&SANDBOX&&typeof sbxMemberSet==='function'){ sbxMemberSet(plan); toast(`Test member (${plan}). No charge.`); return 'test'; }
  toast('Membership opens with the App Store version.'); return 'unavailable'; }
async function memberRestore(){ toast('Nothing to restore yet.'); return 'unavailable'; }

/* v4.6.278: the free days, on Today (Sungjee's call, 2026-10-11: visible, not Settings only). It counts
   UP in your own squares -- no "days left", no urgency. Non-members during and after the trial only. */
/* v4.6.285: "Nothing else does." is gone; Join the club -- the coin, a picture of what membership
   brings -- opens the Subscribe screen at any point, not only at day 21. */
function trialCardHTML(){
  if(!paywallLive()||isMember()||DB.settings.demo) return '';
  const n=Math.min(loggedDays(),TRIAL_DAYS),sq=Array.from({length:TRIAL_DAYS},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('');
  const sub=n<TRIAL_DAYS?'Every day you log counts.':'Your record stays yours.';
  /* the coin as a picture, not its own button: no flip handler, nothing nested in the Join button */
  const coin=typeof clubCoinHTML==='function'?`<span class="club-brand mb-join-coin" aria-hidden="true">${clubCoinHTML('').replace(/^<button[^>]*>/,'<span class="club-coin-button">').replace(/<\/button>$/,'</span>')}</span>`:'';
  return `<div class="mb-trial" id="mbTrial"><div class="mb-trial-g" aria-hidden="true">${sq}</div><div class="mb-trial-t">${n} of ${TRIAL_DAYS} free days<small>${sub}</small></div><button type="button" class="mb-join" data-mb-open aria-label="Join the club">${coin}<span>Join the club</span></button></div>`;
}
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
  s.textContent=`#paywall{position:fixed;inset:0;z-index:8500;overflow:auto;background:var(--ground);color:var(--chalk);display:flex;justify-content:center;align-items:flex-start;padding:calc(env(safe-area-inset-top) + 22px) 22px calc(env(safe-area-inset-bottom) + 28px);animation:mbUp .55s cubic-bezier(.3,1.6,.5,1) both}
#paywall .mb-card{width:100%;max-width:420px}
#paywall .mb-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
/* v4.6.293: the official wordmark (Sungjee: 30% under the card's size) and a round close, not typed-out text */
#paywall .mb-wm{display:block;width:73px;height:auto}
#paywall .mb-x{all:unset;cursor:pointer;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--chalk) 8%,transparent);color:var(--muted)}
#paywall .mb-x:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#paywall .mb-hero{display:flex;align-items:center;gap:18px;margin-bottom:22px}
#paywall .mb-coin{flex:none;width:84px;height:84px;display:block;margin:0}
#paywall .mb-coin>.club-coin-button{position:relative;display:block;width:84px;height:84px;padding:0;border:0;border-radius:50%;background:none;perspective:500px;pointer-events:none}
#paywall .mb-coin .club-coin-rotor{animation:mbCoinIn 1.2s cubic-bezier(.3,1.6,.5,1) .15s both,mbCoinTurn 9s linear 1.35s infinite}
#paywall .mb-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;width:100%;max-width:230px}
#paywall .mb-grid i{aspect-ratio:1;border-radius:4px;background:var(--accent);animation:mbPop .45s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(var(--i,0)*35ms + 300ms)}
#paywall .mb-since{font:400 12px var(--mono);color:var(--muted);margin:10px 0 0}
#paywall h2{font:700 30px/1.15 var(--body);letter-spacing:-.6px;margin:0 0 8px;text-transform:none;color:var(--chalk);opacity:1;display:block}
#paywall h2::after{display:none}
#paywall .mb-line{font:400 16px/1.45 var(--body);color:var(--muted);margin:0 0 20px}
#paywall .mb-gets{list-style:none;margin:0 0 22px;padding:0;display:grid;gap:12px}
#paywall .mb-gets li{display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:start;font:500 15.5px/1.35 var(--body);color:var(--chalk)}
#paywall .mb-gets small{display:block;font:400 13.5px/1.35 var(--body);color:var(--muted);margin-top:2px}
#paywall .mb-ic{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);font:700 14px var(--body)}
#paywall .mb-ic-coin{background:linear-gradient(135deg,#c8d0d6,#8c99a4 55%,#dfe5e9);border-radius:50%;box-shadow:inset 0 0 0 1.5px #eef3f8,inset 0 0 0 2.5px #9aa3ad}
#paywall .mb-free .mb-ic{background:var(--surface2);color:var(--muted)}
#paywall .mb-opts{display:grid;gap:10px;margin-bottom:14px}
#paywall .mb-opt{position:relative;display:grid;grid-template-columns:20px 1fr auto;gap:12px;align-items:center;width:100%;text-align:left;padding:16px;border-radius:16px;border:2px solid var(--line);background:var(--surface);color:var(--chalk);font:inherit;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}
#paywall .mb-opt:active{transform:scale(.98)}
#paywall .mb-opt[aria-pressed=true]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,var(--surface))}
#paywall .mb-rd{width:20px;height:20px;border-radius:50%;border:2px solid var(--line);box-sizing:border-box;transition:border-width .25s cubic-bezier(.3,1.6,.5,1),border-color .2s}
#paywall .mb-opt[aria-pressed=true] .mb-rd{border:6px solid var(--accent)}
#paywall .mb-opt-l{font:700 16.5px/1.2 var(--body)}
#paywall .mb-opt small{display:block;font:400 13px/1.3 var(--body);color:var(--muted);margin-top:3px}
#paywall .mb-opt-p{text-align:right;white-space:nowrap}#paywall .mb-opt-p b{font:700 17px/1.2 var(--body);color:var(--chalk)}
#paywall .mb-badge{position:absolute;top:-10px;right:14px;background:var(--accent);color:#fff;font:700 11px/1 var(--body);letter-spacing:.4px;padding:5px 9px;border-radius:999px;text-transform:uppercase;animation:mbBadge .5s cubic-bezier(.3,1.6,.5,1) 2.2s both}
#paywall .mb-buy{width:100%;margin:0;min-height:56px;border-radius:16px;font:700 17px var(--body)}
#paywall .mb-buy span{display:inline-block}#paywall .mb-buy span.mb-swap{animation:mbSwap .3s ease-out}
#paywall .mb-cancel{text-align:center;font:400 13px/1.4 var(--body);color:var(--muted);margin:10px 0 16px}
#paywall .mb-links{display:flex;justify-content:center;gap:22px;margin-bottom:16px}
#paywall .mb-link{all:unset;cursor:pointer;font:600 14px var(--body);color:var(--chalk);padding:6px 2px}
#paywall .mb-fine{font:400 11px/1.5 var(--body);color:var(--faint);margin:0;text-align:center}#paywall .mb-fine a{color:var(--muted)}
#paywall .mb-top,#paywall .mb-since,#paywall h2,#paywall .mb-line,#paywall .mb-gets li,#paywall .mb-opt,#paywall .mb-buy,#paywall .mb-cancel,#paywall .mb-links,#paywall .mb-fine{animation:mbRise .5s ease-out both}
#paywall .mb-top{animation-delay:.1s}#paywall .mb-since{animation-delay:1.05s}#paywall h2{animation-delay:1.15s}#paywall .mb-line{animation-delay:1.3s}
#paywall .mb-gets li:nth-child(1){animation-delay:1.4s}#paywall .mb-gets li:nth-child(2){animation-delay:1.5s}#paywall .mb-gets li:nth-child(3){animation-delay:1.6s}#paywall .mb-gets li:nth-child(4){animation-delay:1.7s}
#paywall .mb-opt:nth-child(1){animation-delay:1.8s}#paywall .mb-opt:nth-child(2){animation-delay:1.9s}#paywall .mb-buy{animation-delay:2.05s}#paywall .mb-cancel,#paywall .mb-links,#paywall .mb-fine{animation-delay:2.15s}
@keyframes mbUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes mbRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes mbPop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
@keyframes mbBadge{from{opacity:0;transform:scale(.5) rotate(-8deg)}to{opacity:1;transform:none}}
@keyframes mbSwap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mbCoinIn{from{opacity:0;transform:translateY(-30px) rotateY(-540deg)}to{opacity:1;transform:rotateY(0)}}
@keyframes mbCoinTurn{from{transform:rotateY(0)}to{transform:rotateY(360deg)}}
@media (prefers-reduced-motion:reduce){#paywall,#paywall *{animation:none!important}}
.mb-trial{display:flex;align-items:center;gap:14px;margin:0 0 16px;padding:12px 16px;border-radius:16px;background:var(--surface)}
.mb-trial-g{display:grid;grid-template-columns:repeat(10,9px);grid-auto-rows:9px;gap:3px;flex:none}
.mb-trial-g i{border-radius:2.5px;background:var(--line);opacity:.55}.mb-trial-g i.on{background:var(--accent);opacity:1}
.mb-trial-t{font:600 14px/1.3 var(--body);color:var(--chalk)}.mb-trial-t small{display:block;font:400 12px/1.35 var(--mono);color:var(--muted);margin-top:2px}
.mb-trial{position:relative}
.mb-trial-t{flex:1;min-width:0}
.mb-join{all:unset;cursor:pointer;flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;font:600 11.5px/1 var(--body);color:var(--accent);white-space:nowrap;padding:2px 2px 0}
.mb-join-coin{position:relative;display:block;width:36px;height:36px;margin:0;flex:none}
.mb-join-coin .club-coin-button{position:absolute;inset:0;display:block;width:36px;height:36px;min-height:0;flex:none;padding:0;border:0;border-radius:50%;background:none;pointer-events:none;overflow:visible}
/* v4.6.286: it turns, like the coin in Settings: one turn in 16s, the same 3D coin with its edge */
.mb-join-coin .club-coin-button{perspective:300px}
.mb-join-coin .club-coin-rotor{animation:mbCoinTurn 16s linear infinite}
@media (prefers-reduced-motion:reduce){.mb-join-coin .club-coin-rotor{animation:none}}
@media (max-width:379px){.mb-trial{display:grid;grid-template-columns:1fr auto;grid-template-areas:'t j' 'g j';gap:8px 12px}.mb-trial-t{grid-area:t}.mb-trial-g{grid-area:g;grid-template-columns:repeat(20,7px);grid-auto-rows:7px;gap:2px}.mb-join{grid-area:j;align-self:center}}

.mb-trial .linkbtn{border:0;background:none;color:var(--accent);font:600 12px var(--body);padding:0;cursor:pointer}
.mb-row{font-size:12px;color:var(--muted);margin:2px 0 10px;text-align:center}.mb-row .linkbtn{border:0;background:none;color:var(--accent-ink);font:inherit;padding:0;cursor:pointer}`;
  document.head.appendChild(s);
})();
