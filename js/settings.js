/* ShowUp — settings.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Sync (GitHub) ---------- */
function renderSync(){
  clubEnsureIdentity();
  /* v4.6.344: SETTINGS REDRAWN IN PLACE DOESN'T RE-ENTER (Sungjee, 2026-10-16).
     Choosing a crew member redraws Settings, and the redraw replayed every
     card's entrance rise -- the picker dropped 8px and slid back each tap, the
     stutter. paint() suppresses the rise for an in-place repaint with .norise;
     this redraw writes #view directly, so it says so itself when Settings is
     already the screen being shown. */
  if(document.getElementById('verTag'))document.getElementById('view')?.classList.add('norise');
  $('#view').innerHTML=`
    <!-- v3.3.513: the version rides at the TOP. It sat under a full screen of
         settings and a paragraph of icon credits, which meant scrolling the
         whole page to answer the one question you open Settings to answer
         mid-debug: which build is this. It is a fact about the app, not a
         footnote to the controls, so it goes where you land. The credits keep
         the foot to themselves. -->
    <div class="vertag mono" id="verTag">ShowUppp ${APP_VERSION}</div>
    ${clubCardHTML()}
    ${typeof membershipRowHTML==='function'?membershipRowHTML():''}
    ${typeof ownerEntryHTML==='function'?ownerEntryHTML():''}
    ${!session&&Object.keys(DB.days).some(d=>DB.days[d].w&&DB.days[d].w.length)?`
    <div class="card" style="border-color:var(--record)"><b>Not syncing.</b>
      <div class="note" style="margin-top:3px">Workouts logged on this device stay on this device until you sign in below. If the app is ever deleted or reinstalled, unsynced data is lost.</div></div>`:''}
    <h2>Display</h2>
    <div class="card">
      <button class="btn ghost" id="unitBtn" style="margin:0">${isLb()?'lb · mi':'kg · km'}</button>
      <span class="seg" style="display:flex;margin-top:6px">
        <button data-thm="system" class="${DB.settings.theme==='system'?'sel':''}">System</button>
        <button data-thm="light" class="${DB.settings.theme==='light'?'sel':''}">Light</button>
        <button data-thm="dark" class="${DB.settings.theme!=='system'&&DB.settings.theme!=='light'?'sel':''}">Dark</button>
      </span>
      <!-- v4.6.164: Retro / Minimal / Classic is gone -- ShowUp is Minimal (the
           maker's call, 2026-09-29). load() moves a stored Retro or Classic to Minimal. -->
      <!-- v3.3.477: the tab bar's own appearance. "Match" rather than
           "System" because the row above already means the system, and one
           word must not mean two things two rows apart. -->
      <div class="note" style="margin-top:8px">Tab bar</div>
      <span class="seg" style="display:flex;margin-top:3px">
        <button data-barpick="match" class="${DB.settings.barTheme!=='dark'&&DB.settings.barTheme!=='light'?'sel':''}">Match</button>
        <button data-barpick="light" class="${DB.settings.barTheme==='light'?'sel':''}">Light</button>
        <button data-barpick="dark" class="${DB.settings.barTheme==='dark'?'sel':''}">Dark</button>
      </span>
    </div>
    <!-- v4.1.8: the header strip is a calendar week now, so which day starts
         it is the maker's to choose. A viewing choice only: no record moves,
         the heatmap and Stats are untouched, and the same week counts the same
         under either setting. -->
    <h2>Workout feedback</h2>
    <div class="card">
      <span class="seg" style="display:flex" role="group" aria-label="Workout feedback">
        ${['sound','touch'].map(key=>`<button type="button" data-logger-feedback="${key}" aria-pressed="${loggerPrefs[key]}">${key==='sound'?'Sound':'Touch'}: ${loggerPrefs[key]?'On':'Off'}</button>`).join('')}
      </span>
      <div class="note" style="margin-top:6px">Pin click for the rep ruler. A soft clunk when you change weight or log a set. Saved on this device; touch feedback depends on your device.</div>
    </div>
    <!-- v4.6.326: Body-part colors removed; everyone uses Normal (Sungjee, 2026-10-15) -->
    <h2>Week starts on</h2>
    <div class="card"><span class="seg" style="display:flex">
      ${[['sunday','Sunday'],['monday','Monday']].map(([v,label])=>`<button data-week-start="${v}" class="${weekStartDow()===(v==='monday'?1:0)?'sel':''}" aria-pressed="${weekStartDow()===(v==='monday'?1:0)}">${label}</button>`).join('')}
    </span></div>
    <!-- v4.6.368: Text size. Five steps half a pixel apart, Default in the
         middle; Auto follows the iPhone's own text size where it can be read. -->
    <h2>Text size</h2>
    <div class="card ts-card">
      <div class="ts-preview" aria-hidden="true"><b>Barbell Bench Press</b><span>Mid · yesterday · 135 lb × 8</span></div>
      <div class="ts-steps" role="radiogroup" aria-label="Text size">
        ${TEXT_STEPS.map((v,i)=>`<button type="button" role="radio" data-text-size="${v}" class="ts-step${textAdd()===v&&DB.settings.textSize!=='auto'?' sel':''}${v===TEXT_DEFAULT?' ts-def':''}" aria-checked="${textAdd()===v&&DB.settings.textSize!=='auto'}" aria-label="${['Smaller','Small','Default','Large','Larger'][i]}"><span style="--ts-g:${12+i*2.5}px">A</span></button>`).join('')}
      </div>
      <div class="ts-labels" aria-hidden="true"><span>Smaller</span><span>Default</span><span>Larger</span></div>
      ${textPhoneAdd()!=null?`<button type="button" class="ts-auto${DB.settings.textSize==='auto'||DB.settings.textSize==null?' on':''}" data-text-size="auto" role="switch" aria-checked="${DB.settings.textSize==='auto'||DB.settings.textSize==null}"><span>Match iPhone text size</span><i aria-hidden="true"></i></button>`:''}
    </div>
    <!-- v4.6.389: the Mascot switch (Animated / Still / Off) is gone. The crew moves; the phone's Reduce Motion still stills it. -->
    <!-- v4.6.164: the TODAY & TRAIN layout switch is gone -- Refined only; load() moves a stored Previous to Refined. -->
    <h2>Planning</h2>
    <div class="card">
      <button type="button" class="btn ghost" data-pw="pf-settings">${icon('edit',ICON_SZ.sm)} Planning preferences ${icon('chevron',ICON_SZ.sm)}</button>
      <p class="note">${hesc(pfSummary())}</p>
      <!-- v4.6.164: the Planning interface switch is gone -- Workspace only. -->
    </div>
    ${holdingCardHTML()}
    ${avoidedCardHTML()}
    ${typeof remPlugin==='function'&&remPlugin()?(()=>{ const rp=remPrefs(); return `
    <!-- v4.6.118: reminders, iOS app only (a website cannot schedule them). -->
    <h2>Reminders</h2>
    <div class="card">
      <span class="seg" style="display:flex">
        <button data-rem="off" class="${rp.on?'':'sel'}" aria-pressed="${!rp.on}">Off</button>
        <button data-rem="on" class="${rp.on?'sel':''}" aria-pressed="${rp.on}">On</button>
      </span>
      ${rp.on?`<div class="fld text" style="margin-top:8px"><label>Planned-day note at</label>
        <input id="remMorning" type="time" value="${rp.morning}"></div>`:''}
      <div class="note" style="margin-top:8px">At most one a day. On a planned day, your plan in the morning. On a usual training day with no plan, one line 30 minutes after you usually start, if nothing is logged. Nothing on rest days.</div>
    </div>`; })():''}
    ${typeof hlPlugin==='function'&&hlPlugin()?(()=>{ const hp=hlPrefs(); return `
    <!-- v4.6.132: Apple Health, iOS app only, write-only (js/health.js). -->
    <h2>Apple Health</h2>
    <div class="card">
      <span class="seg" style="display:flex">
        <button data-hl="off" class="${hp.on?'':'sel'}" aria-pressed="${!hp.on}">Off</button>
        <button data-hl="on" class="${hp.on?'sel':''}" aria-pressed="${hp.on}">On</button>
      </span>
      <div class="note" style="margin-top:8px">When you press Finish, the workout is saved to Apple Health: your lifting as strength training, and each run, ride, row, swim or walk as its own workout with its time and distance. From now on only; nothing earlier is sent. ShowUppp never reads your Health data.</div>
    </div>`; })():''}
    ${typeof membershipSettingsHTML==='function'?membershipSettingsHTML():''}
    <h2>Account & cloud sync</h2>
    <div class="card">
      ${session?`
        <div class="row spread" style="margin-bottom:8px">
          <span><b class="selectable">${session.user.email||'Signed in'}</b>
            <div class="note" style="margin:2px 0 0">Devices sync on open and on return, day by day.</div>
        <div class="note" style="margin:5px 0 0">Your full history — ${fmt(SEED.totals.sessions)} days · ${SEED.totals.km} km.</div></span>
        </div>
        <div class="note">Last cloud sync: ${DB.settings.lastCloud?new Date(DB.settings.lastCloud).toLocaleString():'—'}</div>
        <div class="row" style="gap:8px;margin-top:8px">
          <button class="btn ghost" id="cloudPullBtn" style="margin:0">Pull ↓</button>
          <button class="btn ghost" id="signOutBtn" style="margin:0">Sign out</button>
        </div>
        <button class="btn ghost danger" id="deleteAcctBtn" style="margin:11px 0 0">Delete account…</button>
        <div class="note" style="margin-top:5px">Erases your account and everything synced to it. Sign out only removes this device.</div>`
      :`
        ${cloudReady()?`
          ${typeof appleReady==='function'&&appleReady()?`<button class="btn apple-btn" id="appleBtn"><span class="apple-glyph" aria-hidden="true">&#xF8FF;</span>Continue with Apple</button>`:''}
          <button class="btn" id="googleBtn" style="margin:0">Continue with Google</button>
          <div class="note" style="margin-top:6px">Your data stays on this device until you sign in. Signing in syncs it to your own database, private to your account.</div>`
        :`
          <div class="fld text" style="margin-bottom:6px"><label>Supabase project URL</label>
            <input id="cloudUrl" value="${DB.settings.cloud?.url||''}" placeholder="https://xxxx.supabase.co" autocapitalize="off"></div>
          <div class="fld text"><label>Anon public key</label>
            <input id="cloudAnon" value="${DB.settings.cloud?.anon||''}" placeholder="eyJhbGciOi…" autocapitalize="off"></div>
          <button class="btn" id="cloudSave" style="margin-top:8px">Save & enable cloud</button>
          <div class="note" style="margin-top:6px">One-time setup — see INSTALL.md — create the free database, run one SQL file, switch on Google sign-in.</div>`}
      `}
    </div>
    <!-- v4.6.117: App Store 5.1.1(i) wants the privacy policy reachable in the app.
         Absolute URLs: inside the iOS app a relative link would resolve to the
         app's own files, which do not carry these pages. -->
    <div class="note legal-links" style="text-align:center;margin:8px 0 0"><a href="https://tahros.github.io/showup/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> · <a href="https://tahros.github.io/showup/support.html" target="_blank" rel="noopener">Support</a></div>
    <h2>You</h2>
    <div class="card">
      <div class="fld text" style="margin-bottom:6px"><label>Name — what the app calls you</label>
        <input id="youName" value="${hesc(DB.settings.name||'')}" placeholder="—" autocapitalize="words" maxlength="40"></div>
      <div class="note" style="margin:-2px 0 8px">${firstName()
        ? `Greets you as <b>${firstName()}</b> — the first word of whatever you type.`
        : `Only the first word is used — “Sungjee Kim” greets as Sungjee. Type exactly what you want to be called.`}</div>
      <div class="row" style="gap:8px;align-items:stretch">
        <div class="fld" style="flex:1"><label>Weight (${U()})</label>
          <input id="youBw" type="number" inputmode="decimal" step="0.1" value="${bwNow()>0?wDisp(bwNow()):''}" placeholder="—"></div>
        <div class="fld" style="flex:1"><label>Sex</label>
          <span class="seg" style="display:flex;margin-top:3px">
            <button data-sex="m" class="${DB.settings.sex==='m'?'sel':''}">M</button>
            <button data-sex="f" class="${DB.settings.sex==='f'?'sel':''}">F</button></span></div>
      </div>
      <div class="note">Enter a weight only when it <b>changes</b> — silence means unchanged, and the app reads back the weight in force on any given day.</div>
      <button class="btn" id="youSave" style="margin-top:8px">Save</button>
    </div>
    <h2>What you train</h2>
    <div class="card">
      <div class="note" style="margin-bottom:8px">Shapes which parts appear in Train and which get
        suggested on Today. <b>Nothing is deleted</b> — a part you switch off keeps every set you
        ever logged, and switching it back on brings the history with it.</div>
      <div class="onbchips" id="myPartsChips">${Object.keys(SEED.catalog).filter(p=>p!=='Run').map(p=>{
        const on=myPartsSet().has(p), n=(trainingPlan().info[p]||{}).days||0;
        return `<button class="onbchip ${on?'sel':''}" data-myp="${p}">${partLabel(p)}${
          n?`<small> · ${n}d</small>`:''}</button>`;}).join('')}</div>
      <div class="note" id="myPartsNote" style="margin-top:8px">${
        (()=>{const off=Object.keys(SEED.catalog).filter(p=>p!=='Run'&&!myPartsSet().has(p));
          return off.length? `Hidden from Train: <b>${off.map(partLabel).join(', ')}</b>.`
                           : 'Every part is in your rotation.';})()}</div>
    </div>
    <h2>Bars</h2>
    <div class="card">
      <div class="row" style="gap:8px">
        <div class="fld" style="flex:1"><label>Barbell (${U()})</label>
          <input id="barW" type="number" inputmode="decimal" step="0.5" value="${wDisp(barSetting('barKg'))}"></div>
        <div class="fld" style="flex:1"><label>Smith bar (${U()})</label>
          <input id="smithW" type="number" inputmode="decimal" step="0.5" value="${wDisp(DB.settings.smithKg??20)}"></div>
      </div>
      <div class="note">Logged weight is the total including the bar, so per-side = (total − bar) ÷ 2. Set the Smith bar to 0 if you log Smith work as plates only.</div>
      <button class="btn" id="barSave" style="margin-top:8px">Save</button>
    </div>
    <h2>Same exercise, two names</h2>
    <div class="card">
      <div class="note" style="margin-bottom:8px">If the same movement got logged under two names, fold one into the other. The app never does this on its own \u2014 only genuinely different movements should stay apart.</div>
      ${mergeUI()}
    </div>
    <h2>Your data</h2>
    <div class="card">
      <!-- v4.6.389: YOUR DATA, SAID PLAINLY. Eight equal buttons read as eight equal choices; there are
           three things to do with your data (take a copy to read, keep a copy to restore, bring old
           workouts in), each a row that says what the file is for. Previews are the maker's tools:
           they show only to the owner. -->
      <p class="data-count">${fmt(Object.keys(DB.days).filter(d=>(DB.days[d].w||[]).length).length)} days on this device. Yours to take anywhere.</p>
      <div class="data-row">
        <div class="data-txt"><b>Export to spreadsheet</b><span>Every set, one row each, in kg and km. Opens in Excel, Numbers or Google Sheets.</span></div>
        <div class="data-acts"><button class="btn ghost" id="expCsv">Download ↓</button><button class="btn ghost" id="expSheet">Copy</button></div>
      </div>
      <div class="data-row">
        <div class="data-txt"><b>Backup</b><span>Everything in one file, for Restore. Only ShowUppp opens it.</span></div>
        <div class="data-acts"><button class="btn ghost" id="expJson">Back up ↓</button><button class="btn ghost" id="impJson">Restore…</button></div>
      </div>
      <input type="file" id="impFile" accept=".json,application/json" hidden>
      ${typeof impSettingsHTML==='function'?impSettingsHTML():''}
      <button type="button" class="data-link" data-tips-again>Show tips again</button>
      ${typeof ownerIs==='function'&&ownerIs()?`<div class="data-owner"><span>Owner previews</span><button type="button" class="data-link" id="d1prev">Day one</button><button type="button" class="data-link" id="milePrev">The ${fmt(Math.ceil((dayCount()+1)/100)*100)} day</button></div>`:''}
    </div>
    <div class="note assetcredits" style="text-align:center;margin-top:5px;opacity:.7">Status icons: <a href="https://thenounproject.com/icon/minus-8363736/" target="_blank" rel="noopener">Minus</a> by ARIPATUT DASUKI · <a href="https://thenounproject.com/icon/trend-2344331/" target="_blank" rel="noopener">Trend</a> by Travis Avery · <a href="https://thenounproject.com/icon/share-2438501/" target="_blank" rel="noopener">Share</a> and <a href="https://thenounproject.com/icon/edit-1751206/" target="_blank" rel="noopener">Edit</a> by Timur Minvaleev · <a href="https://thenounproject.com/icon/ai-7262146/" target="_blank" rel="noopener">Sparkle</a> by Eliricon · <a href="https://thenounproject.com/icon/arrow-1342814/" target="_blank" rel="noopener">Chevron</a> by Barracuda · <a href="https://thenounproject.com/icon/expand-7584001/" target="_blank" rel="noopener">Expand</a> and <a href="https://thenounproject.com/icon/collapse-7584005/" target="_blank" rel="noopener">Collapse</a> by LAFS · Copy by maria icon · Pencil by Alvida Black · Noun Project</div>`;
  clubArrangeSettings();
  void clubLoadMembership();
}


/* ---------- Showing Up Club: cosmetic identity, never authentication ----------
   Account numbers come only from the private server registry. Guests get a
   saved random avatar identity, never a member number. Account creation is
   the only account-since source; an imported workout is NOT a join date.
   clubAvatar/clubGuest use the existing per-key settings sync and backup path.
   Rendering only initializes a missing guest identity after storage has loaded.
   Days follow the app's existing logged-day definition (including imports). */
/* v4.6.314: Pip is a choice too -- first in the line-up, kept apart from the nine so the companion
   dealt to anyone who never chose (a hash over the nine) does not move */
const CLUB_PIP=['pip','Pip',-1,0];
const CLUB_ICONS=[['band','Resistance band',1,0],['plate','Weight plate',1,50],['bell','Kettlebell',0,50],['roller','Foam roller',1,100],['bottle','Water bottle',0,100],['bag','Gym bag',2,0],['ball','Medicine ball',0,0],['mat','Rolled mat',2,50],['headphones','Headphones',2,100]];
const clubOpenGroups=new Set();
// Session-memory cache only: no membership records enter workout sync/backups.
// Key includes backend + user, so switching accounts cannot show another number.
const clubMembershipCache=new Map(),clubMembershipRequests=new Map();
function clubMembershipKey(){return session?.user?.id?cloudCfg().url+'|'+session.user.id:'';}
function clubNumberFormats(raw){
  if(typeof raw!=='string'||!/^(0|[1-9]\d*)$/.test(raw))return null;
  /* v4.6.273: the number as it is -- No 12, not 000012. Your place in the club is the
     point, and an early number is worth showing. Thousands get commas (1,284); the
     copied reference keeps plain digits (SUP-1284). Strings throughout: member_no is a
     bigint and must never pass through Number. */
  const digits=raw.replace(/^0+(?=\d)/,''),number=digits.replace(/\B(?=(\d{3})+(?!\d))/g,',');return {number,reference:'SUP-'+digits,badge:'SUP–'+digits};
}
function clubMembershipFacts(){
  /* v4.6.298: test mode can preview a member number (Tools), so the card and the coin's engraving can be seen */
  const pv=typeof sbxMemberNo==='function'?sbxMemberNo():null;
  if(pv){const id=clubNumberFormats(pv),raw=DB.settings.clubGuest?.since,date=raw?new Date(raw):new Date();return {number:id.number,reference:id.reference,since:Number.isFinite(date.getTime())?date.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase():'—',preview:true};}
  const user=session?.user,m=clubMembershipCache.get(clubMembershipKey());
  const raw=m?.joined_at||user?.created_at||(!user?DB.settings.clubGuest?.since:null),date=raw?new Date(raw):null;
  const id=user?clubNumberFormats(m?.member_no):null;
  return {number:user?(id?.number??'—'):'Guest',reference:id?.reference||'',since:date&&Number.isFinite(date.getTime())?date.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase():'—'};
}
function clubPaintMembership(){
  const f=clubMembershipFacts(),n=document.querySelector('.club-number'),s=document.querySelector('.club-since'),b=document.querySelector('[data-club-copy]');
  if(n)n.textContent=f.number;if(s)s.textContent=f.since;
  const coin=document.querySelector('[data-club-coin]');if(coin){coin.querySelector('.club-coin-number').innerHTML=clubCoinNumberHTML(String(f.number).replace(/,/g,''));coin.setAttribute('aria-label','Flip club coin. Member '+f.number+'. Drag left or right to spin.');}
  if(b){b.disabled=!f.reference;b.setAttribute('aria-label',f.reference?'Copy member reference '+f.reference:'Member number unavailable');b.title=f.reference?'Copy '+f.reference:'Connect to load your member number';}
}
async function clubCopyMembership(){
  const f=clubMembershipFacts();if(!f.reference)return;
  try{await navigator.clipboard.writeText(f.reference);toast('Copied '+f.reference);}
  catch(_){toast('Your member reference: '+f.reference);}
}
/* v4.6.291: WHY "MEMBER No —" AND "SHOWING UP SINCE —" CAME BACK BLANK. The number was fetched
   with the stored access token as it stood. Tokens last an hour, and the iOS app often wakes
   after longer, so the request went out expired, was refused, and the card stayed blank until a
   pull-to-refresh (which renews the token first) and a new visit to Settings. Now: the token is
   renewed before asking (freshToken, as sync does); the last number this device saw for this
   account paints at once and offline (a small per-account note on this device -- not workout
   data, not in sync or backups); and the app asks again when it comes back to the foreground. */
const CLUB_MEM_KEY='showup:club-membership';
function clubMemRemembered(key){try{const o=JSON.parse(localStorage.getItem(CLUB_MEM_KEY)||'null');return o&&o.key===key&&typeof o.member_no==='string'?o:null;}catch(_){return null;}}
function clubMemRemember(key,m){try{localStorage.setItem(CLUB_MEM_KEY,JSON.stringify({key,member_no:m.member_no,joined_at:m.joined_at||null}));}catch(_){}}
async function clubLoadMembership(force){
  const key=clubMembershipKey();if(!key||!session?.access_token||DB.settings.demo)return;
  const paint=()=>{if(key===clubMembershipKey())clubPaintMembership();};
  if(!clubMembershipCache.has(key)){const r=clubMemRemembered(key);if(r){clubMembershipCache.set(key,{member_no:r.member_no,joined_at:r.joined_at,remembered:true});paint();}}
  if(clubMembershipCache.has(key)&&!clubMembershipCache.get(key).remembered&&!force){paint();return;}
  if(clubMembershipRequests.has(key)){await clubMembershipRequests.get(key);paint();return;}
  const cfg=cloudCfg();
  const request=(async()=>{
    /* renewed first when it is about to expire (a session without an expiry is used as is) */
    const token=session?.expires_at&&typeof freshToken==='function'?await freshToken():session?.access_token;
    if(!token||key!==clubMembershipKey())return;
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const r=await fetch(cfg.url+'/rest/v1/rpc/club_membership',{method:'POST',headers:{apikey:cfg.anon,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:controller.signal});
      if(!r.ok)return;
      const rows=await r.json(),m=Array.isArray(rows)&&rows.length===1?rows[0]:null;
      if(m&&typeof m.member_no==='string'&&/^(0|[1-9]\d*)$/.test(m.member_no)){const v={member_no:m.member_no,joined_at:Number.isFinite(Date.parse(m.joined_at))?m.joined_at:null};clubMembershipCache.set(key,v);clubMemRemember(key,v);}
    }catch(_){}finally{clearTimeout(timeout);}
  })();
  clubMembershipRequests.set(key,request);
  try{await request;paint();}finally{clubMembershipRequests.delete(key);}
}
/* back in the foreground with the card still blank (or only remembered): ask again */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'||typeof view==='undefined'||view!=='sync')return;const m=clubMembershipCache.get(clubMembershipKey());if(!m||m.remembered)void clubLoadMembership();});
function clubHash(str){let n=2166136261;for(const c of String(str)) n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function clubEnsureIdentity(){
  if(session?.user?.id||DB.settings.clubGuest||!loadedOK||DB.settings.demo)return;
  const a=new Uint32Array(3);crypto.getRandomValues(a);
  DB.settings.clubGuest={id:Array.from(a,x=>x.toString(16).padStart(8,'0')).join(''),since:new Date().toISOString()};save(true);
}
function clubIdentity(){return session?.user?.id||DB.settings.clubGuest?.id||(DB.settings.demo?'demo-member':'guest');}
/* v4.6.310: ONE ICON IS YOURS; THE REST COME WITH MEMBERSHIP. A non-member (once the paywall is
   live) keeps the companion the app dealt them and sees the others locked; tapping one opens Join
   the club. A choice made as a member is kept, not erased, and comes back when they rejoin. */
const clubChoices=()=>[CLUB_PIP,...CLUB_ICONS];
function clubFreeIcon(){return clubChoices().find(x=>x[0]===DB.settings.companionFree)||CLUB_ICONS[clubHash(clubIdentity())%CLUB_ICONS.length];}  /* v4.6.311: the one you chose at setup, else the one dealt */
function clubIconsLocked(){return typeof paywallLive==='function'&&paywallLive()&&typeof isMember==='function'&&!isMember();}
/* v4.6.311: YOUR COMPANION IN PIP'S PLACE. In your own moments -- Today's hello, tips, the day-done
   count -- the companion you picked stands where Pip stood; one character per screen. Pip stays the
   app's face where it speaks for itself: first run, the icon, the club welcome, shared images.
   Follows the Mascot setting: animated plays the idle, still holds, off shows nothing. */
function companionIsPip(){return !DB.settings.companionName||clubAvatar()[0]==='pip';}
function companionHTML(cls=''){
  if(typeof mascotMode==='function'&&mascotMode()==='off')return '';
  if(companionIsPip())return '';   /* the caller shows Pip, as before */
  const c=clubAvatar(),anim=typeof mascotMode!=='function'||mascotMode()==='animated';
  const moment=cls.includes('su-comp-rest')?'rest':cls.includes('dd-companion')?'medal':'hello';
  return `<span class="su-companion ${cls}" data-companion="${c[0]}" aria-hidden="true">${clubIconHTML(c,anim,moment).replace('club-avatar ','club-avatar club-visible ')}</span>`;
}
function clubAvatar(){if(clubIconsLocked())return clubFreeIcon();const k=DB.settings.clubAvatar;return clubChoices().find(x=>x[0]===k)||clubFreeIcon();}
/* Where each crew stands inside its square art (Sungjee, 2026-10-15): the share of the
   square below the body (the baked shadow lives there), the body's centre, its width, and the
   scale that gives every crew the same visual weight (body area matched).
   Measured from assets/crew/<key>.webp; the 384px animations share the same framing. */
const CREW_FOOT={bag:[.217,.5,.695,0.9],ball:[.193,.516,.578,0.96],band:[.24,.523,.664,1.04],bell:[.182,.5,.508,0.97],bottle:[.201,.506,.363,.99],headphones:[.209,.52,.641,0.89],mat:[.24,.5,.695,1.08],pip:[.338,.498,.535,1.33],plate:[.203,.5,.547,1.0],roller:[.303,.479,.559,1.3]};
function crewFoot(k){return CREW_FOOT[k]||[.22,.5,.6,1];}
function clubIconHTML(item,animated=false,moment='hello'){
  return `<span class="club-avatar crew-avatar club-${item[0]}${animated?' club-animate':''}" data-crew="${item[0]}" data-crew-moment="${moment}" style="--foot:${crewFoot(item[0])[0]};--mid:${crewFoot(item[0])[1]};--fit:${crewFoot(item[0])[3]}" aria-hidden="true"><img class="crew-art${item[0]==='pip'?' club-pip-img':''}" src="assets/crew/${item[0]}${moment==='rest'?'-rest-still':''}.webp" width="384" height="384" alt=""></span>`;
}
// Lazy lifecycle module: no animation state is stored in the user's profile.
if(typeof window!=='undefined'&&typeof IntersectionObserver!=='undefined')import('./crew-motion.js').catch(()=>{});
function clubAvatarEditHTML(item){return clubIconHTML(item,true)+`<span class="club-avatar-edit" aria-hidden="true">${icon('edit',14)}</span>`;}
function clubCoinNumberHTML(number){
  const chars=Array.from(String(number)),size=Math.min(10,74/Math.max(6,chars.length));
  // Keep short numbers together; grow the centered arc only as digits need it.
  const step=Math.min(14,76/Math.max(1,chars.length-1));
  return chars.map((c,i)=>{const a=(i-(chars.length-1)/2)*step,r=a*Math.PI/180;return `<span style="left:${50+Math.sin(r)*33}%;top:${50+Math.cos(r)*33}%;transform:translate(-50%,-50%) rotate(${-a}deg);font-size:${size}cqw">${hesc(c)}</span>`}).join('');
}
function clubCoinHTML(number){
return `<button type="button" class="club-coin-button" data-club-coin aria-label="Flip club coin. Member ${hesc(number)}. Drag left or right to spin." title="Tap to flip · swipe to spin"><span class="club-coin-rotor">${Array.from({length:13},(_,i)=>`<span class="club-coin-rim" style="--depth:${(i-6)*.6}px"></span>`).join('')}<span class="club-coin-face club-coin-front"><span class="club-coin-seal"><img src="assets/club-seal.webp" alt="The Show Up Club" draggable="false"></span></span><span class="club-coin-face club-coin-back"><span class="club-coin-wordmark" role="img" aria-label="ShowUppp"></span><span class="club-coin-number" aria-hidden="true">${clubCoinNumberHTML(number)}</span></span></span></button>`;
}
let clubCoinDispose=()=>{},clubCoinMotion={angle:0,speed:0,idle:true,direction:1};
function clubBindCoin(){
  clubCoinDispose();const el=document.querySelector('[data-club-coin]');if(!el)return;
  const rotor=el.querySelector('.club-coin-rotor'),media=matchMedia('(prefers-reduced-motion: reduce)');
  let {angle,speed,idle,direction}=clubCoinMotion;let frame=0,lastFrame=0,drag=false,lastX=0,lastTime=0,travel=0,suppressClick=false,visible=true;
  const still=()=>media.matches||(typeof mascotMode==='function'&&mascotMode()!=='animated');
function paint(){el.style.setProperty('--coin-shadow-width',Math.max(.08,Math.abs(Math.cos(angle*Math.PI/180))+.08*Math.abs(Math.sin(angle*Math.PI/180))));rotor.style.transform=`rotateY(${angle}deg)`;el.dataset.angle=String(angle);el.style.setProperty('--coin-light',`${125+Math.sin(angle*Math.PI/180)*60}deg`);el.style.setProperty('--coin-reflection',`${Math.sin(angle*Math.PI/180)*55}%`);}
  function stop(){cancelAnimationFrame(frame);frame=0;speed=0;drag=false;angle=Math.round(angle/180)*180;paint();}
  function tick(now){frame=0;if(!el.isConnected||document.hidden||!visible||still()){stop();return;}const dt=Math.min(32,now-lastFrame);lastFrame=now;
    if(idle){angle+=direction*.0225*dt;paint();frame=requestAnimationFrame(tick);return;}
    angle+=speed*dt;speed*=Math.pow(.975,dt/16.67);
    if(Math.abs(speed)<.012){const target=Math.round(angle/180)*180;angle+=(target-angle)*Math.min(1,dt/110);if(Math.abs(target-angle)<.1){angle=target;idle=true;}}
    paint();frame=requestAnimationFrame(tick);
  }
  function start(){if(still()){stop();return;}if(!frame){lastFrame=performance.now();frame=requestAnimationFrame(tick);}}
  el.addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button>0)return;cancelAnimationFrame(frame);frame=0;idle=false;drag=true;speed=0;travel=0;suppressClick=false;lastX=e.clientX;lastTime=performance.now();el.setPointerCapture(e.pointerId);});
  el.addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now(),dx=e.clientX-lastX,dt=Math.max(8,now-lastTime);travel+=Math.abs(dx);if(Math.abs(dx)>.5)direction=Math.sign(dx);angle+=dx*2;speed=Math.max(-3.5,Math.min(3.5,.45*speed+.55*dx*2/dt));lastX=e.clientX;lastTime=now;paint();});
  function release(cancelled=false){if(!drag)return;drag=false;suppressClick=travel>4||cancelled;if(cancelled||performance.now()-lastTime>100)speed=0;if(suppressClick)start();}
  el.addEventListener('pointerup',()=>release());el.addEventListener('pointercancel',()=>release(true));el.addEventListener('lostpointercapture',()=>release(true));
  el.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}idle=false;if(still()){angle=Math.round(angle/180)*180+direction*180;paint();}else{speed=direction*.28;start();}});
  el.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();idle=false;const dir=e.key==='ArrowLeft'?-1:1;direction=dir;if(still()){angle=Math.round(angle/180)*180+dir*180;paint();}else{speed=dir*.28;start();}}});
  const resume=()=>{if(document.hidden||!visible||still())stop();else if(!drag){start();}};
  document.addEventListener('visibilitychange',resume);media.addEventListener('change',resume);
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;el.classList.toggle('club-coin-visible',visible);resume();});observer?.observe(el);el.classList.add('club-coin-visible');
  clubCoinDispose=()=>{clubCoinMotion={angle,speed,idle,direction};cancelAnimationFrame(frame);frame=0;observer?.disconnect();document.removeEventListener('visibilitychange',resume);media.removeEventListener?.('change',resume);};paint();resume();
}
function clubCardHTML(){
  const avatar=clubAvatar(),user=session?.user,{number:displayNumber,since,reference}=clubMembershipFacts();
  const dark=document.documentElement.dataset.theme==='dark';
  return `<section class="card club-card" aria-label="Your Showing Up Club profile">
    <div class="club-brand"><img src="assets/showuppp-wordmark-${dark?'dark':'light'}.svg" alt="ShowUppp">${typeof isMember!=='function'||isMember()?clubCoinHTML(String(displayNumber).replace(/,/g,'')):''}</div>
    <div class="club-person"><button type="button" class="club-avatar-button" data-club-picker aria-label="Edit profile icon" aria-expanded="false">${clubAvatarEditHTML(avatar)}</button><div class="club-identity"><div class="club-name-row"><h2>${hesc(DB.settings.name||'Your place in the club')}</h2>${(()=>{const t=userMedals().at(-1);return t?`<span class="club-name-medal" title="${t[2]}">${medalSVG(t[1],22)}</span>`:'';})()}<button type="button" class="club-profile-edit" data-club-edit aria-label="Edit profile" title="Edit profile">${icon('edit',16)}</button></div>
    <button type="button" class="club-member-id" data-club-copy ${reference?'':'disabled'} aria-label="${reference?'Copy member reference '+reference:'Member number unavailable'}" title="${reference?'Copy '+reference:'Connect to load your member number'}"><span class="club-member-label">${user||(typeof sbxMemberNo==='function'&&sbxMemberNo())?(typeof isMember!=='function'||isMember()?'MEMBER ':'')+'N<span class="club-number-o">o</span>':'LOCAL PROFILE'}</span><strong class="club-number">${displayNumber}</strong></button></div></div>
    <div class="club-membership">
    <div class="club-facts"><div><span>${user||(typeof sbxMemberNo==='function'&&sbxMemberNo())?'SHOWING UP SINCE':'ON THIS DEVICE SINCE'}</span><strong class="club-since">${since}</strong></div><button type="button" data-club-history aria-label="View your logged workout days"><span>DAYS TRAINED</span><strong>${fmt(loggedDays())}</strong></button></div></div>
    ${userMedalsHTML()}
    <div class="club-picker" hidden><div class="club-picker-heading"><b>${crewState()?'Your crew':'Make it yours.'}</b><button type="button" class="club-text-button" data-club-close>Done</button></div><div class="club-icon-grid" role="group" aria-label="Profile icons">${(()=>{const lockAll=clubIconsLocked(),free=clubFreeIcon()[0];return clubChoices().map(i=>{const locked=lockAll&&i[0]!==free;return `<button type="button" data-club-icon="${i[0]}" aria-pressed="${i[0]===avatar[0]}"${locked?` class="club-locked" aria-label="${i[1]}, for members"`:''}>${clubIconHTML(i,i[0]===avatar[0])}${(()=>{const cr=crewState(),m=cr&&cr[i[0]];if(!m)return `<span>${i[1]}</span>`;return `<span class="crew-name">${hesc(m.name)}</span>${i[0]===avatar[0]?'<small class="crew-days">With you</small>':'<small class="crew-days crew-days-slot" aria-hidden="true">With you</small>'}`;})()}${locked?`<i class="club-lock" aria-hidden="true">${icon('lock',ICON_SZ.sm)}</i>`:''}</button>`;}).join('');})()}</div>${clubIconsLocked()?`<p class="note club-lock-note">The ${hesc(clubFreeIcon()[1].toLowerCase())} is yours. Members pick any of the ${({9:'nine',10:'ten',11:'eleven',12:'twelve'})[clubChoices().length]||clubChoices().length}. <button type="button" class="club-text-button" data-mb-open>Join the club</button></p>`:crewState()?`<div class="crew-confirm" hidden></div><p class="note">Your crew keeps their names. Your medals are yours, whoever comes along. <button type="button" class="club-text-button" data-crew-rename>Rename ${hesc(companionName())}</button></p>`:'<p class="note">One little companion. Your choice stays with your profile.</p>'}</div>
  </section>`;
}
/* Move existing nodes, not copies: every established control, ID and handler
   survives. Unknown/new Settings sections stay visible rather than disappearing. */
let clubKeepPicker=false,clubPickerOpen=false;   /* v4.6.325: an open picker survives a background re-render of Settings */
function clubArrangeSettings(){
  const host=document.getElementById('view');if(!host||!host.querySelector('.club-card')||host.querySelector('.club-settings-groups'))return;
  const groups=[['profile','Profile','Name & body details',['You']],['appearance','Appearance','Theme, units & week',['Display','Week starts on','Text size']],['training','Training','Feedback & planning',['Workout feedback','Planning','Holding weight','Avoided exercises','What you train','Bars','Same exercise, two names']],['connections','Connections','Health & reminders',['Reminders','Apple Health']],['account','Account & data','Membership, sign-in & backups',['Membership','Account & cloud sync','Your data']]];
  const wrap=document.createElement('div');wrap.className='club-settings-groups';host.querySelector('.club-card').after(wrap);
  for(const [key,title,sub,headings] of groups){const nodes=[];for(const h of Array.from(host.children).filter(n=>n.tagName==='H2'&&headings.includes(n.textContent.trim()))){nodes.push(h);let n=h.nextElementSibling;while(n&&n.tagName!=='H2'&&!n.classList.contains('assetcredits')){const next=n.nextElementSibling;nodes.push(n);n=next;}}
    if(!nodes.length)continue;const d=document.createElement('details');d.className='club-settings-group';d.dataset.clubGroup=key;d.open=clubOpenGroups.has(key);const s=document.createElement('summary');s.innerHTML=`<span><b>${title}</b><small>${sub}</small></span><span class="club-chev" aria-hidden="true">${icon('chevron',ICON_SZ.md)}</span>`;d.append(s);const content=document.createElement('div');content.className='club-group-content';nodes.forEach(n=>content.append(n));d.append(content);d.addEventListener('toggle',()=>{if(d.open)clubOpenGroups.add(key);else clubOpenGroups.delete(key)});wrap.append(d);
  }
  if(clubKeepPicker||clubPickerOpen){clubKeepPicker=false;clubPickerOpen=true;const pk=host.querySelector('.club-picker');if(pk){pk.hidden=false;host.querySelector('.club-avatar-button')?.setAttribute('aria-expanded','true');}}
  clubObserveMotion();
  clubBindCoin();
}
let clubMotionObserver;
function clubObserveMotion(){
  clubMotionObserver?.disconnect();if(typeof IntersectionObserver==='undefined')return;
  clubMotionObserver=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('club-visible',e.isIntersecting)),{threshold:.1});document.querySelectorAll('.club-avatar').forEach(e=>clubMotionObserver.observe(e));
  document.documentElement.classList.toggle('club-page-hidden',document.hidden);
  document.querySelector('.club-card')?.classList.toggle('club-still',typeof mascotMode==='function'&&mascotMode()!=='animated');
}
document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('club-page-hidden',document.hidden));
document.addEventListener('click',e=>{
  const cb=e.target.closest?.('[data-crew-go],[data-crew-stay],[data-crew-rename]');
  if(cb){const box=cb.closest('.club-picker')?.querySelector('.crew-confirm');
    if(cb.dataset.crewGo){crewSwitch(cb.dataset.crewGo);clubKeepPicker=true;renderSync();return;}
    if(cb.hasAttribute('data-crew-stay')){box.hidden=true;return;}
    if(cb.hasAttribute('data-crew-rename')){const k=clubAvatar()[0],c=crewState();box.innerHTML=`<p>A new name for your companion</p><input class="crew-rename-in" maxlength="16" value="${hesc(c[k].name)}"><div class="crew-confirm-btns"><button type="button" class="btn ghost" data-crew-stay>Cancel</button><button type="button" class="btn" data-crew-save>Save</button></div>`;box.hidden=false;box.querySelector('input').focus();return;}}
  const sv=e.target.closest?.('[data-crew-save]');
  if(sv){const v=sv.closest('.crew-confirm').querySelector('input').value.trim();if(v){const k=clubAvatar()[0];crewState()[k].name=v;DB.settings.companionName=v;DB.settingsAt=Date.now();save(true);}clubKeepPicker=true;renderSync();return;}
  const b=e.target.closest?.('[data-club-picker],[data-club-close],[data-club-icon],[data-club-edit],[data-club-history],[data-club-copy]');if(!b)return;
  if(b.hasAttribute('data-club-copy')){void clubCopyMembership();return;}
  const card=b.closest('.club-card'),picker=card?.querySelector('.club-picker');
  if(b.hasAttribute('data-club-picker')||b.hasAttribute('data-club-close')){picker.hidden=b.hasAttribute('data-club-close')||!picker.hidden;clubPickerOpen=!picker.hidden;card.querySelector('.club-avatar-button').setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden)picker.querySelector('[aria-pressed=true]').focus();else card.querySelector('.club-avatar-button').focus();return;}
  if(b.dataset.clubIcon&&b.classList.contains('club-locked')){if(typeof paywallOpen==='function')paywallOpen('icon');return;}
  /* v4.6.325: tapping the one already chosen again is the choice -- the picker closes as Done would (Sungjee, 2026-10-15) */
  if(b.dataset.clubIcon&&b.dataset.clubIcon===clubAvatar()[0]&&b.getAttribute('aria-pressed')==='true'){picker.hidden=true;clubPickerOpen=false;const ab=card.querySelector('.club-avatar-button');ab.setAttribute('aria-expanded','false');ab.focus({preventScroll:true});
    /* v4.6.327: and the page rises to the top, so the membership card with your new companion is in view (Sungjee, 2026-10-15) */
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  if(b.dataset.clubIcon&&crewState()&&b.dataset.clubIcon!==clubAvatar()[0]&&!b.classList.contains('club-locked')){crewSwitch(b.dataset.clubIcon);clubKeepPicker=true;renderSync();return;}
  if(b.dataset.clubIcon){const item=clubChoices().find(x=>x[0]===b.dataset.clubIcon);if(!item)return;DB.settings.clubAvatar=item[0];save(true);card.querySelector('.club-avatar-button').innerHTML=clubAvatarEditHTML(item);picker.querySelectorAll('[data-club-icon]').forEach(x=>{const on=x.dataset.clubIcon===item[0];x.setAttribute('aria-pressed',String(on));x.querySelector('.club-avatar').classList.toggle('club-animate',on)});clubObserveMotion();return;}
  if(b.hasAttribute('data-club-edit')){const g=document.querySelector('[data-club-group="profile"]');if(g){g.open=true;clubOpenGroups.add('profile');document.getElementById('youName')?.focus()}return;}
  if(b.hasAttribute('data-club-history')){view='history';lastView=null;render();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const card=document.querySelector('.club-card'),p=card?.querySelector('.club-picker');if(p&&!p.hidden){p.hidden=true;clubPickerOpen=false;card.querySelector('.club-avatar-button').setAttribute('aria-expanded','false');card.querySelector('.club-avatar-button').focus()}}});

/* ---------- v3.3: data out ---------- */
const EXP_HEAD=['date','part','exercise','weight_kg','reps','set_no','mins','secs','distance_km'];
function exportRows(){
  const out=[];
  for(const d of Object.keys(DB.days).sort()){
    for(const s of (DB.days[d].w||[])){
      if(s.ex==='Run') out.push([d,'Run','Run','','','',s.mins||0,s.secs||0,s.w||0]);
      /* v4.6.108: every cardio row exports as distance and time. It used to fall
         into the set branch below and leave with its minutes and seconds dropped. */
      else if(isCardio(s)) out.push([d,s.part||'Run',s.ex,'','','',s.mins||0,s.secs||0,s.w||0]);
      else (s.reps&&s.reps.length?s.reps:[0]).forEach((r,i)=>out.push([d,s.part||'',s.ex||'',s.w??'',r,i+1,'','','']));
    }
  }
  return out;
}
function tableText(sep){
  const esc=v=>{v=String(v);return sep===','&&/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  return [EXP_HEAD.join(sep)].concat(exportRows().map(r=>r.map(esc).join(sep))).join('\n');
}
function dlFile(name,mime,text){
  try{
    const b=new Blob([text],{type:mime});
    if(navigator.canShare){
      const f=new File([b],name,{type:mime});
      if(navigator.canShare({files:[f]})){ navigator.share({files:[f]}).catch(()=>{}); return; }
    }
    const a=document.createElement('a');
    a.href=(URL.createObjectURL?URL.createObjectURL(b):'data:'+mime+';charset=utf-8,'+encodeURIComponent(text));
    a.download=name; a.click();
    if(URL.createObjectURL) setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){ toast('Export failed on this device'); }
}
/* v3.3.191: merge is USER-INITIATED and shaped like the destructive action
   it is — pick two, read a plain sentence about what happens, confirm. The
   confirm is honest that it does not un-merge: re-splitting is not built,
   and a reassuring word here would be a lie the record pays for. */
let _mg={from:'',to:''};
function mergeUI(){
  const ids=Object.keys(canon()).sort((a,b)=>canonName(a).localeCompare(canonName(b)));
  if(ids.length<2) return `<div class="note">Nothing to merge yet.</div>`;
  const opt=(sel,skip)=>ids.filter(i=>i!==skip)
    .map(i=>`<option value="${i}" ${i===sel?'selected':''}>${canonName(i)}</option>`).join('');
  const n=_mg.from?canonSets(_mg.from):0;
  return `<select id="mgFrom" class="rzsel"><option value="">Fold this\u2026</option>${opt(_mg.from,_mg.to)}</select>
    <select id="mgTo" class="rzsel" style="margin-top:6px"><option value="">\u2026into this</option>${opt(_mg.to,_mg.from)}</select>
    ${_mg.from&&_mg.to?`<div class="note" style="margin-top:8px">${fmt(n)} set${n===1?'':'s'} will move to \u201c${canonName(_mg.to)}\u201d, and \u201c${canonName(_mg.from)}\u201d will become another name for it. There is no un-merge \u2014 you would have to re-log or restore a backup.</div>
    <button class="btn ghost" id="mgGo" style="margin-top:8px">Fold \u201c${canonName(_mg.from)}\u201d in</button>`:''}`;
}
function canonSets(id){
  let n=0;
  for(const d of Object.values(DB.days))
    for(const s2 of (d.w||[])) if(s2.cid===id) n+=(s2.reps||[]).length||1;
  return n;
}
async function copyForSheets(){
  const t=tableText('\t');
  try{ await navigator.clipboard.writeText(t); toast('Copied — paste into a blank Google Sheet'); }
  catch(e){
    try{
      const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
      toast('Copied — paste into a blank Google Sheet');
    }catch(e2){ toast('Copy failed — use CSV instead'); }
  }
}
function restoreBackup(file){
  if(DB.settings.demo){ toast('Exit the demo first'); return; }
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const j=JSON.parse(rd.result);
      const doc=j.doc||j;
      if(!doc||typeof doc.days!=='object') throw 0;
      const mine=Object.keys(DB.days).filter(d=>(DB.days[d].w||[]).length).length;
      const theirs=Object.keys(doc.days).filter(d=>(doc.days[d].w||[]).length).length;
      if(!confirm(`Replace the data on this device with this backup?\n\nThis device: ${mine} days → backup: ${theirs} days.\n\nA safety copy of current data is kept locally, and the restored data will sync to the cloud as the newest version.`)) return;
      bakStore.put('prerestore', JSON.stringify(DB));   // v4.6.349: IndexedDB -- a full localStorage made this throw
      if(durable.available()) durable.writeBak('prerestore', JSON.stringify(DB)).catch(()=>{});   // v4.6.106
      allowEmptySave=true;                                                                          // a restore replaces the record on purpose
      doc.settings=doc.settings||{};
      if(DB.settings.cloud&&!doc.settings.cloud) doc.settings.cloud=DB.settings.cloud;   // keep this device's DB config
      const now=Date.now();
      for(const d of Object.keys(doc.days)) doc.days[d].upd=now;                          // restore wins LWW everywhere
      DB=doc; save();
      toast('Restored — reloading');
      setTimeout(()=>{ try{location.reload();}catch(e){} },600);
    }catch(e){ toast('Not a ShowUppp backup file'); }
  };
  rd.readAsText(file);
}
document.addEventListener('click',e=>{
  /* v3.3.88: closest(), never e.target.id — a button that gains a child at
     runtime silently dies (v3.3.58, real lost sets). These are the Backup/
     Restore buttons the whole import pipeline funnels through. */
  const hit=id=>!!(e.target.closest&&e.target.closest('#'+id));
  if(hit('d1prev')){ d1.preview=true; d1.step=0; d1.part=null; view='today'; render(); return; }
  /* v3.3.424: nowrite=true, so no stamp is written and the real century still
     fires when it arrives. forceMile carries the number so the beat plays. */
  if(hit('milePrev')){ const c=Math.ceil((dayCount()+1)/100)*100; celebrateDayDone(true,c,c); return; }
  if(hit('expCsv')){ dlFile('showup-export-'+todayISO+'.csv','text/csv',tableText(',')); return; }
  if(hit('expSheet')){ copyForSheets(); return; }
  if(hit('mgGo')){
    const from=_mg.from,to=_mg.to; if(!from||!to) return;
    const moved=canonMerge(from,to);
    _mg={from:'',to:''};
    SEED=deriveAll(); _fireDist=null;
    toast(`${fmt(moved)} set${moved===1?'':'s'} moved to ${canonName(to)}`);
    render(); return;
  }
  if(hit('expJson')){ dlFile('showup-backup-'+todayISO+'.json','application/json',
    JSON.stringify({app:'showup',v:APP_VERSION,exported:new Date().toISOString(),doc:DB})); return; }
  if(hit('impJson')){ const i=document.getElementById('impFile'); if(i) i.click(); return; }
  const hb=e.target.closest&&e.target.closest('[data-hl]');   // v4.6.132
  if(hb){ const on=hb.dataset.hl==='on'; if(on!==hlPrefs().on) healthToggle(on).then(()=>renderSync()); return; }
  const rb=e.target.closest&&e.target.closest('[data-rem]');   // v4.6.118
  if(rb){ const on=rb.dataset.rem==='on'; if(on!==remPrefs().on) remToggle(on).then(()=>renderSync()); return; }
});
document.addEventListener('change',e=>{
  if(e.target&&e.target.id==='remMorning'){ remSetMorning(e.target.value); return; }   // v4.6.118
  if(e.target&&(e.target.id==='mgFrom'||e.target.id==='mgTo')){
    _mg[e.target.id==='mgFrom'?'from':'to']=e.target.value; render(); return;
  }
  if(e.target.id==='impFile'&&e.target.files&&e.target.files[0]){
    restoreBackup(e.target.files[0]); e.target.value='';
  }
});

/* v4.6.174: AVOIDED EXERCISES, the review list. Only what you avoid -- Go-to
   already shows what you reach for. Shown once there is something in it;
   each row says where the exercise lives and what it works, and Include
   brings it back. */
/* v4.6.194: the exercises whose weight you hold, with the weight and since when; Progress releases one */
function holdingCardHTML(){
  const rows=Object.entries(DB.settings.exHold||{}).map(([id,e])=>{const ex=canonName(id),part=homePartOf(ex)||(SEED.ex2part||{})[ex]||'',m=part?exMuscle(ex,part):'',hw=heldW(ex);
      return {ex,part,m,hw,at:(e&&e.at)||0};}).sort((a,b)=>b.at-a.at||a.ex.localeCompare(b.ex));
  if(!rows.length) return '';
  const since=t=>t?' · since '+new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
  const at=r=>r.hw==null?'':r.hw>0?` · at ${isBody(r.ex)?'BW+':''}${trainListWeight(r.hw)} ${U()}`:' · at bodyweight';
  return `<h2>Holding weight</h2>
    <div class="card xp-list">${rows.map(r=>`<div class="xp-item"><span><strong>${XH_ICON}${hesc(r.ex)}</strong><small>${hesc([partLabel(r.part),r.m&&r.m!=='unassigned'?(MUSCLE_LABEL[r.m]||r.m):''].filter(Boolean).join(' · ')+at(r))}${since(r.at)}</small></span><button type="button" class="btn ghost" data-xh-progress="${hesc(r.ex)}">Progress</button></div>`).join('')}
      <p class="note">Plans and suggestions keep these at the weight shown. Release one here, or from its own screen in Train.</p></div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-xh-progress]');if(!b)return;
  setExHold(b.dataset.xhProgress,false);save(true);toast(`${b.dataset.xhProgress} progresses again`);renderSync();
});
function avoidedCardHTML(){
  const all=(DB.settings.exPref)||{},rows=Object.entries(all).filter(([,e])=>e&&e.v==='avoid')
    .map(([id,e])=>{const ex=canonName(id),part=homePartOf(ex)||(SEED.ex2part||{})[ex]||'',m=part?exMuscle(ex,part):'';return {ex,part,m,at:e.at||0};})
    .sort((a,b)=>b.at-a.at||a.ex.localeCompare(b.ex));
  if(!rows.length) return '';
  const since=t=>t?' · since '+new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'';
  return `<h2>Avoided exercises</h2>
    <div class="card xp-list">${rows.map(r=>`<div class="xp-item"><span><strong>${XP_ICON}${hesc(r.ex)}</strong><small>${hesc([partLabel(r.part),r.m&&r.m!=='unassigned'?(MUSCLE_LABEL[r.m]||r.m).replace(/^mid \/ lower /,''):''].filter(Boolean).join(' · '))}${since(r.at)}</small></span><button type="button" class="btn ghost" data-xp-include="${hesc(r.ex)}">Include</button></div>`).join('')}
      <p class="note">They stay in your history and keep counting. Plans and suggestions leave them out and pick another lift for the same muscle. Avoid any exercise from its own screen in Train.</p></div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-xp-include]');if(!b)return;
  setExPref(b.dataset.xpInclude,null);save(true);toast(`${b.dataset.xpInclude} included again`);renderSync();
});

/* ================= v4.6.274: BRING YOUR WORKOUTS =====================================
   A new member who logged somewhere else should not start from zero. This reads
   the CSV that Strong and Hevy export (and ShowUppp's own one-row-per-set
   template), shows what it found, asks only about what it cannot decide, and
   writes nothing until Import. Four rules:
   1. NOTHING IS SAVED BEFORE IMPORT. Parsing, matching and review live in `imp`.
   2. EXISTING DAYS STAY. A date you already logged is a "possible duplicate":
      keep yours (default) or add the imported workout beside it.
   3. ONE BATCH, ONE UNDO. Every imported set carries imp:<batch id>; Undo removes
      exactly those sets and nothing else, from the done screen or Settings.
   4. NAMES MATCH OR ASK. An exact or unambiguous name lands on the catalog
      exercise; a near miss is shown with its best guess to confirm or change;
      anything else is kept under its own name in the body part it most likely
      belongs to (asked when there is no telling). Imported exercises join your
      own exercises, so nothing is ever dropped.
   Weights are stored in kg as everywhere (lb / LB); distances in km. */
let imp=null;
const IMP_EQUIP=new Set(['barbell','dumbbell','cable','machine','smith','bodyweight','band','ez','bar','kettlebell','plate','lever','weighted','assisted','straight','rope','flat','seated','standing']);
const IMP_ALIAS={
 'bench press (smith machine)':'Flat Smith Machine Bench Press','incline bench press (smith machine)':'Incline Smith Machine Bench Press',
 'chest press (machine)':'Machine Chest Press','chest dip':'Dip','triceps dip':'Bench Dip','bench dip':'Bench Dip','dips':'Dip',
 'bent over row (barbell)':'Bent-Over Row','barbell row':'Bent-Over Row','seated row (cable)':'Seated Cable Row','seated cable row - v grip (cable)':'Seated Cable Row',
 'bent over one arm row (dumbbell)':'Single-Arm Dumbbell Row','dumbbell row':'Single-Arm Dumbbell Row','single arm row (dumbbell)':'Single-Arm Dumbbell Row',
 'shrug (barbell)':'Barbell Shrug','t bar row':'T-Bar Row','straight arm pulldown (cable)':'Straight-Arm Pulldown',
 'overhead press (barbell)':'Overhead Barbell Press','shoulder press (barbell)':'Overhead Barbell Press','strict military press (barbell)':'Overhead Barbell Press','military press':'Overhead Barbell Press',
 'overhead press (dumbbell)':'Dumbbell Shoulder Press','shoulder press (dumbbell)':'Dumbbell Shoulder Press','seated overhead press (dumbbell)':'Dumbbell Shoulder Press',
 'shoulder press (machine)':'Machine Shoulder Press','overhead press (machine)':'Machine Shoulder Press','lateral raise (cable)':'Cable Lateral Raise',
 'front raise (dumbbell)':'Dumbbell Front Raise','reverse fly (dumbbell)':'Rear Deltoids','rear delt reverse fly (dumbbell)':'Rear Deltoids','reverse fly (machine)':'Reverse Pec Deck','rear delt reverse fly (machine)':'Reverse Pec Deck',
 'lunge (dumbbell)':'Dumbbell Lunge','lunge':'Dumbbell Lunge','romanian deadlift (dumbbell)':'Romanian Deadlift','calf raise (standing)':'Standing Calf Raise','calf raise (seated)':'Seated Calf Raise',
 'bicep curl (barbell)':'Barbell Curl','bicep curl (dumbbell)':'Dumbbell Curl','bicep curl (cable)':'Cable Curl','bicep curl (ez bar)':'EZ Bar Curl','ez bar biceps curl':'EZ Bar Curl','incline curl (dumbbell)':'Incline Dumbbell Curl',
 'triceps pushdown (cable - straight bar)':'Triceps Pushdown','triceps pushdown':'Triceps Pushdown','triceps rope pushdown':'Rope Pushdown','skullcrusher (barbell)':'Skull Crusher','skullcrusher (dumbbell)':'Skull Crusher','skullcrusher (ez bar)':'Skull Crusher',
 'triceps extension (dumbbell)':'Overhead Triceps Extension','overhead triceps extension (cable)':'Overhead Cable Extension','triceps extension (cable)':'Overhead Cable Extension','triceps kickback (dumbbell)':'Dumbbell Kickback','close grip bench press (barbell)':'Close Grip Bench Press',
 'crunch (cable)':'Cable Crunch','cable crunch':'Cable Crunch','ab wheel':'Ab Wheel Rollout','hanging knee raise':'Hanging Leg Raise','lying leg raise':'Leg Raise',
 'running':'Run','running (treadmill)':'Run','treadmill':'Run','outdoor run':'Run','walking':'Walk','cycling':'Cycling','cycling (indoor)':'Cycling','stationary bike':'Cycling','bike':'Cycling',
 'rowing (machine)':'Rowing','rowing machine':'Rowing','elliptical (machine)':'Elliptical','elliptical trainer':'Elliptical','stair machine':'Stair Climber','stairmaster':'Stair Climber','stair climber (machine)':'Stair Climber','swimming':'Swimming','jump rope':'Jump Rope','skipping':'Jump Rope'
};
const IMP_PART_WORDS=[['Run',/\b(run|jog|walk|cycl|bike|row(ing)? machine|elliptical|stair|swim|rope|treadmill|cardio)/],['Sixpack',/\b(ab|abs|crunch|plank|sit ?up|core|oblique|leg raise|knee raise|twist|hollow|v up)/],
 ['Biceps',/\bcurl\b(?!.*leg)/],['Triceps',/(tricep|pushdown|skull|kickback|dip\b|extension(?!.*leg))/],['Legs',/(squat|lunge|leg|calf|hip thrust|glute|deadlift|step up|hamstring|quad|adduct|abduct)/],
 ['Back',/(row|pull ?up|chin ?up|pulldown|lat\b|shrug|back ext|rack pull|good morning|pullover)/],['Shoulder',/(shoulder|lateral|front raise|rear delt|overhead press|military|arnold|face pull|upright row|delt)/],
 ['Chest',/(bench|chest|fly|flye|push ?up|pec|crossover)/]];
function impTokens(name){
  const s=' '+String(name||'').toLowerCase().replace(/\bdb\b/g,'dumbbell').replace(/\bbb\b/g,'barbell').replace(/e-?z[\s-]*bar/g,'ez').replace(/pull[\s-]?ups?\b/g,'pull up').replace(/chin[\s-]?ups?\b/g,'chin up').replace(/push[\s-]?ups?\b/g,'push up').replace(/sit[\s-]?ups?\b/g,'sit up').replace(/skull ?crushers?/g,'skull crusher').replace(/\bbiceps?\b/g,' ').replace(/\btriceps?\b/g,'triceps').replace(/[^a-z0-9 ]+/g,' ')+' ';
  return s.split(/\s+/).filter(Boolean).map(t=>t.length>3&&/(ss|sh|ch|x)es$/.test(t)?t.slice(0,-2):t.length>3&&/[^s]s$/.test(t)?t.slice(0,-1):t);
}
function impKnown(){
  const out=new Map();
  for(const [p,l] of Object.entries(SEED0.catalog))for(const ex of l)out.set(ex,p);
  for(const [ex,v] of Object.entries(typeof customs==='function'?customs():{}))if(v&&v.part)out.set(ex,v.part);
  for(const d of Object.values(DB.days||{}))for(const e of (d&&d.w)||[])if(e.ex&&e.part&&!out.has(e.ex))out.set(e.ex,e.part);
  return [...out].map(([ex,part])=>({ex,part,t:impTokens(ex)}));
}
function impGuessPart(name){const s=String(name).toLowerCase();for(const [p,re] of IMP_PART_WORDS)if(re.test(s))return p;return null;}
/* -> {ex,part,state:'sure'|'ask'|'new',alts:[ex...]} */
function impMatch(name,known){
  const key=canonKey(name);
  const exact=known.find(k=>canonKey(k.ex)===key);if(exact)return {ex:exact.ex,part:exact.part,state:'sure',alts:[]};
  const al=IMP_ALIAS[key];if(al){const k=known.find(x=>x.ex===al);if(k)return {ex:k.ex,part:k.part,state:'sure',alts:[]};}
  const t=impTokens(name),T=new Set(t),core=t.filter(x=>!IMP_EQUIP.has(x)).sort().join(' '),eqp=t.filter(x=>IMP_EQUIP.has(x));
  const same=known.filter(k=>k.t.length===T.size&&k.t.every(x=>T.has(x)));
  if(same.length===1)return {ex:same[0].ex,part:same[0].part,state:'sure',alts:[]};
  const coreHit=known.filter(k=>k.t.filter(x=>!IMP_EQUIP.has(x)).sort().join(' ')===core&&k.t.filter(x=>IMP_EQUIP.has(x)).every(x=>eqp.includes(x)));
  if(coreHit.length===1&&core)return {ex:coreHit[0].ex,part:coreHit[0].part,state:'sure',alts:[]};
  const scored=known.map(k=>{const K=new Set(k.t),inter=k.t.filter(x=>T.has(x)).length,uni=new Set([...k.t,...t]).size,coreOv=k.t.filter(x=>!IMP_EQUIP.has(x)&&T.has(x)).length;return {k,s:coreOv?inter/uni+(core==='press'&&/shoulder|overhead/i.test(k.ex)?0.2:0):0};}).filter(x=>x.s>=0.34).sort((a,b)=>b.s-a.s);   // a bare "press" is a shoulder press far more often than a bench
  if(scored.length)return {ex:scored[0].k.ex,part:scored[0].k.part,state:'ask',alts:scored.slice(1,5).map(x=>x.k.ex)};
  return {ex:null,part:impGuessPart(name),state:'new',alts:[]};
}
function impCSV(text){
  text=String(text||'').replace(/^﻿/,'');
  const first=text.split(/\r?\n/)[0]||'',delim=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true;else if(c===delim){row.push(f);f='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(f);f='';if(row.some(x=>x!==''))rows.push(row);row=[];}else f+=c;}
  row.push(f);if(row.some(x=>x!==''))rows.push(row);return rows;
}
const IMP_MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
function impDate(s){
  s=String(s||'').trim();let m;
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)))return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||12),+(m[5]||0),+(m[6]||0));
  if((m=s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})/)))return new Date(+m[3],IMP_MON[m[2].toLowerCase()],+m[1],+m[4],+m[5]);
  if((m=s.match(/^([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4})(?:,? (\d{1,2}):(\d{2})\s*([AP]M)?)?/i))){let h=+(m[4]||12);if(m[6]){h=h%12+(/p/i.test(m[6])?12:0);}return new Date(+m[3],IMP_MON[m[1].toLowerCase()],+m[2],h,+(m[5]||0));}
  if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)))return new Date(+m[3],+m[1]-1,+m[2],12);
  const t=Date.parse(s);return Number.isFinite(t)?new Date(t):null;
}
const impISO=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const impNum=v=>{const n=parseFloat(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0;};
/* -> {src,sets:[{iso,t,wk,name,w,unit,reps,secs,dist,dunit}],unitKnown} or {error} */
function impParse(text){
  const rows=impCSV(text);if(rows.length<2)return {error:'This file has no workouts in it.'};
  const H=rows[0].map(h=>h.trim().toLowerCase()),col=n=>H.indexOf(n),has=(...n)=>n.every(x=>col(x)>=0);
  const sets=[];let src,unitKnown=false;
  if(has('exercise_title','start_time')){src='Hevy';unitKnown=true;
    const wk=col('weight_kg'),wl=col('weight_lbs'),dk=col('distance_km'),dm=col('distance_miles');
    for(const r of rows.slice(1)){const d=impDate(r[col('start_time')]);if(!d)continue;
      sets.push({iso:impISO(d),t:d.getTime(),wk:r[col('start_time')]+'|'+(r[col('title')]||''),name:r[col('exercise_title')],idx:impNum(r[col('set_index')]),
        w:wk>=0?impNum(r[wk]):impNum(r[wl]),unit:wk>=0?'kg':'lb',reps:impNum(r[col('reps')]),secs:impNum(r[col('duration_seconds')]),dist:dk>=0?impNum(r[dk]):impNum(r[dm]),dunit:dk>=0?'km':'mi'});}}
  else if(has('date','exercise name','reps')){src='Strong';
    /* Strong names the unit in the header ("Weight (kg)", "Distance (km)") in current exports, in a
       column ("Weight Unit") in some older ones, and not at all in others -- then the review asks */
    const wc=H.findIndex(h=>/^weight\b(?! unit)/.test(h)),dc=H.findIndex(h=>/^distance\b(?! unit)/.test(h)),hu=(H[wc]||'').match(/\((kg|lbs?)\)/),hd=(H[dc]||'').match(/\((km|mi|miles|m)\)/);
    const wu=col('weight unit'),du=col('distance unit');unitKnown=wu>=0||!!hu;
    for(const r of rows.slice(1)){const d=impDate(r[col('date')]);const name=(r[col('exercise name')]||'').trim();if(!d||!name||/rest timer/i.test(name))continue;
      const u=wu>=0?(/lb/i.test(r[wu])?'lb':'kg'):hu?(/lb/.test(hu[1])?'lb':'kg'):null;
      const dist=impNum(r[dc]),dunit=du>=0?(/mi/i.test(r[du])?'mi':'km'):hd?(/^mi/.test(hd[1])?'mi':hd[1]==='m'?'m':'km'):(u==='lb'?'mi':u?'km':null);
      sets.push({iso:impISO(d),t:d.getTime(),wk:r[col('date')]+'|'+(r[col('workout name')]||''),name,idx:impNum(r[col('set order')]),
        w:impNum(r[wc]),unit:u,reps:impNum(r[col('reps')]),secs:impNum(r[col('seconds')]),dist:dunit==='m'?dist/1000:dist,dunit:dunit==='m'?'km':dunit});}}
  else if(has('date','exercise')&&(col('reps')>=0||col('weight')>=0)){src='your spreadsheet';
    const u=col('unit');unitKnown=u>=0;
    for(const r of rows.slice(1)){const d=impDate(r[col('date')]);const name=(r[col('exercise')]||'').trim();if(!d||!name)continue;
      const un=u>=0?(/lb/i.test(r[u])?'lb':'kg'):null;
      sets.push({iso:impISO(d),t:d.getTime(),wk:impISO(d),name,idx:sets.length,w:impNum(r[col('weight')]),unit:un,reps:impNum(r[col('reps')]),secs:impNum(r[col('seconds')]),dist:impNum(r[col('distance')]),dunit:un==='lb'?'mi':un?'km':null,part:col('body part')>=0?r[col('body part')]:''});}}
  else return {error:'This doesn’t look like a Strong or Hevy export. Use the export from either app, or the ShowUppp template.'};
  const real=sets.filter(s=>s.reps>0||s.w>0||s.secs>0||s.dist>0);
  if(!real.length)return {error:'No sets with weight, reps, time or distance were found.'};
  return {src,sets:real,unitKnown};
}
const IMP_DUP_SHOW=20;   // v4.6.390: past this, the bulk answer speaks for the rest
function impOpen(from){
  imp={step:'source',from:from||'settings'};impRender();
}
function impClose(){document.getElementById('imp')?.remove();imp=null;}
function impLoadText(text,fileName){
  const p=impParse(text);
  if(p.error){imp.error=p.error;impRender();return;}
  const known=impKnown(),names={};
  for(const s of p.sets)if(!names[s.name]){const m=impMatch(s.name,known);
    const cardioRows=p.sets.filter(x=>x.name===s.name);
    names[s.name]={...m,choice:m.state==='sure'?m.ex:null,part:m.part||null,done:m.state==='sure'||(m.state==='new'&&!!m.part),cardioLike:cardioRows.every(x=>!x.reps&&(x.dist||x.secs))};}
  const dates=[...new Set(p.sets.map(s=>s.iso))].sort();
  const dups={};for(const d of dates){const day=DB.days[d];if(day&&(day.w||[]).length)dups[d]='ask';}
  imp={...imp,step:'review',file:fileName||'',src:p.src,sets:p.sets,unitKnown:p.unitKnown,unit:p.unitKnown?null:(DB.settings.unit==='lb'?'lb':'kg'),names,dups,dates,workouts:new Set(p.sets.map(s=>s.wk)).size,error:null,open:null};
  impRender();
}
/* v4.6.275: the picker is a REAL input living in the screen, read from a document-level
   change listener -- the same shape Restore has used since v3.3.88. A detached input made
   with createElement opened the iPhone's file sheet, but WKWebView dropped it before the
   choice came back, so the change event never arrived and nothing happened. */
function impPick(){const i=document.getElementById('impCsv');if(i){i.value='';i.click();}}
function impReadFile(f){
  if(!f||!imp)return;
  imp.error=null;imp.reading=f.name||'your file';impRender();
  const rd=new FileReader();
  rd.onload=()=>{imp.reading=null;impLoadText(String(rd.result||''),f.name);};
  rd.onerror=()=>{imp.reading=null;imp.error='That file couldn’t be read. Try saving it to Files first, then choose it again.';impRender();};
  rd.readAsText(f);
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='impCsv'&&e.target.files&&e.target.files[0])impReadFile(e.target.files[0]);});
const impPending=()=>imp?Object.values(imp.names).filter(n=>!n.done).length+Object.values(imp.dups).filter(v=>v==='ask').length:0;
const impIncluded=()=>imp.dates.filter(d=>imp.dups[d]!=='keep');
function impCommit(){
  const id='imp-'+Date.now().toString(36),at=Date.now(),keep=new Set(Object.keys(imp.dups).filter(d=>imp.dups[d]==='keep'));
  const toKgW=(v,u)=>(u||imp.unit)==='lb'?v/LB:v, toKm=(v,u)=>(u||(imp.unit==='lb'?'mi':'km'))==='mi'?v/MI:v;
  const byDay={};let sets=0;
  const ordered=imp.sets.slice().sort((a,b)=>a.t-b.t||a.idx-b.idx);
  const seq={};
  for(const s of ordered){if(keep.has(s.iso))continue;const n=imp.names[s.name];const ex=n.choice||s.name,part=n.part||homePartOf(ex)||'Chest';
    const k=s.wk;seq[k]=(seq[k]||0)+1;const t=s.t+seq[k]*60000;
    let e;
    if(isCardioEx(ex)&&!s.reps){const sec=Math.round(s.secs||0);e={part:'Run',ex,w:+toKm(s.dist||0,s.dunit).toFixed(3),reps:[],mins:Math.floor(sec/60),secs:sec%60,at:t,imp:id};}
    else if(!s.reps&&s.secs>0){e={part,ex,w:+toKgW(s.w||0,s.unit).toFixed(3),reps:[Math.round(s.secs)],at:t,imp:id};if(unitOf(ex)!==SET_SEC)unitOv()[ex]=SET_SEC;}
    else e={part,ex,w:/\bassist/i.test(s.name)?0:+toKgW(s.w||0,s.unit).toFixed(3),reps:[Math.round(s.reps)],at:t,imp:id};   // an assisted machine's number is help, not load: kept as bodyweight
    (byDay[s.iso]=byDay[s.iso]||[]).push(e);sets++;}
  const days=Object.keys(byDay).sort();
  for(const d of days){const day=DB.days[d]||{w:[]};day.w=[...(day.w||[]),...byDay[d]].sort((a,b)=>(a.at||0)-(b.at||0));day.lastAt=Math.max(...day.w.map(e=>e.at||0));day.upd=at;DB.days[d]=day;}
  const cust={...customs()};
  for(const [name,n] of Object.entries(imp.names)){const ex=n.choice||name;if(!n.choice&&!cust[ex]&&!SEED0.ex2part[ex]&&!isCardioEx(ex))cust[ex]={part:n.part||'Chest',equip:/dumbbell|\bdb\b/i.test(ex)?'dumbbell':/cable/i.test(ex)?'cable':/machine/i.test(ex)?'machine':/push ?up|pull ?up|chin ?up|plank|dip|sit ?up|crunch|bodyweight/i.test(ex)?'body':'barbell'};}
  DB.settings.custom=cust;
  DB.settings.imports=[...(DB.settings.imports||[]),{id,at,src:imp.src,days:days.length,sets,first:days[0],last:days.at(-1)}];
  DB.settingsAt=at;save(true);SEED=deriveAll();if(typeof _fireDist!=='undefined')_fireDist=null;
  imp={...imp,step:'done',batch:id,doneDays:days,doneSets:sets};impRender();render();
}
function impUndo(id){
  const at=Date.now();let n=0;
  for(const [d,day] of Object.entries(DB.days)){if(!day||!(day.w||[]).some(e=>e.imp===id))continue;const before=day.w.length;day.w=day.w.filter(e=>e.imp!==id);n+=before-day.w.length;day.upd=at;day.lastAt=day.w.length?Math.max(...day.w.map(e=>e.at||0)):undefined;}
  DB.settings.imports=(DB.settings.imports||[]).filter(x=>x.id!==id);DB.settingsAt=at;
  allowEmptySave=true;save(true);SEED=deriveAll();if(typeof _fireDist!=='undefined')_fireDist=null;
  return n;
}
function impHeat(days){
  const set=new Set(days),last=new Date(days.at(-1)+'T12:00'),first=new Date(days[0]+'T12:00');
  const end=new Date(last);end.setDate(end.getDate()+(6-end.getDay()));
  let start=new Date(first);start.setDate(start.getDate()-start.getDay());
  const maxW=26,weeks=Math.max(8,Math.min(maxW,Math.ceil((end-start)/864e5/7)));
  start=new Date(end);start.setDate(start.getDate()-weeks*7+1);
  let h='';for(let w=0;w<weeks;w++){h+='<span class="im-wk">';for(let i=0;i<7;i++){const d=new Date(start);d.setDate(d.getDate()+w*7+i);h+=`<i class="${set.has(impISO(d))?'on':''}"></i>`;}h+='</span>';}
  return `<div class="im-heat" aria-hidden="true">${h}</div>`;
}
const impRange=ds=>{if(!ds.length)return '';const f=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}),y=d=>d.slice(0,4);return f(ds[0])+(y(ds[0])!==y(ds.at(-1))?', '+y(ds[0]):'')+' – '+f(ds.at(-1))+', '+y(ds.at(-1));};
const impMonths=ds=>{if(!ds.length)return '';const f=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',year:'numeric'});const a=f(ds[0]),b=f(ds.at(-1));return a===b?a:a.split(' ')[1]===b.split(' ')[1]?a.split(' ')[0]+'–'+b:a+' – '+b;};
const IMP_ICON={cal:icon('calendar',ICON_SZ.sm),file:icon('file',ICON_SZ.sm),chev:icon('chevronR',ICON_SZ.sm),link:icon('link',ICON_SZ.sm),ok:icon('check',ICON_SZ.sm),warn:icon('alert',ICON_SZ.sm)};
function impRender(){
  let el=document.getElementById('imp');
  if(!el){el=document.createElement('div');el.id='imp';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');document.body.appendChild(el);}
  const I=imp,pip=typeof mascotHTML==='function'?mascotHTML('hello','im-pip'):'',lines='<svg class="im-lines" viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12l4-9M12 17l12-6M14 25h10"/></svg>';
  const top=(t,back=true)=>`<div class="im-top">${back?`<button type="button" class="im-back" data-imp="back" aria-label="Back">‹</button>`:'<span class="im-back"></span>'}<span>${t}</span></div>`;
  let b='';
  if(I.step==='source'){
    b=`${top('Import')}<h1 class="im-h">You’re not starting from zero.</h1><div class="im-pipwrap">${pip}${lines}</div><p class="im-sub">Bring the workouts you already did.</p>
      ${I.error?`<p class="im-err" role="alert">${hesc(I.error)}</p>`:''}
      <button type="button" class="im-src" data-imp="file" ${I.reading?'disabled':''}><span class="im-ic">${IMP_ICON.file}</span><span class="im-ct"><b>${I.reading?'Reading '+hesc(I.reading)+'…':'Upload a CSV'}</b><span>Your Strong or Hevy export, or our template</span></span>${IMP_ICON.chev}</button>
      <input type="file" id="impCsv" accept=".csv,text/csv,text/comma-separated-values,text/plain" hidden>
      <details class="im-how"><summary>How to export</summary><p><b>Strong</b> · Settings → Export Strong Data</p><p><b>Hevy</b> · Profile → Settings → Export &amp; Import Data → Export Workouts</p><p>Save the file to your phone, then choose it here.</p></details>
      <button type="button" class="im-link" data-imp="template">Download the CSV template</button>
      <div class="im-sp"></div><p class="im-foot">You’ll review everything before it’s saved.</p><button type="button" class="im-link" data-imp="later">${I.from==='onboarding'?'Do this later':'Not now'}</button>`;
  }else if(I.step==='review'){
    const pend=impPending(),asks=Object.entries(I.names).filter(([,n])=>n.state==='ask'||(n.state==='new'&&!n.part)||n.reopen),dupList=Object.keys(I.dups),ready=impIncluded().length;
    const parts=['Chest','Back','Shoulder','Legs','Biceps','Triceps','Sixpack','Run'];
    const nameCard=([name,n])=>{const k=hesc(name);
      if(n.done&&!n.reopen)return `<div class="im-item im-ok"><span class="im-dot ok">${IMP_ICON.ok}</span><span class="im-it"><b>${n.choice?'Exercise match':'New exercise'}</b><span>${k} → ${hesc(n.choice||name)}${n.choice?'':' · '+hesc(partLabel(n.part))}</span></span><button type="button" class="im-mini" data-imp="reopen" data-name="${k}">Change</button></div>`;
      if(n.state==='new'||n.choice===null&&n.part===null)return `<div class="im-item"><span class="im-dot ask">${IMP_ICON.link}</span><span class="im-it"><b>New exercise</b><span>${k} · which body part?</span><span class="im-chips">${parts.map(p=>`<button type="button" class="${n.part===p?'on':''}" data-imp="part" data-name="${k}" data-part="${p}">${hesc(partLabel(p))}</button>`).join('')}</span></span></div>`;
      const opts=[n.ex,...n.alts].filter(Boolean);
      return `<div class="im-item"><span class="im-dot ask">${IMP_ICON.link}</span><span class="im-it"><b>Exercise match</b><span>${k} → ${hesc(n.pick||n.ex)}</span>${n.open?`<span class="im-chips im-col">${opts.map(o=>`<button type="button" class="${(n.pick||n.ex)===o?'on':''}" data-imp="alt" data-name="${k}" data-ex="${hesc(o)}">${hesc(o)}</button>`).join('')}<button type="button" class="${n.pick===''?'on':''}" data-imp="own" data-name="${k}">Keep “${k}” as its own</button></span>`:''}
        <span class="im-btns"><button type="button" class="im-b pri" data-imp="confirm" data-name="${k}">${n.open?'Use this':'Confirm match'}</button>${n.open?'':`<button type="button" class="im-b" data-imp="change" data-name="${k}">Change</button>`}</span></span></div>`;};
    const dupCard=d=>{const day=DB.days[d],ps=[...new Set((day.w||[]).map(e=>partLabel(e.part)))].join(' + '),v=I.dups[d];
      if(v!=='ask')return `<div class="im-item im-ok"><span class="im-dot ok">${IMP_ICON.ok}</span><span class="im-it"><b>${v==='keep'?'Kept your workout':'Both kept'}</b><span>${hesc(pwDate?pwDate(d):d)} · ${hesc(ps)}</span></span><button type="button" class="im-mini" data-imp="dupre" data-date="${d}">Change</button></div>`;
      return `<div class="im-item"><span class="im-dot bad">${IMP_ICON.warn}</span><span class="im-it"><b>Possible duplicate</b><span>${hesc(typeof pwDate==='function'?pwDate(d):d)} · you already logged ${hesc(ps)}</span><span class="im-btns"><button type="button" class="im-b pri" data-imp="keep" data-date="${d}">Keep existing</button><button type="button" class="im-b" data-imp="both" data-date="${d}">Keep both</button></span></span></div>`;};
    const nAsk=Object.values(I.names).filter(n=>!n.done&&n.state==='ask').length;
    /* v4.6.390: ONE ANSWER FOR EVERY DUPLICATE. Re-importing a history you already log here asks the
       same question hundreds of times; it is asked once, at the top, and each day can still differ */
    const dupAsk=dupList.filter(d=>I.dups[d]==='ask'),dupDone=dupList.filter(d=>I.dups[d]!=='ask');
    const dupBulk=dupAsk.length>=2?`<section class="im-bulk" aria-label="Answer every duplicate"><span class="im-bulk-k">Answer all at once</span><b class="im-bulk-n">${fmt(dupAsk.length)}</b><span class="im-bulk-t">possible duplicates</span><p>Days in this file that you already logged here.</p><div class="im-bulk-btns"><button type="button" class="im-b pri" data-imp="dupall" data-v="keep">Keep all existing</button><button type="button" class="im-b" data-imp="dupall" data-v="both">Keep both for all</button></div></section>${dupAsk.length?'<p class="im-one">Or one by one</p>':''}`:'';
    const nKeep=dupDone.filter(d=>I.dups[d]==='keep').length,nBoth=dupDone.length-nKeep;
    const dupDoneRow=`<div class="im-item im-ok"><span class="im-dot ok">${IMP_ICON.ok}</span><span class="im-it"><b>${fmt(dupDone.length)} duplicates answered</b><span>${nKeep?`${fmt(nKeep)} kept as you logged them`:''}${nKeep&&nBoth?' · ':''}${nBoth?`${fmt(nBoth)} kept both`:''}</span></span><button type="button" class="im-mini" data-imp="dupreset">Change</button></div>`;
    b=`${top('Review import')}<h1 class="im-h">Here’s what we found.</h1><p class="im-sub2">${fmt(I.workouts)} workouts · ${hesc(impMonths(I.dates))} · from ${hesc(I.src)}</p>
      ${I.unitKnown?'':`<div class="im-unit"><span>Weights in this file are</span><span class="im-seg" role="group" aria-label="Weight unit"><button type="button" class="${I.unit==='kg'?'on':''}" data-imp="unit" data-u="kg">kg</button><button type="button" class="${I.unit==='lb'?'on':''}" data-imp="unit" data-u="lb">lb</button></span></div>`}
      ${pend?`<div class="im-att"><span class="im-dot warn">!</span>${pend} item${pend===1?' needs':'s need'} attention${nAsk>=2?`<button type="button" class="im-mini" data-imp="confirmall">Confirm all ${nAsk} matches</button>`:''}</div>`:''}
      <div class="im-list">${Object.entries(I.names).filter(([,n])=>!n.done||n.reopen).map(nameCard).join('')}${dupBulk}${dupAsk.slice(0,IMP_DUP_SHOW).map(dupCard).join('')}${dupAsk.length>IMP_DUP_SHOW?`<p class="im-more">…and ${fmt(dupAsk.length-IMP_DUP_SHOW)} more. The buttons above answer them all.</p>`:''}
      ${Object.entries(I.names).filter(([,n])=>n.done&&!n.reopen&&n.state!=='sure').map(nameCard).join('')}${dupDone.length>5?dupDoneRow:dupDone.map(dupCard).join('')}</div>
      <div class="im-item im-ready"><span class="im-dot ok">${IMP_ICON.ok}</span><span class="im-it"><b>${fmt(ready)} day${ready===1?'':'s'} ready</b><span>${(n=>`${fmt(n)} exercise ${n===1?'name':'names'} matched on ${n===1?'its':'their'} own`)(Object.values(I.names).filter(n=>n.state==='sure').length)}</span></span></div>
      <div class="im-sp"></div><button type="button" class="im-go" data-imp="toconfirm" ${pend||!ready?'disabled':''}>${pend?`Resolve ${pend} item${pend===1?'':'s'} to continue`:'Continue'}</button><p class="im-foot">Nothing has been saved yet.</p>`;
  }else if(I.step==='confirm'){
    const inc=impIncluded(),wk=new Set(I.sets.filter(s=>inc.includes(s.iso)).map(s=>s.wk)).size,kept=Object.values(I.dups).filter(v=>v==='keep').length,newN=Object.values(I.names).filter(n=>!n.choice).length;
    b=`${top('Confirm import')}<h1 class="im-h">Ready when you are.</h1><div class="im-big"><span><b>${fmt(wk)}</b>workouts</span><em>${hesc(impRange(inc))}</em></div>
      <div class="im-checks"><p><span class="im-dot ok">${IMP_ICON.ok}</span>Exercise names confirmed${newN?` · ${newN} new`:''}</p><p><span class="im-dot ok">${IMP_ICON.ok}</span>Weights in ${I.unitKnown?'the file’s own units':hesc(I.unit)}</p>${kept?`<p><span class="im-dot ok">${IMP_ICON.ok}</span>${kept} duplicate${kept===1?'':'s'} excluded</p>`:''}<p><span class="im-dot ok">${IMP_ICON.ok}</span>Existing workouts unchanged</p></div>
      <div class="im-sp"></div><button type="button" class="im-go" data-imp="commit">Import ${fmt(wk)} workout${wk===1?'':'s'}</button><p class="im-foot">You can undo this import as a batch.</p>`;
  }else if(I.step==='done'){
    const wk=new Set(I.sets.filter(s=>I.doneDays.includes(s.iso)).map(s=>s.wk)).size;
    b=`<div class="im-top"><span class="im-back"></span><span>Import complete</span></div><div class="im-pipwrap">${pip}${lines}</div><h1 class="im-h im-c">Your work came with you.</h1><div class="im-count"><b>${fmt(wk)}</b><span>workouts imported</span></div>
      ${I.doneDays.length?impHeat(I.doneDays):''}<p class="im-sub im-c">${I.from==='onboarding'?'Next: we read your routine from it, so today is already planned.':'Your past sets are ready for comparison.'}</p><div class="im-sp"></div>
      ${I.from==='onboarding'?`<button type="button" class="im-go" data-imp="routine">See my routine →</button><button type="button" class="im-go2" data-imp="log">Just log a workout</button>`:`<button type="button" class="im-go" data-imp="progress">View my progress</button><button type="button" class="im-go2" data-imp="log">Log a workout</button>`}
      <button type="button" class="im-link" data-imp="undo">Undo this import</button><p class="im-foot">Batch · imported just now</p>`;
  }
  el.innerHTML=`<div class="im im-${I.step}">${b}</div>`;
  el.scrollTop=0;
}
function impTemplate(){
  const csv='Date,Exercise,Weight,Unit,Reps,Body part\n2026-09-01,Barbell Bench Press,135,lb,8,Chest\n2026-09-01,Barbell Bench Press,135,lb,8,Chest\n2026-09-01,Pull Up,0,lb,10,Back\n2026-09-03,Squat,100,kg,5,Legs\n';
  if(typeof dlFile==='function')dlFile('showuppp-import-template.csv','text/csv',csv);
}
document.addEventListener('click',e=>{
  const open=e.target.closest&&e.target.closest('[data-imp-open]');if(open){e.preventDefault();impOpen(open.dataset.impOpen);return;}
  const b=e.target.closest&&e.target.closest('#imp [data-imp]');if(!b||!imp)return;
  const a=b.dataset.imp,I=imp,n=b.dataset.name?I.names[b.dataset.name]:null;
  if(a==='back'){if(I.step==='review'||I.step==='source'&&true){if(I.step==='source'){impClose();return;}imp={step:'source',from:I.from};}else if(I.step==='confirm')I.step='review';impRender();return;}
  if(a==='later'){impClose();return;}
  if(a==='file'){I.error=null;impPick();return;}
  if(a==='template'){impTemplate();return;}
  if(a==='unit'){I.unit=b.dataset.u;}
  else if(a==='confirm'&&n){if(n.pick===''){n.choice=null;n.part=n.part||impGuessPart(b.dataset.name)||homePartOf(n.ex);}else{n.choice=n.pick||n.ex;n.part=homePartOf(n.choice)||n.part;}n.done=true;n.open=false;n.reopen=false;if(n.choice===null&&!n.part){n.done=false;n.state='new';}}
  else if(a==='change'&&n){n.open=true;}
  else if(a==='alt'&&n){n.pick=b.dataset.ex;}
  else if(a==='own'&&n){n.pick='';}
  else if(a==='part'&&n){n.part=b.dataset.part;n.choice=null;n.done=true;n.reopen=false;}
  else if(a==='reopen'&&n){n.reopen=true;n.done=false;if(n.state==='sure')n.state='ask';n.open=true;n.alts=n.alts||[];}
  else if(a==='confirmall'){for(const x of Object.values(I.names))if(!x.done&&x.state==='ask'){x.choice=x.ex;x.part=homePartOf(x.ex)||x.part;x.done=true;}}
  else if(a==='keep'){I.dups[b.dataset.date]='keep';}
  else if(a==='dupall'){const v=b.dataset.v==='both'?'both':'keep';for(const d of Object.keys(I.dups))if(I.dups[d]==='ask')I.dups[d]=v;}
  else if(a==='dupreset'){for(const d of Object.keys(I.dups))I.dups[d]='ask';}
  else if(a==='both'){I.dups[b.dataset.date]='both';}
  else if(a==='dupre'){I.dups[b.dataset.date]='ask';}
  else if(a==='toconfirm'){if(!impPending())I.step='confirm';}
  else if(a==='commit'){impCommit();return;}
  else if(a==='undo'){const k=impUndo(I.batch);impClose();render();toast(`Import undone · ${fmt(k)} sets removed`);return;}
  else if(a==='routine'){impClose();if(typeof onbFoundImport==='function')onbFoundImport();return;}   // v4.6.390: setup reads your routine from what came in
  else if(a==='progress'){impClose();view='stats';render();return;}
  else if(a==='log'){impClose();if(I.from==='onboarding'&&!DB.settings.onboarded&&typeof onbFinish==='function'){onbFinish(false,'train');return;}if(typeof liftEnter==='function')liftEnter({});view='lift';render();return;}
  impRender();
});
/* Settings: the latest import can be undone here too */
function impSettingsHTML(){
  const l=(DB.settings.imports||[]).at(-1);
  return `<div class="data-row"><div class="data-txt"><b>Bring past workouts</b><span>${l?`Last import: ${fmt(l.sets)} sets from ${hesc(l.src)}, ${hesc(impRange([l.first,l.last]))}. <button type="button" class="linkbtn" data-imp-undo="${hesc(l.id)}">Undo</button>`:'From Strong, Hevy or a spreadsheet.'}</span></div><div class="data-acts"><button class="btn ghost" data-imp-open="settings">Import</button></div></div>`;
}
document.addEventListener('click',e=>{const u=e.target.closest&&e.target.closest('[data-imp-undo]');if(!u)return;const k=impUndo(u.dataset.impUndo);render();if(typeof renderSync==='function'&&view==='sync')renderSync();toast(`Import undone · ${fmt(k)} sets removed`);});

/* ---- v4.6.312 (mock): THE ADOPTION. After the first logged day, once: Pip hands over to the
   companion you'll keep. A member picks from the line-up; a non-member's dealt one steps forward
   ("This one picked you"). Name it -- a suggestion per character, editable -- and it hops in. */
const COMPANION_NAMES={pip:'Pip',band:'Snap',plate:'Plato',bell:'Kettle',roller:'Rolly',bottle:'Sip',bag:'Duffy',ball:'Bounce',mat:'Matty',headphones:'Beats'};
function companionName(){return DB.settings.companionName||COMPANION_NAMES[clubAvatar()[0]]||'Buddy';}
/* ---- v4.6.315: YOUR MEDALS; THE CREW BY NAME.
   Medals are yours, not a companion's (Sungjee, 2026-10-14): they count your logged days -- the same
   number as Days trained and the day-done count -- so switching companions never costs anything.
   The crew is the companions you have named; switching is a plain choice. */
const USER_MEDALS=[[10,'band','Sweatband'],[25,'bronze','Bronze'],[50,'silver','Silver'],[100,'gold','Gold'],[250,'star','Star'],[500,'crown','Crown'],[1000,'diamond','Diamond']];
function crewState(){
  const st=DB.settings;if(!st.companionName)return null;
  if(!st.crew||Object.values(st.crew).some(c=>c.spans))st.crew=Object.fromEntries(Object.entries(st.crew||{[clubAvatar()[0]]:{name:st.companionName}}).map(([k,c])=>[k,{name:c.name}]));
  if(!st.crew[clubAvatar()[0]])st.crew[clubAvatar()[0]]={name:st.companionName};
  return st.crew;
}
function userMedals(n=loggedDays()){return USER_MEDALS.filter(m=>n>=m[0]);}
function medalSVG(kind,sz=22){
  const ring=(fill,edge)=>`<circle cx="12" cy="14" r="7" fill="${fill}" stroke="${edge}" stroke-width="1.4"/><path d="M8.5 3h7l-2 5h-3z" fill="#3047d8"/>`;
  const body={band:`<rect x="3" y="9" width="18" height="7" rx="3.5" fill="#3047d8"/><path d="M6 12.5h12" stroke="#fff" stroke-width="1.4" stroke-dasharray="2 2"/>`,
    bronze:ring('#d9965b','#a8673a'),silver:ring('#dfe5ea','#8f9aa5'),gold:ring('#f3c443','#b58a12'),
    star:`<path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L3.3 9.2l6.1-.6z" fill="#f3c443" stroke="#b58a12" stroke-width="1.2" stroke-linejoin="round"/>`,
    crown:`<path d="M4 17l-1-9 5 4 4-7 4 7 5-4-1 9z" fill="#f3c443" stroke="#b58a12" stroke-width="1.2" stroke-linejoin="round"/><rect x="4" y="17" width="16" height="3" rx="1" fill="#b58a12"/>`,
    diamond:`<path d="M7 4h10l4 5-9 12L3 9z" fill="#9fd8ff" stroke="#3047d8" stroke-width="1.3" stroke-linejoin="round"/><path d="M3 9h18M9 4l3 17 3-17" stroke="#3047d8" stroke-width="1" fill="none" stroke-linejoin="round"/>`}[kind];
  return `<svg class="crew-pin medal medal-${kind}" viewBox="0 0 24 24" width="${sz}" height="${sz}" aria-hidden="true">${body}</svg>`;
}
const crewPinSVG=medalSVG;
function userMedalsHTML(){
  const n=loggedDays(),got=userMedals(n),next=USER_MEDALS.find(m=>n<m[0]);
  return `<div class="club-medals" aria-label="Medals: ${got.length?got.map(m=>m[2]).join(', '):'none yet'}"><div class="club-medal-row">${USER_MEDALS.map(m=>`<span class="club-medal${n>=m[0]?' on':''}" title="${m[2]} · ${fmt(m[0])} days">${medalSVG(m[1],26)}<small>${fmt(m[0])}</small></span>`).join('')}</div><p class="club-medals-next">${next?`${fmt(next[0]-n)} ${next[0]-n===1?'day':'days'} to the ${next[2].toLowerCase()}${next[1]==='band'?'':' medal'}.`:'Every medal. You keep showing up.'}</p></div>`;
}
/* the day a medal is earned, the day-done screen says so, once, under "You showed up." */
function userMedalHit(n=loggedDays()){return USER_MEDALS.find(m=>m[0]===n)||null;}
function userMedalLineHTML(hit){
  if(!hit)return '';const what={band:'a sweatband',bronze:'the bronze medal',silver:'the silver medal',gold:'the gold medal',star:'a star',crown:'the crown',diamond:'the diamond'}[hit[1]];
  return `<p class="dd-crew">${medalSVG(hit[1],26)}<span>You earned ${what}: ${fmt(hit[0])} days of showing up.</span></p>`;
}
/* ---- v4.6.316: YOUR COMPANION IN WHAT YOU SHARE. On the day receipt and the plates card your
   companion takes Pip's spot; since Pip was the receipt's only brand mark, the official wordmark
   moves into its corner so a shared image still says where it came from. Your top medal sits by
   your name. Pip as your companion (or none chosen) leaves both cards exactly as they were. */
