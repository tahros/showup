const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({})});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
try{
 /* v4.6.326: the Body-part colors setting is retired (Sungjee, 2026-10-15): no picker, and Normal
    everywhere -- even for a profile or a synced device that still says Neon */
 run("DB.settings={theme:'light',name:'Fixture',sex:'f',onboarded:true,bodyPalette:'neon'};DB.days={};DB.week={days:{'2026-09-16':[]}};checkDate=()=>false;settingsBaseline();applyTheme();view='sync';renderSync();");
 assert.equal(run('bodyPalette()'),'normal');assert.equal(w.document.documentElement.dataset.bodyPalette,'normal');
 assert.equal(w.document.querySelectorAll('[data-body-palette-pick]').length,0);assert.equal(w.document.querySelectorAll('.body-palette-preview').length,0);
 assert(!/Body-part colors/.test(w.document.getElementById('view').textContent));
 run("adoptRemoteSettings({settings:{bodyPalette:'neon'},settingsAt:Date.now()+10000,settingsAtK:{bodyPalette:Date.now()+10000}})");
 assert.equal(w.document.documentElement.dataset.bodyPalette,'normal');assert.equal(run('DB.settings.name'),'Fixture');
 assert(!/'showup-body-palette'\)==='neon'/.test(html));
 console.log('PASS Body-part colors retired: no picker, Normal everywhere, a synced Neon stays Normal');
}finally{dom.window.close();}
process.exit(0);
