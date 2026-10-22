/* test-membership-store.js DIR — v4.6.385: the App Store membership (runbook 9.8).
 * Real: every script in index.html order. Faked: fetch, and in the "iOS" boots
 * window.Capacitor with a RevenueCat Purchases plugin that keeps a customer in
 * memory (configure, logIn/logOut, getOfferings, purchasePackage, restore).
 * Asserts: the paywall is on in the iOS app and off on the web; founding closes on
 * FOUNDING_UNTIL; buying, cancelling, restoring, expiry and a billing issue all
 * land in showup:entitlement (the record every gate reads); the account follows
 * sign-in; the App Store's local prices reach the paywall; test mode never
 * touches the store. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const settle=async(n=40)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0));};
const TODAY='2026-10-20', YEAR=365*864e5;
const iso=n=>{const d=new Date(TODAY+'T12:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
const S=()=>({part:'Legs',ex:'Squat',w:100,reps:[5],at:Date.now()-864e5});
function record(n){ const days={}; for(let i=1;i<=n;i++) days[iso(i*2)]={w:[S()]}; return days; }
const product=(id,price,str,perMonth)=>({identifier:id,price,priceString:str,pricePerMonthString:perMonth,currencyCode:'CAD'});
const PKGS=[
  {identifier:'$rc_monthly',packageType:'MONTHLY',product:product('co.yooooooooo.showup.member.monthly',6.99,'CA$6.99','CA$6.99'),presentedOfferingContext:{offeringIdentifier:'default'}},
  {identifier:'$rc_annual',packageType:'ANNUAL',product:product('co.yooooooooo.showup.member.yearly',39.99,'CA$39.99','CA$3.33'),presentedOfferingContext:{offeringIdentifier:'default'}}];
function fakeStore(){
  const S={calls:[],user:null,active:null,next:'ok'};
  const ci=()=>({entitlements:{active:S.active?{member:S.active}:{},all:{}},activeSubscriptions:S.active?[S.active.productIdentifier]:[]});
  const ent=(pid,extra={})=>({identifier:'member',isActive:true,willRenew:true,productIdentifier:pid,isSandbox:true,
    expirationDateMillis:Date.now()+(/month/.test(pid)?30*864e5:YEAR),originalPurchaseDateMillis:Date.now(),...extra});
  S.ent=ent;
  S.P={
    configure:async o=>{S.calls.push(['configure',o]);S.user=o.appUserID||'$RCAnonymousID:x';},
    setAttributes:async o=>{S.calls.push(['setAttributes',o]);},
    logIn:async o=>{S.calls.push(['logIn',o.appUserID]);S.user=o.appUserID;return {customerInfo:ci(),created:false};},
    logOut:async()=>{S.calls.push(['logOut']);S.user='$RCAnonymousID:y';S.active=null;return {customerInfo:ci()};},
    getCustomerInfo:async()=>{S.calls.push(['getCustomerInfo']);return {customerInfo:ci()};},
    getOfferings:async()=>{S.calls.push(['getOfferings']);return {current:{identifier:'default',availablePackages:PKGS},all:{}};},
    purchasePackage:async o=>{S.calls.push(['purchasePackage',o.aPackage?.identifier]);
      if(S.next==='cancel'){const e=new Error('Purchase was cancelled.');e.code='1';e.userCancelled=true;throw e;}
      if(S.next==='fail'){const e=new Error('The App Store is unavailable');e.code='2';throw e;}
      S.active=ent(o.aPackage.product.identifier);return {productIdentifier:o.aPackage.product.identifier,customerInfo:ci()};},
    restorePurchases:async()=>{S.calls.push(['restorePurchases']);return {customerInfo:ci()};},
  };
  return S;
}
async function boot({ios=false,sandbox=false,days={},settings={},store={},today=TODAY,S=null}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),toasts=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days,settings:{onboarded:true,unit:'lb',...settings}}));
  w.localStorage.setItem('showup:device','11111111-2222-4333-8444-555555555555');
  if(sandbox) w.localStorage.setItem('showup:sandbox','1');
  for(const [k,v] of Object.entries(store)) w.localStorage.setItem(k,v);
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  w.Element.prototype.animate=undefined;
  if(ios) w.Capacitor={isNativePlatform:()=>true,isPluginAvailable:n=>n==='Purchases'&&!!S,Plugins:S?{Purchases:S.P}:{},PluginHeaders:S?[{name:'Purchases'}]:[]};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  const run=c=>vm.runInContext(c,ctx);
  run(`todayISO='${today}';checkDate=()=>false;SEED=deriveAll();toast=(m)=>{window.__t=(window.__t||[]);window.__t.push(String(m));};`);
  await settle(60);
  return {w,run,d:w.document,ent:()=>JSON.parse(w.localStorage.getItem('showup:entitlement')||'null'),toasts:()=>w.__t||[],S};
}
(async()=>{
 /* the web: no paywall, founding until the date */
 { const b=await boot({days:record(25)});
   ok('web: the paywall is off', b.run('paywallOn()')===false && b.run('trialOver()')===false);
   ok('web: no store', b.run('rcPlugin()')===null);
   ok('web: Continue says the App Store version', await b.run(`memberBuy('yearly')`)==='unavailable');
   ok('web: a record is still marked founding before FOUNDING_UNTIL', b.run('foundingMark()')===true);
 }
 { const b=await boot({days:record(5),today:'2026-11-15'});
   ok('web: founding closes on FOUNDING_UNTIL (nobody new is marked)', b.run('foundingMark()')===false && !b.run('DB.settings.founding'));
 }
 { const b=await boot({days:record(5),today:'2026-11-15',settings:{founding:'2026-10-01'}});
   ok('founding marked before the date stays founding for good', b.run('memberFounding()')===true);
 }
 /* the iOS app */
 { const S=fakeStore(); const b=await boot({ios:true,S,days:record(25)});
   ok('iOS: the paywall is on', b.run('paywallOn()')===true && b.run('paywallLive()')===true);
   ok('iOS: founding is not marked in the app', b.run('foundingMark()')===false);
   await b.run('rcStart()'); await settle();
   const cfg=S.calls.find(c=>c[0]==='configure');
   ok('iOS: RevenueCat starts with the public key, anonymous when signed out', cfg&&/^appl_/.test(cfg[1].apiKey)&&!('appUserID' in cfg[1]), JSON.stringify(cfg));
   ok('iOS: the device id goes along for the funnel', S.calls.some(c=>c[0]==='setAttributes'&&c[1].showup_device==='11111111-2222-4333-8444-555555555555'));
   ok('iOS: 25 logged days, no membership: the trial is over', b.run('trialOver()')===true);
   b.run(`dayGate(todayISO)`); await settle();
   ok('iOS: a new day opens the paywall', !!b.d.getElementById('paywall'));
   await settle(80);
   ok('iOS: the App Store\'s local prices replace the US ones', /CA\$39\.99/.test(b.d.getElementById('paywall')?.textContent||'') && b.run(`MB_PRICES.find(p=>p.plan==='yearly').note`)==='CA$3.33 a month, billed yearly', b.run('JSON.stringify(MB_PRICES)'));
   ok('iOS: the saving is worked out from the two prices', b.run(`MB_PRICES.find(p=>p.plan==='yearly').badge`)==='Save 52%', b.run(`MB_PRICES.find(p=>p.plan==='yearly').badge`));
   S.next='cancel';
   ok('iOS: cancelling the Apple sheet is quiet and buys nothing', await b.run(`memberBuy('yearly')`)==='cancelled' && !b.ent() && !b.toasts().length, JSON.stringify(b.toasts()));
   S.next='fail';
   ok('iOS: a failed purchase says nothing was charged', await b.run(`memberBuy('yearly')`)==='failed' && /Nothing was charged/.test(b.toasts().pop()||''));
   S.next='ok';
   const r=await b.run(`memberBuy('yearly')`);
   ok('iOS: Continue buys the yearly package', r==='bought' && S.calls.some(c=>c[0]==='purchasePackage'&&c[1]==='$rc_annual'), r);
   const e=b.ent();
   ok('iOS: the purchase lands in showup:entitlement', e&&e.status==='active'&&e.plan==='yearly'&&e.store==='apple'&&e.renews===true&&e.until>Date.now()+300*864e5, JSON.stringify(e));
   ok('iOS: a member passes the gate', b.run('memberEntitled()')===true && b.run('trialOver()')===false && b.run('dayGate(todayISO)')===true);
   /* expiry: Apple says it is no longer active */
   S.active=null; await b.run('rcRefresh()');
   ok('iOS: an expired membership is cleared on refresh', !b.ent() && b.run('trialOver()')===true);
   /* billing issue */
   S.active=S.ent('co.yooooooooo.showup.member.monthly',{billingIssueDetectedAtMillis:Date.now(),willRenew:true}); await b.run('rcRefresh()');
   ok('iOS: a billing issue is grace, still a member', b.ent()?.status==='grace' && b.ent()?.plan==='monthly' && b.run('memberEntitled()')===true);
   /* cancelled but paid through */
   S.active=S.ent('co.yooooooooo.showup.member.monthly',{willRenew:false}); await b.run('rcRefresh()');
   ok('iOS: cancelled keeps membership to the end, shown as not renewing', b.ent()?.renews===false && b.run('memberEntitled()')===true);
   /* the account follows sign-in */
   b.run(`session={user:{id:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'},access_token:'t'}`); await b.run('rcRefresh()');
   ok('iOS: signing in logs the store in as the account', S.calls.some(c=>c[0]==='logIn'&&c[1]==='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'));
   b.run(`session=null`); await b.run('rcRefresh()');
   ok('iOS: signing out logs the store out', S.calls.some(c=>c[0]==='logOut'));
 }
 { const S=fakeStore(); S.active=S.ent('co.yooooooooo.showup.member.yearly');
   const b=await boot({ios:true,S,days:record(25)}); await b.run('rcStart()'); await settle();
   ok('iOS: an existing purchase is picked up at start', b.run('memberEntitled()')===true && b.ent()?.plan==='yearly');
 }
 { const S=fakeStore(); const b=await boot({ios:true,S,days:record(25)}); await b.run('rcStart()');
   ok('iOS: restore with nothing to restore says so', await b.run('memberRestore()')==='none' && /No membership found/.test(b.toasts().pop()||''));
   S.active=S.ent('co.yooooooooo.showup.member.monthly');
   ok('iOS: restore finds the Apple ID\'s membership', await b.run('memberRestore()')==='restored' && b.ent()?.plan==='monthly');
 }
 { const S=fakeStore(); const b=await boot({ios:true,S,days:record(25),settings:{founding:'2026-10-01'}});
   ok('iOS: a founding member is never asked to pay', b.run('trialOver()')===false && b.run('dayGate(todayISO)')===true);
 }
 { const S=fakeStore(); const b=await boot({ios:true,sandbox:true,S,days:record(25)});
   ok('test mode: the store is never touched', b.run('rcPlugin()')===null && !S.calls.length);
   ok('test mode: Continue is still the free test purchase', await b.run(`memberBuy('yearly')`)==='test');
 }
 { const b=await boot({ios:true,S:null,days:record(25)});
   ok('a binary without the plugin cannot sell: Continue says so instead of failing', await b.run(`memberBuy('yearly')`)==='unavailable');
 }
 console.log(fails?`\n${fails} FAILED`:'\nALL PASS'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
