/* ShowUp — settings.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Sync (GitHub) ---------- */
function renderSync(){
  clubEnsureIdentity();
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
      <div class="note" style="margin-top:4px">Workouts logged on this device stay on this device until you sign in below. If the app is ever deleted or reinstalled, unsynced data is lost.</div></div>`:''}
    <h2>Display</h2>
    <div class="card">
      <button class="btn ghost" id="unitBtn" style="margin:0">${isLb()?'lb · mi':'kg · km'}</button>
      <span class="seg" style="display:flex;margin-top:8px">
        <button data-thm="system" class="${DB.settings.theme==='system'?'sel':''}">System</button>
        <button data-thm="light" class="${DB.settings.theme==='light'?'sel':''}">Light</button>
        <button data-thm="dark" class="${DB.settings.theme!=='system'&&DB.settings.theme!=='light'?'sel':''}">Dark</button>
      </span>
      <!-- v4.6.164: Retro / Minimal / Classic is gone -- ShowUp is Minimal (the
           maker's call, 2026-09-29). load() moves a stored Retro or Classic to Minimal. -->
      <!-- v3.3.477: the tab bar's own appearance. "Match" rather than
           "System" because the row above already means the system, and one
           word must not mean two things two rows apart. -->
      <div class="note" style="margin-top:10px">Tab bar</div>
      <span class="seg" style="display:flex;margin-top:4px">
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
      <div class="note" style="margin-top:8px">Pin click for the rep ruler. A soft clunk when you change weight or log a set. Saved on this device; touch feedback depends on your device.</div>
    </div>
    <h2>Body-part colors</h2>
    <div class="card body-palette-settings">
      <span class="seg" style="display:flex" role="group" aria-label="Body-part colors">
        ${[['normal','Normal'],['neon','Neon']].map(([value,label])=>`<button type="button" data-body-palette-pick="${value}" class="${bodyPalette()===value?'sel':''}" aria-pressed="${bodyPalette()===value}">${label}</button>`).join('')}
      </span>
      <div class="body-palette-preview">${Object.entries(PART_COLORS).map(([part,color])=>`<span><i style="background:${color}" aria-hidden="true"></i>${part==='Shoulder'?'Shoulders':part}</span>`).join('')}</div>
      <div class="note">Normal is balanced. Neon is brighter. Applies to body-part colors in charts, plates and shared images.</div>
    </div>
    <h2>Week starts on</h2>
    <div class="card"><span class="seg" style="display:flex">
      ${[['sunday','Sunday'],['monday','Monday']].map(([v,label])=>`<button data-week-start="${v}" class="${weekStartDow()===(v==='monday'?1:0)?'sel':''}" aria-pressed="${weekStartDow()===(v==='monday'?1:0)}">${label}</button>`).join('')}
    </span></div>
    <h2>Mascot</h2>
    <div class="card"><span class="seg" style="display:flex">
      ${['animated','still','off'].map(mode=>`<button data-mascot-pick="${mode}" class="${mascotMode()===mode?'sel':''}" aria-pressed="${mascotMode()===mode}">${mode[0].toUpperCase()+mode.slice(1)}</button>`).join('')}
    </span></div>
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
      ${rp.on?`<div class="fld text" style="margin-top:10px"><label>Planned-day note at</label>
        <input id="remMorning" type="time" value="${rp.morning}"></div>`:''}
      <div class="note" style="margin-top:10px">At most one a day. On a planned day, your plan in the morning. On a usual training day with no plan, one line 30 minutes after you usually start, if nothing is logged. Nothing on rest days.</div>
    </div>`; })():''}
    ${typeof hlPlugin==='function'&&hlPlugin()?(()=>{ const hp=hlPrefs(); return `
    <!-- v4.6.132: Apple Health, iOS app only, write-only (js/health.js). -->
    <h2>Apple Health</h2>
    <div class="card">
      <span class="seg" style="display:flex">
        <button data-hl="off" class="${hp.on?'':'sel'}" aria-pressed="${!hp.on}">Off</button>
        <button data-hl="on" class="${hp.on?'sel':''}" aria-pressed="${hp.on}">On</button>
      </span>
      <div class="note" style="margin-top:10px">When you press Finish, the workout is saved to Apple Health: your lifting as strength training, and each run, ride, row, swim or walk as its own workout with its time and distance. From now on only; nothing earlier is sent. ShowUppp never reads your Health data.</div>
    </div>`; })():''}
    <h2>Account & cloud sync</h2>
    <div class="card">
      ${session?`
        <div class="row spread" style="margin-bottom:10px">
          <span><b class="selectable">${session.user.email||'Signed in'}</b>
            <div class="note" style="margin:2px 0 0">Devices sync on open and on return, day by day.</div>
        <div class="note" style="margin:6px 0 0">Your full history — ${fmt(SEED.totals.sessions)} days · ${SEED.totals.km} km.</div></span>
        </div>
        <div class="note">Last cloud sync: ${DB.settings.lastCloud?new Date(DB.settings.lastCloud).toLocaleString():'—'}</div>
        <div class="row" style="gap:8px;margin-top:10px">
          <button class="btn ghost" id="cloudPullBtn" style="margin:0">Pull ↓</button>
          <button class="btn ghost" id="signOutBtn" style="margin:0">Sign out</button>
        </div>
        <button class="btn ghost danger" id="deleteAcctBtn" style="margin:14px 0 0">Delete account…</button>
        <div class="note" style="margin-top:6px">Erases your account and everything synced to it. Sign out only removes this device.</div>`
      :`
        ${cloudReady()?`
          ${typeof appleReady==='function'&&appleReady()?`<button class="btn apple-btn" id="appleBtn"><span class="apple-glyph" aria-hidden="true">&#xF8FF;</span>Continue with Apple</button>`:''}
          <button class="btn" id="googleBtn" style="margin:0">Continue with Google</button>
          <div class="note" style="margin-top:8px">Your data stays on this device until you sign in. Signing in syncs it to your own database, private to your account.</div>`
        :`
          <div class="fld text" style="margin-bottom:8px"><label>Supabase project URL</label>
            <input id="cloudUrl" value="${DB.settings.cloud?.url||''}" placeholder="https://xxxx.supabase.co" autocapitalize="off"></div>
          <div class="fld text"><label>Anon public key</label>
            <input id="cloudAnon" value="${DB.settings.cloud?.anon||''}" placeholder="eyJhbGciOi…" autocapitalize="off"></div>
          <button class="btn" id="cloudSave" style="margin-top:10px">Save & enable cloud</button>
          <div class="note" style="margin-top:8px">One-time setup — see INSTALL.md — create the free database, run one SQL file, switch on Google sign-in.</div>`}
      `}
    </div>
    <!-- v4.6.117: App Store 5.1.1(i) wants the privacy policy reachable in the app.
         Absolute URLs: inside the iOS app a relative link would resolve to the
         app's own files, which do not carry these pages. -->
    <div class="note legal-links" style="text-align:center;margin:10px 0 0"><a href="https://tahros.github.io/showup/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> · <a href="https://tahros.github.io/showup/support.html" target="_blank" rel="noopener">Support</a></div>
    <h2>You</h2>
    <div class="card">
      <div class="fld text" style="margin-bottom:8px"><label>Name — what the app calls you</label>
        <input id="youName" value="${hesc(DB.settings.name||'')}" placeholder="—" autocapitalize="words" maxlength="40"></div>
      <div class="note" style="margin:-2px 0 10px">${firstName()
        ? `Greets you as <b>${firstName()}</b> — the first word of whatever you type.`
        : `Only the first word is used — “Sungjee Kim” greets as Sungjee. Type exactly what you want to be called.`}</div>
      <div class="row" style="gap:8px;align-items:stretch">
        <div class="fld" style="flex:1"><label>Weight (${U()})</label>
          <input id="youBw" type="number" inputmode="decimal" step="0.1" value="${bwNow()>0?wDisp(bwNow()):''}" placeholder="—"></div>
        <div class="fld" style="flex:1"><label>Sex</label>
          <span class="seg" style="display:flex;margin-top:4px">
            <button data-sex="m" class="${DB.settings.sex==='m'?'sel':''}">M</button>
            <button data-sex="f" class="${DB.settings.sex==='f'?'sel':''}">F</button></span></div>
      </div>
      <div class="note">Enter a weight only when it <b>changes</b> — silence means unchanged, and the app reads back the weight in force on any given day.</div>
      <button class="btn" id="youSave" style="margin-top:10px">Save</button>
    </div>
    <h2>What you train</h2>
    <div class="card">
      <div class="note" style="margin-bottom:10px">Shapes which parts appear in Train and which get
        suggested on Today. <b>Nothing is deleted</b> — a part you switch off keeps every set you
        ever logged, and switching it back on brings the history with it.</div>
      <div class="onbchips" id="myPartsChips">${Object.keys(SEED.catalog).filter(p=>p!=='Run').map(p=>{
        const on=myPartsSet().has(p), n=(trainingPlan().info[p]||{}).days||0;
        return `<button class="onbchip ${on?'sel':''}" data-myp="${p}">${p}${
          n?`<small> · ${n}d</small>`:''}</button>`;}).join('')}</div>
      <div class="note" id="myPartsNote" style="margin-top:10px">${
        (()=>{const off=Object.keys(SEED.catalog).filter(p=>p!=='Run'&&!myPartsSet().has(p));
          return off.length? `Hidden from Train: <b>${off.join(', ')}</b>.`
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
      <button class="btn" id="barSave" style="margin-top:10px">Save</button>
    </div>
    <h2>Same exercise, two names</h2>
    <div class="card">
      <div class="note" style="margin-bottom:10px">If the same movement got logged under two names, fold one into the other. The app never does this on its own \u2014 only genuinely different movements should stay apart.</div>
      ${mergeUI()}
    </div>
    <h2>Your data</h2>
    <div class="card">
      <div class="note" style="margin-bottom:10px">${fmt(Object.keys(DB.days).filter(d=>(DB.days[d].w||[]).length).length)} days on this device — yours to take anywhere. Weights export in kg, distance in km (the stored truth), whatever the display unit.</div>
      <div class="row" style="gap:8px">
        <button class="btn ghost" id="expCsv" style="flex:1;margin:0">CSV ↓</button>
        <button class="btn ghost" id="expSheet" style="flex:1;margin:0">Copy for Sheets</button>
      </div>
      <!-- v3.3.372: look at day one without becoming day one. The maker has 953
           days behind him and the only other way to see a new user's first
           screen is to log out or clear the device. This renders the flow over
           live data and writes NOTHING -- no sets, no settings, no stamp. -->
      <button class="btn ghost" id="d1prev" style="margin-top:8px">Preview day one</button>
      <!-- v3.3.424: and the century, for the same reason -- the next one is
           dozens of days away and it cannot be judged from a description.
           It writes NOTHING: no stamp, no settings, no set. It shows the
           NEXT century you will actually reach, so what you are looking at is
           your own number, not a sample. -->
      <button class="btn ghost" id="milePrev" style="margin-top:8px">Preview the ${fmt(Math.ceil((dayCount()+1)/100)*100)} day</button>
      <div class="row" style="gap:8px;margin-top:8px">
        <button class="btn ghost" id="expJson" style="flex:1;margin:0">Backup ↓</button>
        <button class="btn ghost" id="impJson" style="flex:1;margin:0">Restore…</button>
      </div>
      <input type="file" id="impFile" accept=".json,application/json" hidden>
    </div>
    <div class="note assetcredits" style="text-align:center;margin-top:6px;opacity:.7">Status icons: <a href="https://thenounproject.com/icon/minus-8363736/" target="_blank" rel="noopener">Minus</a> by ARIPATUT DASUKI · <a href="https://thenounproject.com/icon/trend-2344331/" target="_blank" rel="noopener">Trend</a> by Travis Avery · <a href="https://thenounproject.com/icon/share-2438501/" target="_blank" rel="noopener">Share</a> and <a href="https://thenounproject.com/icon/edit-1751206/" target="_blank" rel="noopener">Edit</a> by Timur Minvaleev · <a href="https://thenounproject.com/icon/ai-7262146/" target="_blank" rel="noopener">Sparkle</a> by Eliricon · <a href="https://thenounproject.com/icon/arrow-1342814/" target="_blank" rel="noopener">Chevron</a> by Barracuda · <a href="https://thenounproject.com/icon/expand-7584001/" target="_blank" rel="noopener">Expand</a> and <a href="https://thenounproject.com/icon/collapse-7584005/" target="_blank" rel="noopener">Collapse</a> by LAFS · Copy by maria icon · Pencil by Alvida Black · Noun Project</div>`;
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
const CLUB_ICONS=[['band','Resistance band',1,0],['plate','Weight plate',1,50],['bell','Kettlebell',0,50],['roller','Foam roller',1,100],['bottle','Water bottle',0,100],['bag','Gym bag',2,0],['ball','Medicine ball',0,0],['mat','Rolled mat',2,50],['headphones','Headphones',2,100]];
const clubOpenGroups=new Set();
// Session-memory cache only: no membership records enter workout sync/backups.
// Key includes backend + user, so switching accounts cannot show another number.
const clubMembershipCache=new Map(),clubMembershipRequests=new Map();
function clubMembershipKey(){return session?.user?.id?cloudCfg().url+'|'+session.user.id:'';}
function clubMembershipFacts(){
  const user=session?.user,m=clubMembershipCache.get(clubMembershipKey());
  const raw=m?.joined_at||user?.created_at||(!user?DB.settings.clubGuest?.since:null),date=raw?new Date(raw):null;
  return {number:user?(m?.member_no??'—'):'Guest',since:m?.member_no==='0'?'v1.0':date&&Number.isFinite(date.getTime())?date.toLocaleDateString('en-US',{month:'short',year:'numeric'}):'—'};
}
async function clubLoadMembership(){
  const key=clubMembershipKey();if(!key||!session?.access_token||DB.settings.demo)return;
  const paint=()=>{if(key!==clubMembershipKey())return;const f=clubMembershipFacts(),n=document.querySelector('.club-number'),s=document.querySelector('.club-since');if(n)n.textContent=f.number;if(s)s.textContent=f.since;};
  if(clubMembershipCache.has(key)){paint();return;}
  if(clubMembershipRequests.has(key)){await clubMembershipRequests.get(key);paint();return;}
  const cfg=cloudCfg(),token=session.access_token;
  const request=(async()=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const r=await fetch(cfg.url+'/rest/v1/rpc/club_membership',{method:'POST',headers:{apikey:cfg.anon,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:controller.signal});
      if(!r.ok)return;
      const rows=await r.json(),m=Array.isArray(rows)&&rows.length===1?rows[0]:null;
      if(m&&typeof m.member_no==='string'&&/^(0|[1-9]\d*)$/.test(m.member_no))clubMembershipCache.set(key,{member_no:m.member_no,joined_at:Number.isFinite(Date.parse(m.joined_at))?m.joined_at:null});
    }catch(_){}finally{clearTimeout(timeout);}
  })();
  clubMembershipRequests.set(key,request);
  try{await request;paint();}finally{clubMembershipRequests.delete(key);}
}
function clubHash(str){let n=2166136261;for(const c of String(str)) n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
function clubEnsureIdentity(){
  if(session?.user?.id||DB.settings.clubGuest||!loadedOK||DB.settings.demo)return;
  const a=new Uint32Array(3);crypto.getRandomValues(a);
  DB.settings.clubGuest={id:Array.from(a,x=>x.toString(16).padStart(8,'0')).join(''),since:new Date().toISOString()};save(true);
}
function clubIdentity(){return session?.user?.id||DB.settings.clubGuest?.id||(DB.settings.demo?'demo-member':'guest');}
function clubAvatar(){const k=DB.settings.clubAvatar;return CLUB_ICONS.find(x=>x[0]===k)||CLUB_ICONS[clubHash(clubIdentity())%CLUB_ICONS.length];}
function clubIconHTML(item,animated=false){return `<span class="club-avatar club-${item[0]}${animated?' club-animate':''}" aria-hidden="true"><span class="club-shadow"></span><span class="club-sprite" style="background-image:url('assets/club-icons-${item[2]}.webp');background-position:${item[3]}% 0"></span></span>`;}
function clubAvatarEditHTML(item){return clubIconHTML(item,true)+`<span class="club-avatar-edit" aria-hidden="true">${icon('edit',14)}</span>`;}
function clubCardHTML(){
  const avatar=clubAvatar(),user=session?.user,{number:displayNumber,since}=clubMembershipFacts();
  const dark=document.documentElement.dataset.theme==='dark';
  return `<section class="card club-card" aria-label="Your Showing Up Club profile">
    <div class="club-brand"><img src="assets/showuppp-wordmark-${dark?'dark':'light'}.svg" alt="ShowUppp"><span>SHOWING UP CLUB</span></div>
    <div class="club-person"><button type="button" class="club-avatar-button" data-club-picker aria-label="Edit profile icon" aria-expanded="false">${clubAvatarEditHTML(avatar)}</button><div><h2>${hesc(DB.settings.name||'Your place in the club')}</h2><button type="button" class="club-text-button" data-club-edit>Edit profile</button></div></div>
    <div class="club-facts"><div><span>${user?'Member no.':'Membership'}</span><strong class="club-number">${displayNumber}</strong></div><div><span>${user?'Member since':'Club since'}</span><strong class="club-since">${since}</strong></div><button type="button" data-club-history aria-label="View your logged workout days"><span>Days trained</span><strong>${fmt(loggedDays())}</strong></button></div>
    <div class="club-picker" hidden><div class="club-picker-heading"><b>Make it yours.</b><button type="button" class="club-text-button" data-club-close>Done</button></div><div class="club-icon-grid" role="group" aria-label="Profile icons">${CLUB_ICONS.map(i=>`<button type="button" data-club-icon="${i[0]}" aria-pressed="${i[0]===avatar[0]}">${clubIconHTML(i,i[0]===avatar[0])}<span>${i[1]}</span></button>`).join('')}</div><p class="note">One little companion. Your choice stays with your profile.</p></div>
  </section>`;
}
/* Move existing nodes, not copies: every established control, ID and handler
   survives. Unknown/new Settings sections stay visible rather than disappearing. */
function clubArrangeSettings(){
  const host=document.getElementById('view');if(!host||!host.querySelector('.club-card')||host.querySelector('.club-settings-groups'))return;
  const groups=[['profile','Profile','Name & body details',['You']],['appearance','Appearance','Theme, units & colors',['Display','Body-part colors','Week starts on','Mascot']],['training','Training','Feedback & planning',['Workout feedback','Planning','Holding weight','Avoided exercises','What you train','Bars','Same exercise, two names']],['connections','Connections','Health & reminders',['Reminders','Apple Health']],['account','Account & data','Sign-in, sync & backups',['Account & cloud sync','Your data']]];
  const wrap=document.createElement('div');wrap.className='club-settings-groups';host.querySelector('.club-card').after(wrap);
  for(const [key,title,sub,headings] of groups){const nodes=[];for(const h of Array.from(host.children).filter(n=>n.tagName==='H2'&&headings.includes(n.textContent.trim()))){nodes.push(h);let n=h.nextElementSibling;while(n&&n.tagName!=='H2'&&!n.classList.contains('assetcredits')){const next=n.nextElementSibling;nodes.push(n);n=next;}}
    if(!nodes.length)continue;const d=document.createElement('details');d.className='club-settings-group';d.dataset.clubGroup=key;d.open=clubOpenGroups.has(key);const s=document.createElement('summary');s.innerHTML=`<span><b>${title}</b><small>${sub}</small></span><span aria-hidden="true">+</span>`;d.append(s);const content=document.createElement('div');content.className='club-group-content';nodes.forEach(n=>content.append(n));d.append(content);d.addEventListener('toggle',()=>{if(d.open)clubOpenGroups.add(key);else clubOpenGroups.delete(key)});wrap.append(d);
  }
  clubObserveMotion();
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
  const b=e.target.closest?.('[data-club-picker],[data-club-close],[data-club-icon],[data-club-edit],[data-club-history]');if(!b)return;
  const card=b.closest('.club-card'),picker=card?.querySelector('.club-picker');
  if(b.hasAttribute('data-club-picker')||b.hasAttribute('data-club-close')){picker.hidden=b.hasAttribute('data-club-close')||!picker.hidden;card.querySelector('.club-avatar-button').setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden)picker.querySelector('[aria-pressed=true]').focus();else card.querySelector('.club-avatar-button').focus();return;}
  if(b.dataset.clubIcon){const item=CLUB_ICONS.find(x=>x[0]===b.dataset.clubIcon);if(!item)return;DB.settings.clubAvatar=item[0];save(true);card.querySelector('.club-avatar-button').innerHTML=clubAvatarEditHTML(item);picker.querySelectorAll('[data-club-icon]').forEach(x=>{const on=x.dataset.clubIcon===item[0];x.setAttribute('aria-pressed',String(on));x.querySelector('.club-avatar').classList.toggle('club-animate',on)});clubObserveMotion();return;}
  if(b.hasAttribute('data-club-edit')){const g=document.querySelector('[data-club-group="profile"]');if(g){g.open=true;clubOpenGroups.add('profile');document.getElementById('youName')?.focus()}return;}
  if(b.hasAttribute('data-club-history')){view='history';lastView=null;render();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const card=document.querySelector('.club-card'),p=card?.querySelector('.club-picker');if(p&&!p.hidden){p.hidden=true;card.querySelector('.club-avatar-button').setAttribute('aria-expanded','false');card.querySelector('.club-avatar-button').focus()}}});

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
    <select id="mgTo" class="rzsel" style="margin-top:8px"><option value="">\u2026into this</option>${opt(_mg.to,_mg.from)}</select>
    ${_mg.from&&_mg.to?`<div class="note" style="margin-top:10px">${fmt(n)} set${n===1?'':'s'} will move to \u201c${canonName(_mg.to)}\u201d, and \u201c${canonName(_mg.from)}\u201d will become another name for it. There is no un-merge \u2014 you would have to re-log or restore a backup.</div>
    <button class="btn ghost" id="mgGo" style="margin-top:10px">Fold \u201c${canonName(_mg.from)}\u201d in</button>`:''}`;
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
      localStorage.setItem('showup:bak:prerestore', JSON.stringify(DB));
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
