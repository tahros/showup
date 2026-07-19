/* ShowUp — settings.js
   Extracted verbatim from index.html (v3.2.5 refactor). Classic script:
   shares one global scope with its siblings, loaded in order by index.html. */
/* ---------- Sync (GitHub) ---------- */
function renderSync(){
  $('#view').innerHTML=`
    <button class="back">← Back</button>
    ${!session&&Object.keys(DB.days).some(d=>DB.days[d].w&&DB.days[d].w.length)?`
    <div class="card" style="border-color:var(--record)"><b>Not syncing.</b>
      <div class="note" style="margin-top:4px">Workouts logged on this device stay on this device until you sign in below. If the app is ever deleted or reinstalled, unsynced data is lost.</div></div>`:''}
    <h2>Display</h2>
    <div class="card"><div class="row" style="gap:8px">
      <button class="btn ghost" id="unitBtn" style="flex:1;margin:0">${isLb()?'lb · mi':'kg · km'}</button>
      <button class="btn ghost" id="themeBtn" style="flex:1;margin:0">${DB.settings.theme==='light'?'Light ◐':'Dark ◐'}</button>
    </div></div>
    <h2>Account & cloud sync</h2>
    <div class="card">
      ${session?`
        <div class="row spread" style="margin-bottom:10px">
          <span><b>${session.user.email||'Signed in'}</b>
            <div class="note" style="margin:2px 0 0">Devices sync on open and on return, day by day — the newest edit of each day wins everywhere, so deletions travel too. Every change pushes ~1s later, and pull-to-refresh force-pushes before reloading.</div>
        <div class="note" style="margin:6px 0 0">Your full history — ${fmt(SEED.totals.sessions)} days · ${SEED.totals.km} km — lives in doc.days as the single source of truth (v3.0).</div></span>
        </div>
        <div class="note">Database: ${cloudCfg().url}<br>Last cloud sync: ${DB.settings.lastCloud?new Date(DB.settings.lastCloud).toLocaleString():'—'}</div>
        <div class="row" style="gap:8px;margin-top:10px">
          <button class="btn ghost" id="cloudPullBtn" style="margin:0">Pull ↓</button>
          <button class="btn ghost" id="signOutBtn" style="margin:0">Sign out</button>
        </div>`
      :`
        ${cloudReady()?`
          <button class="btn" id="googleBtn" style="margin:0">Continue with Google</button>
          <div class="note" style="margin-top:8px">Your data stays on this device until you sign in. Signing in syncs it to your own database, private to your Google account.</div>`
        :`
          <div class="fld text" style="margin-bottom:8px"><label>Supabase project URL</label>
            <input id="cloudUrl" value="${DB.settings.cloud?.url||''}" placeholder="https://xxxx.supabase.co" autocapitalize="off"></div>
          <div class="fld text"><label>Anon public key</label>
            <input id="cloudAnon" value="${DB.settings.cloud?.anon||''}" placeholder="eyJhbGciOi…" autocapitalize="off"></div>
          <button class="btn" id="cloudSave" style="margin-top:10px">Save & enable cloud</button>
          <div class="note" style="margin-top:8px">One-time setup — see INSTALL.md — create the free database, run one SQL file, switch on Google sign-in.</div>`}
      `}
    </div>
    <h2>Bar weights</h2>
    <div class="card">
      <div class="row" style="gap:8px">
        <div class="fld" style="flex:1"><label>Barbell (${U()})</label>
          <input id="barW" type="number" inputmode="decimal" step="0.5" value="${wDisp(DB.settings.barKg??20)}"></div>
        <div class="fld" style="flex:1"><label>Smith bar (${U()})</label>
          <input id="smithW" type="number" inputmode="decimal" step="0.5" value="${wDisp(DB.settings.smithKg??20)}"></div>
        <div class="fld" style="flex:1"><label>Bodyweight (${U()})</label>
          <input id="bodyW" type="number" inputmode="decimal" step="0.5" value="${DB.settings.bodyKg?wDisp(DB.settings.bodyKg):''}" placeholder="—"></div>
      </div>
      <div class="note">Logged weight is the total including the bar, so per-side = (total − bar) ÷ 2. Set the Smith bar to 0 if you log Smith work as plates only.</div>
      <button class="btn" id="barSave" style="margin-top:10px">Save bar weights</button>
    </div>
    <div class="note" style="text-align:center;margin-top:18px;opacity:.7">ShowUp ${APP_VERSION}</div>`;
}