const _shareImgs={};
function shareImg(src){if(!_shareImgs[src]){const i=new Image();i.src=src;_shareImgs[src]=i;}return _shareImgs[src];}
const shareReady=i=>!!(i&&i.complete&&i.naturalWidth);
function shareCompanionImg(){if(typeof companionIsPip!=='function'||companionIsPip())return null;return shareImg(`assets/crew/${clubAvatar()[0]}.webp`);}
function shareWordmarkImg(dark){return shareImg(`assets/showuppp-wordmark-${dark?'dark':'light'}.svg`);}
function shareMedalImg(){const t=userMedals().at(-1);return t?shareImg('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(medalSVG(t[1],64).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '))):null;}
/* Draw the approved transparent 3D still; false if Pip's brand mark plays or the art isn't ready. */
function shareDrawCompanion(x,dx,dy,size){
  const img=shareCompanionImg();if(!shareReady(img))return false;
  x.drawImage(img,dx,dy,size,size);return true;
}
/* Stand the crew on a floor line: its body's base on floorY, its body centred on cx. */
function shareDrawCompanionFloor(x,cx,floorY,size){
  const f=crewFoot(clubAvatar()[0]);return shareDrawCompanion(x,cx-f[1]*size,floorY-(1-f[0])*size,size);
}
function sharePreload(){const d=document.documentElement.dataset.theme==='dark';const l=[shareCompanionImg(),shareWordmarkImg(d),shareWordmarkImg(!d),shareMedalImg(),sharePipImg()].filter(Boolean);return Promise.all(l.map(i=>i.decode?i.decode().catch(()=>{}):null));}
setTimeout(()=>{try{sharePreload();}catch(e){}},2500);
/* ---- v4.6.317 (mock): ONE FRAME FOR EVERYTHING YOU SHARE (Sungjee, 2026-10-14).
   1080 x 1350 (4:5). 72 margins on all four sides, one 936 column, gaps on an 8 grid.
   Header, centred, three rows: LABEL (mono caps 26, grey), Title (sans 56, ink), subtitle (sans 30, grey).
   Footer, identical everywhere: rule, 40 of air, then the wordmark (100 wide) left and your
   companion + first name right, 72 from the bottom. Each card supplies only its data; the frame
   places it in the band between, never larger than drawn, centred. Dates: "Tue, Oct 13, 2026";
   ranges "Sep 10 – Sep 30, 2026". */
