const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({})});for(const s of order)vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});const run=s=>vm.runInContext(s,ctx);
run(`DB={days:{'2025-01-01':{w:[{ex:'Squat',reps:[5,5],w:40}]},'2025-01-02':{w:[],rest:true}},settings:{name:'Test',sex:'f',bodyKg:60}};loadedOK=false;`);const before=run('JSON.stringify(DB)');run('clubEnsureIdentity()');assert.equal(run('JSON.stringify(DB)'),before);console.log('PASS identity does not save before storage load');
run('loadedOK=true;settingsBaseline();clubEnsureIdentity()');const identity=run('clubIdentity()'),icon=run('clubAvatar()[0]'),days=run('JSON.stringify(DB.days)');run('clubEnsureIdentity()');assert.equal(run('clubIdentity()'),identity);assert.equal(run('clubAvatar()[0]'),icon);assert.equal(run('JSON.stringify(DB.days)'),days);assert.equal(run('loggedDays()'),1);console.log('PASS stable random guest identity and distinct logged-day count');
run(`DB.settings.clubAvatar='headphones';save(true)`);assert.equal(run('clubAvatar()[0]'),'headphones');assert(run('DB.settingsAtK.clubAvatar>0'));assert.equal(run('DB.settings.name'),'Test');assert.equal(run('DB.settings.sex'),'f');assert.equal(run('DB.settings.bodyKg'),60);console.log('PASS avatar uses per-key save without overwriting profile');
run(`adoptRemoteSettings({settings:{clubAvatar:'bag'},settingsAt:Date.now()+1000,settingsAtK:{clubAvatar:Date.now()+1000}})`);assert.equal(run('clubAvatar()[0]'),'bag');assert.equal(run('JSON.stringify(DB.days)'),days);console.log('PASS newer remote icon syncs while history stays byte-identical');
run(`session={user:{id:'account-123',created_at:'2026-03-11T12:00:00Z'}}`);assert(run('clubCardHTML()').includes('MAR 2026'));assert(!run('clubCardHTML()').includes('JAN 2025'));const hash=run('clubHash(clubIdentity())');run(`DB.settings.clubGuest={id:'another-device',since:'2026-10-07'};DB.settings.clubAvatar='not-valid'`);assert.equal(run('clubHash(clubIdentity())'),hash);assert(run('CLUB_ICONS.some(i=>i[0]===clubAvatar()[0])'));console.log('PASS account identity stable across devices, since never from workout import');
run(`session.user.created_at='invalid'`);assert(run('clubCardHTML()').includes('class="club-since">—</strong>'));console.log('PASS missing join date is honest');
run(`session={user:{id:'owner-fixture',email:'sungjee.u@gmail.com',created_at:'2026-09-01'}}`);
assert(run('clubCardHTML()').includes('class="club-number">—</strong>'));
run(`clubMembershipCache.set(clubMembershipKey(),{member_no:'0',joined_at:'2026-09-01'})`);
assert(run('clubCardHTML()').includes('class="club-number">000000</strong>'));assert(run('clubCardHTML()').includes('class="club-since">SEP 2026</strong>'));
assert(!run('clubCardHTML()').includes('Here for the long run.'));assert(!run('clubCardHTML()').includes('Change icon'));assert(run('clubAvatarEditHTML(clubAvatar())').includes('club-avatar-edit'));
run(`session.user.id='another-account';session.user.email='sungjee.u@gmail.com';DB.settings.name='Sungjee Yoo'`);assert(!run('clubCardHTML()').includes('class="club-number">000000</strong>'));assert(!run('clubCardHTML()').includes('>v1.0</strong>'));console.log('PASS founder identity requires server record, not email or display name; avatar edit survives rendering');
assert.equal(run('CLUB_ICONS.length'),9);assert.equal(new Set(JSON.parse(run('JSON.stringify(CLUB_ICONS.map(i=>i[0]))'))).size,9);console.log('PASS exactly nine unique icons');
(async()=>{
 for(const [n,display] of [['0','000000'],['1','000001'],['28','000028'],['980','000980'],['12486','012486'],['1000000','1000000'],['9223372036854775807','9223372036854775807']]){
  const f=JSON.parse(run(`JSON.stringify(clubNumberFormats('${n}'))`));assert.equal(f.number,display);assert.equal(f.reference,'SUP-'+display);assert.equal(f.badge,'SUP–'+display);
 }
 assert.equal(run(`clubNumberFormats('not-a-number')`),null);
 run(`session={user:{id:'utc-test',created_at:'2026-10-01T00:30:00Z'}}`);assert.equal(run('clubMembershipFacts().since'),'OCT 2026');
 console.log('PASS six-digit minimum, lossless bigint, badge/reference punctuation and UTC month');
 await new Promise(r=>setTimeout(r,100));
 const asyncDays=run('JSON.stringify(DB.days)');
 run(`session={access_token:'synthetic-token',user:{id:'late-account',created_at:'2026-03-11'}};document.querySelector('#view').innerHTML=clubCardHTML()`);
 let resolve,calls=0;w.fetch=()=>{calls++;return new Promise(r=>resolve=r)};
 const request=run('clubLoadMembership()'),second=run('clubLoadMembership()');assert.equal(calls,1);
 run(`session.user.id='other-account';document.querySelector('#view').innerHTML=clubCardHTML()`);
 resolve({ok:true,json:async()=>[{member_no:'37',joined_at:'2026-03-11'}]});await request;await second;
 assert.equal(w.document.querySelector('.club-number').textContent,'—');
 run(`session.user.id='late-account';document.querySelector('#view').innerHTML=clubCardHTML()`);
 assert.equal(w.document.querySelector('.club-number').textContent,'000037');assert.equal(run('JSON.stringify(DB.days)'),asyncDays);
 console.log('PASS deduplicated registry fetch, account switching and unchanged workout history');
 run(`session.user.id='unavailable';document.querySelector('#view').innerHTML=clubCardHTML()`);w.fetch=async()=>{throw Error('offline')};await run('clubLoadMembership()');assert.equal(w.document.querySelector('.club-number').textContent,'—');
 w.fetch=async()=>({ok:true,json:async()=>[{member_no:'<img>',joined_at:'2026-03-11'}]});await run('clubLoadMembership()');assert.equal(w.document.querySelector('.club-number').textContent,'—');
 w.fetch=async()=>({ok:true,json:async()=>[{member_no:'42',joined_at:'2026-03-11'}]});await run('clubLoadMembership()');assert.equal(w.document.querySelector('.club-number').textContent,'000042');
 console.log('PASS offline and malformed response safe; retry recovers server number');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
