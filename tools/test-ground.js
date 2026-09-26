/* test-ground.js DIR — v4.6.143: the iOS app paints behind the page in the theme's ground.
 * Found on the phone: in dark mode, pulling past the bottom of Today showed a
 * pale band -- the native web view's own colour (capacitor.config.json). Now
 * applyTheme() tells the ShowUpChrome plugin (tools/ios-config.py) the theme's
 * --ground as #RRGGBB. Faked: the plugin. Real: every script, applyTheme, the CSS. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const css=['css/app.css'].map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');
async function boot({shell=true,plugin=true,how='plugins'}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,'').replace(/<link[^>]*stylesheet[^>]*>/g,'')+`<style>${css}</style>`,{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),calls=[];
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true,theme:'dark'}}));
  if(shell){
    const C={setGround(o){calls.push(o.color);return Promise.resolve(o);}};
    const cap={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins:{Filesystem:{}},isPluginAvailable:n=>plugin&&how==='plugins'&&n==='ShowUpChrome'};
    if(plugin&&how==='plugins')cap.Plugins.ShowUpChrome=C;
    if(plugin&&how==='headers'){cap.PluginHeaders=[{name:'ShowUpChrome',methods:[]}];cap.nativePromise=(p,m,o)=>C[m](o);}
    w.Capacitor=cap;
  }
  w.matchMedia=q=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.fetch=()=>Promise.reject(new Error('offline'));w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  for(let i=0;i<40;i++) await new Promise(r=>setTimeout(r,0));
  return {run:c=>vm.runInContext(c,ctx),calls};
}
(async()=>{
 { const b=await boot();
   b.run(`DB.settings.theme='dark';applyTheme();`);
   ok('dark: the native ground is the dark page colour', b.calls.at(-1)==='#0A0A0A', JSON.stringify(b.calls));
   const n=b.calls.length;b.run('applyTheme();applyTheme();');
   ok('told once per colour, not on every apply', b.calls.length===n);
   b.run(`DB.settings.theme='light';applyTheme();`);
   ok('light: the light page colour', b.calls.at(-1)==='#EFEFEF', JSON.stringify(b.calls));
 }
 { const b=await boot({how:'headers'});b.run(`DB.settings.theme='dark';applyTheme();`);
   ok('reached through the bridge header when no proxy exists', b.calls.at(-1)==='#0A0A0A'); }
 { const b=await boot({plugin:false});b.run(`applyTheme();`);
   ok('an older iOS build without the plugin: nothing called', b.calls.length===0); }
 { const b=await boot({shell:false});
   ok('the website: nothing native', b.run('groundNative()')===null && b.calls.length===0); }
 const cfg=JSON.parse(fs.readFileSync(path.join(dir,'capacitor.config.json'),'utf8'));
 ok("before the page loads, the web view is the dark ground (the app's default theme)", cfg.ios.backgroundColor==='#0A0A0A');
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