const SHARE_BAND=282,SHARE_W=1080,SHARE_H=1350,SHARE_M=72,SHARE_SANS='"ShowUp Export Plex", "IBM Plex Sans", sans-serif',SHARE_MONO='"IBM Plex Mono", monospace';
function shareDay(iso){const d=new Date(iso+'T12:00');return d.toLocaleDateString('en-US',{weekday:'short'})+', '+d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function shareRange(a,b){const A=new Date(a+'T12:00'),B=new Date(b+'T12:00'),md=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric'});return A.getFullYear()===B.getFullYear()?`${md(A)} – ${md(B)}, ${B.getFullYear()}`:`${md(A)}, ${A.getFullYear()} – ${md(B)}, ${B.getFullYear()}`;}
function sharePipImg(){return shareImg('assets/mascot-blue.png');}
/* src: the card as it draws itself; band: its data's top and bottom in src pixels */
/* a frame that cannot be drawn (no pixel access, a test canvas) hands back the card as drawn */
function shareFrame(src,band,meta){try{return shareFrameDraw(src,band,meta);}catch(e){return src;}}
function shareFrameDraw(src,band,meta){
  if(!src)return src;
  const out=document.createElement('canvas');out.width=SHARE_W;out.height=SHARE_H;
  const sx=src.getContext('2d',{willReadFrequently:true}),t=Math.max(0,Math.round(band?.t??0)),b=Math.min(src.height,Math.round(band?.b??src.height));
  const bl=Math.max(0,Math.round(band?.l??0)),br=Math.min(src.width,Math.round(band?.r??src.width));
  const bgPx=sx.getImageData(bl+4,Math.min(src.height-1,t+4),1,1).data,bg=`rgb(${bgPx[0]},${bgPx[1]},${bgPx[2]})`;
  const dark=(bgPx[0]+bgPx[1]+bgPx[2])/3<128,css=getComputedStyle(document.documentElement);
  const ink=dark?'#f4f3f0':'#1c1c1c',muted=dark?'#a1a3a7':'#686868',line=dark?'#303033':'#e5e5e8';
  /* trim the data's own whitespace */
  const w=src.width,h=b-t,px=sx.getImageData(0,t,w,h).data,diff=i=>Math.abs(px[i]-bgPx[0])+Math.abs(px[i+1]-bgPx[1])+Math.abs(px[i+2]-bgPx[2])>24;
  let x0=w,y0=h,x1=-1,y1=-1;for(let yy=0;yy<h;yy+=1)for(let xx=bl;xx<br;xx+=2){if(diff((yy*w+xx)*4)){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy;}}
  /* v4.6.317: a list too long for 4:5 switches the canvas to 9:16 (1920) so its type never shrinks;
     everything else stays 4:5 and fits by scaling down */
  const HH=meta.grow&&y1>=0&&y1-y0+1>SHARE_H-SHARE_M-232*100/350-80-SHARE_BAND?1920:SHARE_H;   /* two sizes only: 4:5 or 9:16 */
  out.height=HH;const x=out.getContext('2d');
  x.fillStyle=bg;x.fillRect(0,0,SHARE_W,HH);
  /* header */
  const C=SHARE_W/2;let y=SHARE_M;
  x.textAlign='center';x.textBaseline='alphabetic';
  x.fillStyle=muted;x.font='500 26px '+SHARE_MONO;if('letterSpacing' in x)x.letterSpacing='3px';x.fillText(String(meta.label||'').toUpperCase(),C,y+20,936);if('letterSpacing' in x)x.letterSpacing='0px';
  /* v4.6.317: title 48 (Sungjee, 2026-10-14) */
  x.fillStyle=ink;x.font='600 48px '+SHARE_SANS;x.fillText(meta.title||'',C,y+20+64,936);
  x.fillStyle=muted;x.font='400 30px '+SHARE_SANS;if(meta.sub)x.fillText(meta.sub,C,y+20+64+46,936);
  const bandTop=SHARE_BAND;            /* v4.6.320: 80 below the subtitle's baseline, matching the air around the footer rule (Sungjee, 2026-10-14) */
  /* footer */
  const wm=shareWordmarkImg(dark),wh=100*232/350,rowMid=HH-SHARE_M-wh/2,rule=rowMid-wh/2-40;
  x.fillStyle=line;x.fillRect(SHARE_M,Math.round(rule),SHARE_W-SHARE_M*2,2);
  if(shareReady(wm))x.drawImage(wm,SHARE_M,rowMid-wh/2,100,wh);
  const name=(typeof firstName==='function'&&firstName())||'';x.textAlign='right';x.fillStyle=muted;x.font='400 30px '+SHARE_SANS;
  if(name)x.fillText(name,SHARE_W-SHARE_M,rowMid+10);
  /* v4.6.350: the crew at 2x (96, was 48), its body -- not its padded box -- 4px off the name (Sungjee, 2026-10-17) */
  const CS=96,nw=name?x.measureText(name).width+16:0,edge=SHARE_W-SHARE_M-nw,cf=crewFoot(clubAvatar()[0]);
  if(!shareDrawCompanion(x,edge-CS*(cf[1]+cf[2]/2)-4,rowMid-CS/2,CS)){const pip=sharePipImg();if(shareReady(pip)){const ph=CS*pip.naturalHeight/pip.naturalWidth*1.5,pw=ph*pip.naturalWidth/pip.naturalHeight;const pf=crewFoot('pip');x.drawImage(pip,edge-pw*(pf[1]+pf[2]/2)-4,rowMid-ph/2,pw,ph);}}
  const bandBot=rule-40,bw=SHARE_W-SHARE_M*2,bh=bandBot-bandTop;
  /* the data, never enlarged, placed in the band per meta.valign */
  if(x1>=0){const cw=x1-x0+2,ch=y1-y0+1,k=Math.min(1,bw/cw,bh/ch),dw=cw*k,dh=ch*k;
    /* lists hang from the top, objects stand on the floor, charts sit centred */
    const dy=meta.valign==='top'?0:meta.valign==='bottom'?bh-dh:(bh-dh)/2;
    x.drawImage(src,x0,t+y0,cw,ch,(SHARE_W-dw)/2,bandTop+dy,dw,dh);}
  return out;
}
function crewSwitch(k){
  const st=DB.settings,c=crewState(),cur=clubAvatar()[0];if(!c||k===cur)return;
  c[k]=c[k]||{name:COMPANION_NAMES[k]};st.clubAvatar=k;st.companionName=c[k].name;DB.settingsAt=Date.now();save(true);
}
/* the ceremony's body, shared by first-run (step 4 of setup) and the one-time overlay for people
   who set up before companions existed */
function adoptMarkup(intro,later){
  /* everyone chooses here (Sungjee, 2026-10-14): the first pick is free; membership unlocks switching */
  const locked=false,free=null;
  const pip=`<img class="ad-pip" src="assets/mascot-${document.documentElement.dataset.theme==='dark'?'white':'chrome'}.png" alt="" aria-hidden="true">`;
  return `<div class="ad-in">${later?'<button type="button" class="ad-later" data-ad-later>Not now</button>':''}${pip}<h2 id="adTitle" class="ad-t">${intro||'Someone’s been watching you show up.'}</h2>
    <p class="ad-s">${locked?'One of them has picked you.':'Pick the one that comes along.'}</p>
    <div class="ad-grid">${clubChoices().map((i,n)=>`<button type="button" class="ad-c${locked&&i[0]!==free?' ad-dim':''}" data-ad="${i[0]}" style="--n:${n}" ${locked&&i[0]!==free?'tabindex="-1" aria-hidden="true"':''}>${clubIconHTML(i,true).replace('club-avatar ','club-avatar club-visible ')}<span>${i[1]}</span></button>`).join('')}</div>
    <div class="ad-name" hidden><div class="ad-hero"></div><p class="ad-s ad-pickline"></p><label class="ad-lab" for="adName">Name</label><input id="adName" maxlength="16" autocomplete="off" spellcheck="false"><button type="button" class="btn ad-go"></button></div></div>`;
}
function adoptBind(el,done){
  const locked=false;let pick=null;
  if(locked)setTimeout(()=>el.classList.add('ad-picked'),2300);
  const choose=k=>{pick=k;const i=clubChoices().find(x=>x[0]===k);el.classList.add('ad-naming');el.classList.toggle('ad-pippick',k==='pip');
    el.querySelector('.ad-hero').innerHTML=clubIconHTML(i,true).replace('club-avatar ','club-avatar club-visible ');
    el.querySelector('.ad-pickline').textContent=locked?'This one picked you.':'Good choice.';
    const inp=el.querySelector('#adName');inp.value=COMPANION_NAMES[k]||'';el.querySelector('.ad-name').hidden=false;
    const go=el.querySelector('.ad-go');const lab=()=>go.textContent='Welcome, '+(inp.value.trim()||COMPANION_NAMES[k]);lab();inp.oninput=lab;};
  el.addEventListener('click',e=>{if(e.target.closest('[data-ad-later]')){DB.settings.companionAsked=todayISO;DB.settingsAt=Date.now();save(true);done(true);return;}const c=e.target.closest('[data-ad]');
    if(c&&!c.classList.contains('ad-dim')){if(locked&&!el.classList.contains('ad-picked'))el.classList.add('ad-picked');choose(c.dataset.ad);return;}
    if(e.target.closest('.ad-go')){const name=el.querySelector('#adName').value.trim()||COMPANION_NAMES[pick];
      DB.settings.clubAvatar=pick;if(!DB.settings.companionFree)DB.settings.companionFree=pick;DB.settings.companionName=name;DB.settings.companionAsked=todayISO;DB.settings.companionSince=todayISO;DB.settingsAt=Date.now();save(true);
      el.querySelector('.ad-pickline').textContent=`${name}’s with you now.`;el.classList.add('ad-arrive');
      setTimeout(done,2200);}});
}
function adoptOpen(){
  if(document.getElementById('adopt'))return;
  const el=document.createElement('div');el.id='adopt';el.className='ad-root';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','adTitle');
  el.innerHTML=adoptMarkup('Someone wants to come along.',true);document.body.appendChild(el);
  adoptBind(el,()=>{el.classList.add('ad-out');setTimeout(()=>{el.remove();render();},500);});
}
/* People who set up before companions existed meet theirs once, on Today. Not under automation
   (Playwright, jsdom): a dialog that opens on a timer would sit over every other check. */
function adoptDue(){
  return !!DB.settings.onboarded&&!DB.settings.companionName&&!DB.settings.companionAsked&&!DB.settings.demo&&
    (typeof mascotMode!=='function'||mascotMode()!=='off')&&typeof view!=='undefined'&&view==='today'&&
    !document.querySelector('#onb:not([hidden]),#dayDone,#paywall,#mbManage,#memberWelcome,#adopt')&&!(typeof modalOpen==='function'&&modalOpen());
}
function adoptAuto(){return !navigator.webdriver&&!/jsdom/i.test(navigator.userAgent||'');}
(function(){const s=document.createElement('style');s.textContent=`
#adopt{position:fixed;inset:0;z-index:8700;overflow:auto;overscroll-behavior:contain;background:var(--ground);color:var(--chalk);display:flex;justify-content:center;padding:calc(env(safe-area-inset-top) + 40px) 22px calc(env(safe-area-inset-bottom) + 28px);animation:adFade .5s ease-out both}
#adopt.ad-out{animation:adFade .5s ease-in reverse both}
.ad-root .ad-in{width:100%;max-width:400px;text-align:center;position:relative}
.ad-root .ad-later{all:unset;cursor:pointer;position:absolute;top:-24px;right:0;font:500 12px var(--body);color:var(--muted);padding:8px 4px}
.ad-root .ad-pip{display:block;width:120px;margin:0 auto 11px;animation:adPip 1.1s .2s cubic-bezier(.3,1.6,.5,1) both}
.ad-root.ad-pippick .ad-pip{display:none}
.ad-root .ad-c[data-ad="pip"] .club-avatar{width:110px;height:84px}
.ad-root.ad-naming .ad-pip{animation:adPipWave .9s ease-in-out both}
.ad-root.ad-arrive .ad-pip{animation:adPipOff .7s .2s ease-in both}
.ad-root .ad-t{font:700 23px/1.2 var(--body);letter-spacing:-.4px;margin:0 0 6px;text-transform:none;color:var(--chalk);opacity:1;display:block;animation:adRise .6s .7s ease-out both}
.ad-root .ad-t::after{display:none}
.ad-root .ad-s{font:400 14px/1.363 var(--body);color:var(--muted);margin:0 0 18px;animation:adRise .6s 1.1s ease-out both}
.ad-root .ad-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 10px;transition:opacity .4s,transform .4s}
.ad-root .ad-c{border:0;border-radius:18px;background:var(--surface);color:var(--chalk);padding:10px 4px 8px;cursor:pointer;font:500 11px var(--body);animation:adPop .55s cubic-bezier(.3,1.6,.5,1) both;animation-delay:calc(1.3s + var(--n)*70ms);transition:opacity .5s,transform .5s,filter .5s}
.ad-root .ad-c .club-avatar{width:72px;height:72px;margin:0 auto 3px}
.ad-root.ad-picked .ad-dim{opacity:.18;filter:grayscale(1);transform:scale(.9)}
.ad-root.ad-picked .ad-c:not(.ad-dim){transform:scale(1.12);box-shadow:0 0 0 2px var(--accent);z-index:1;position:relative}
.ad-root.ad-naming .ad-grid,.ad-root.ad-naming .ad-t,.ad-root.ad-naming .ad-in>.ad-s{display:none}
.ad-root .ad-name{animation:adRise .5s ease-out both}
.ad-root .ad-hero{width:150px;height:150px;margin:5px auto 3px;animation:adHero .8s cubic-bezier(.3,1.6,.5,1) both}
.ad-root .ad-hero .club-avatar{width:100%;height:100%}
.ad-root .ad-lab{display:block;font:600 11px var(--body);letter-spacing:.6px;text-transform:uppercase;color:var(--muted);margin:3px 0 6px}
.ad-root #adName{width:100%;box-sizing:border-box;text-align:center;font:700 25px var(--body);color:var(--chalk);background:var(--surface);border:2px solid var(--line);border-radius:16px;padding:12px;margin:0 0 13px}
.ad-root #adName:focus{outline:none;border-color:var(--accent)}
.ad-root .ad-go{width:100%;min-height:56px;border-radius:16px;margin:0;font:700 15px var(--body)}
.ad-root.ad-arrive .ad-hero{animation:adArrive 1.4s cubic-bezier(.3,1.6,.5,1) both}
.ad-root.ad-arrive .ad-lab,.ad-root.ad-arrive #adName,.ad-root.ad-arrive .ad-go{opacity:0;transition:opacity .3s}
@keyframes adFade{from{opacity:0}to{opacity:1}}
@keyframes adRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes adPip{from{opacity:0;transform:translateY(-30px) scale(.8)}to{opacity:1;transform:none}}
@keyframes adPipWave{0%,100%{transform:none}25%{transform:rotate(-10deg)}50%{transform:rotate(8deg)}75%{transform:rotate(-4deg)}}
@keyframes adPipOff{to{opacity:0;transform:translateX(120px) rotate(14deg)}}
@keyframes adPop{from{opacity:0;transform:translateY(24px) scale(.6)}to{opacity:1;transform:none}}
@keyframes adHero{from{opacity:0;transform:scale(.5) translateY(40px)}to{opacity:1;transform:none}}
@keyframes adArrive{0%{transform:none}30%{transform:translateY(-36px) scale(1.08)}55%{transform:translateY(6px) scale(1.12,.9)}75%{transform:translateY(-8px)}100%{transform:none}}
@media (prefers-reduced-motion:reduce){#adopt,.ad-root *{animation:none!important;transition:none!important}}`;document.head.appendChild(s);})();
