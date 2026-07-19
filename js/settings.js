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
    <h2>Bars &amp; bodyweight</h2>
    <div class="card">
      <div class="row" style="gap:8px">
        <div class="fld" style="flex:1"><label>Barbell (${U()})</label>
          <input id="barW" type="number" inputmode="decimal" step="0.5" value="${wDisp(DB.settings.barKg??20)}"></div>
        <div class="fld" style="flex:1"><label>Smith bar (${U()})</label>
          <input id="smithW" type="number" inputmode="decimal" step="0.5" value="${wDisp(DB.settings.smithKg??20)}"></div>
        <div class="fld" style="flex:1"><label>Bodyweight (${U()})</label>
          <input id="bodyW" type="number" inputmode="decimal" step="0.5" value="${DB.settings.bodyKg?wDisp(DB.settings.bodyKg):''}" placeholder="—"></div>
      </div>
      <div class="note">Logged weight is the total including the bar, so per-side = (total − bar) ÷ 2. Set the Smith bar to 0 if you log Smith work as plates only. Bodyweight isn't a bar — it's what Pull Up, Dip and other bodyweight lifts count as.</div>
      <button class="btn" id="barSave" style="margin-top:10px">Save</button>
    </div>
    <h2>Your data</h2>
    <div class="card">
      <div class="note" style="margin-bottom:10px">${fmt(Object.keys(DB.days).filter(d=>(DB.days[d].w||[]).length).length)} days on this device — yours to take anywhere. Weights export in kg, distance in km (the stored truth), whatever the display unit.</div>
      <div class="row" style="gap:8px">
        <button class="btn ghost" id="expCsv" style="flex:1;margin:0">CSV ↓</button>
        <button class="btn ghost" id="expSheet" style="flex:1;margin:0">Copy for Sheets</button>
      </div>
      <div class="row" style="gap:8px;margin-top:8px">
        <button class="btn ghost" id="expJson" style="flex:1;margin:0">Backup ↓</button>
        <button class="btn ghost" id="impJson" style="flex:1;margin:0">Restore…</button>
      </div>
      <input type="file" id="impFile" accept=".json,application/json" hidden>
    </div>
    <div class="note" style="text-align:center;margin-top:18px;opacity:.7">ShowUp ${APP_VERSION}</div>`;
}


/* ---------- v3.3: data out ---------- */
const EXP_HEAD=['date','part','exercise','weight_kg','reps','set_no','mins','secs','distance_km'];
function exportRows(){
  const out=[];
  for(const d of Object.keys(DB.days).sort()){
    for(const s of (DB.days[d].w||[])){
      if(s.ex==='Run') out.push([d,'Run','Run','','','',s.mins||0,s.secs||0,s.w||0]);
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
      doc.settings=doc.settings||{};
      if(DB.settings.cloud&&!doc.settings.cloud) doc.settings.cloud=DB.settings.cloud;   // keep this device's DB config
      const now=Date.now();
      for(const d of Object.keys(doc.days)) doc.days[d].upd=now;                          // restore wins LWW everywhere
      DB=doc; save();
      toast('Restored — reloading');
      setTimeout(()=>{ try{location.reload();}catch(e){} },600);
    }catch(e){ toast('Not a ShowUp backup file'); }
  };
  rd.readAsText(file);
}
document.addEventListener('click',e=>{
  if(e.target.id==='expCsv'){ dlFile('showup-export-'+todayISO+'.csv','text/csv',tableText(',')); return; }
  if(e.target.id==='expSheet'){ copyForSheets(); return; }
  if(e.target.id==='expJson'){ dlFile('showup-backup-'+todayISO+'.json','application/json',
    JSON.stringify({app:'showup',v:APP_VERSION,exported:new Date().toISOString(),doc:DB})); return; }
  if(e.target.id==='impJson'){ const i=document.getElementById('impFile'); if(i) i.click(); return; }
});
document.addEventListener('change',e=>{
  if(e.target.id==='impFile'&&e.target.files&&e.target.files[0]){
    restoreBackup(e.target.files[0]); e.target.value='';
  }
});
