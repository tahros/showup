/* test-share-native.js DIR — v4.6.154: a card is shared as an IMAGE in the iOS app.
 * Faked: the ShowUpShare plugin the app registers natively (tools/ios-config.py),
 * navigator.share, and the card canvas. Real: every script in index.html order,
 * shareImageFiles, cardFileName, and the overlay's Share handler (#repDo).
 * In the iOS app, WKWebView's navigator.share gives the sheet a generic document
 * (no thumbnail, no Save Image); the plugin gives it a UIImage. Everywhere else,
 * and in an iOS build older than the plugin, the web share runs as before.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
const PNG=Buffer.from('89504e470d0a1a0a0000000d49484452','hex');   // enough of a PNG for the round trip
async function boot({shell=true,plugin=true,how='plugins',native='ok'}={}){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext(),nat=[],web=[];
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true}}));
  if(shell){
    const S={shareImages(o){nat.push(o);
      if(native==='fail')return Promise.reject(new Error('no view to present from'));
      return Promise.resolve({completed:native!=='dismissed',activity:native==='dismissed'?'':'com.apple.UIKit.activity.SaveToCameraRoll'});}};
    const Plugins={Filesystem:{}};
    const cap={isNativePlatform:()=>true,getPlatform:()=>'ios',Plugins,isPluginAvailable:n=>plugin&&how==='plugins'&&n==='ShowUpShare'};
    if(plugin&&how==='plugins') Plugins.ShowUpShare=S;
    if(plugin&&how==='headers'){ cap.PluginHeaders=[{name:'ShowUpShare',methods:[]}]; cap.nativePromise=(p,m,o)=>S[m](o); }
    w.Capacitor=cap;
  }
  w.navigator.canShare=()=>true;
  w.navigator.share=o=>{web.push(o);return Promise.resolve();};
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  for(let i=0;i<60;i++) await new Promise(r=>setTimeout(r,0));
  const run=c=>vm.runInContext(c,ctx);
  const settle=async()=>{for(let i=0;i<40;i++)await new Promise(r=>setTimeout(r,2));};
  w.__png=PNG;
  /* the overlay's current card: a canvas that yields our PNG */
  const card=(label,extra='')=>run(`_repCv={label:${JSON.stringify(label)},cv:{toBlob(cb,t){cb(new Blob([__png],{type:'image/png'}));},toDataURL(){return 'data:image/png;base64,';}}${extra}};
    let d=document.getElementById('repDo');if(!d){d=document.createElement('button');d.id='repDo';document.body.appendChild(d);}
    d.click();`);
  return {w,run,nat,web,settle,card,toast:()=>w.document.getElementById('toast')?.textContent||''};
}
(async()=>{
  const b64=PNG.toString('base64');
  { const b=await boot();
    b.card('showup-2026-09-28');await b.settle();
    ok('iOS app with the plugin: Share goes to the native sheet, once', b.nat.length===1, b.nat.length);
    ok('...as the card itself: base64 PNG, byte for byte', b.nat[0]&&b.nat[0].images.length===1&&b.nat[0].images[0]===b64);
    ok('...and not also to the web share', b.web.length===0, b.web.length);
    ok('...no error toast', !/Could not/.test(b.toast()), b.toast());
  }
  { const b=await boot({how:'headers'});
    b.card('926-days');await b.settle();
    ok('a bridge that only announces the plugin by header still reaches it', b.nat.length===1&&b.web.length===0);
  }
  { const b=await boot({native:'dismissed'});
    b.card('926-days');await b.settle();
    ok('closing the native sheet is nothing: no web share after it, no toast', b.nat.length===1&&b.web.length===0&&!/Could not/.test(b.toast()));
  }
  { const b=await boot({native:'fail'});
    b.card('926-days');await b.settle();
    ok('if the plugin fails before a sheet shows, the web share still runs', b.nat.length===1&&b.web.length===1);
  }
  { const b=await boot({plugin:false});
    b.card('showup-2026-09-28');await b.settle();
    ok('an iOS build older than the plugin keeps the web share', b.nat.length===0&&b.web.length===1);
    const name=b.web[0]&&b.web[0].files[0].name;
    ok('...and the file is named showup- once (was showup-showup-2026-09-28.png)', name==='showup-2026-09-28.png', name);
  }
  { const b=await boot({shell:false});
    b.card('926-days');await b.settle();
    ok('the web app (PWA) is unchanged: web share, one PNG file', b.nat.length===0&&b.web.length===1&&b.web[0].files[0].type==='image/png');
    ok('...named from the card', b.web[0]&&b.web[0].files[0].name==='showup-926-days.png', b.web[0]&&b.web[0].files[0].name);
  }
  { const b=await boot();
    b.run(`_repCv={label:'showup-stacked-2026-09-28',gifBlob:new Blob(['GIF89a'],{type:'image/gif'})};
      let d=document.getElementById('repDo');if(!d){d=document.createElement('button');d.id='repDo';document.body.appendChild(d);}d.click();`);
    await b.settle();
    ok('an animated GIF keeps the web share (a UIImage would freeze it)', b.nat.length===0&&b.web.length===1);
  }
  { const b=await boot();
    const how=await b.run(`shareImageFiles([1,2,3].map(i=>new File([__png],'c'+i+'.png',{type:'image/png'})))`);await b.settle();
    ok('save-all: every card to the native sheet at once', how==='native'&&b.nat.length===1&&b.nat[0].images.length===3, b.nat[0]&&b.nat[0].images.length);
    const how2=await b.run(`shareImageFiles([new File(['a,b'],'x.csv',{type:'text/csv'})])`);
    ok('a file that is not an image never goes to the image sheet', how2==='web'&&b.nat.length===1&&b.web.length===1, how2);
  }
  { const b=await boot({shell:false});
    b.w.navigator.share=()=>Promise.reject(Object.assign(new Error('x'),{name:'AbortError'}));
    let threw=false;try{await b.run(`shareImageFiles([new File([__png],'a.png',{type:'image/png'})])`);}catch(e){threw=true;}
    ok('closing the web sheet is not an error either', !threw);
    b.w.navigator.canShare=()=>false;
    const how=await b.run(`shareImageFiles([new File([__png],'a.png',{type:'image/png'})])`);
    ok('no share sheet at all: the caller is told to download (null)', how===null, how);
  }
  ok('cardFileName: one prefix, lower-case, safe', (await boot({shell:false})).run(`[cardFileName('showup-2026-09-28'),cardFileName('926 Days'),cardFileName('Showup-X')].join('|')`)==='showup-2026-09-28.png|showup-926-days.png|showup-x.png');
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
