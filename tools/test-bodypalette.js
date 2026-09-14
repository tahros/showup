const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>({})});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
try{
 run("DB.settings={theme:'light',name:'Fixture',sex:'f',onboarded:true};DB.days={};DB.week={days:{'2026-09-16':[]}};checkDate=()=>false;settingsBaseline();applyTheme();view='sync';renderSync();");
 assert.equal(run('bodyPalette()'),'normal');assert.equal(w.document.documentElement.dataset.bodyPalette,'normal');
 assert.equal(w.document.querySelectorAll('[data-body-palette-pick]').length,2);assert.equal(w.document.querySelectorAll('.body-palette-preview span').length,8);
 run('day(todayISO)'); // Normal app rendering initializes the current empty day.
 const before=run('JSON.stringify({days:DB.days,week:DB.week,name:DB.settings.name,sex:DB.settings.sex})');
 w.document.querySelector('[data-body-palette-pick="neon"]').click();
 assert.equal(run('DB.settings.bodyPalette'),'neon');assert.equal(w.document.documentElement.dataset.bodyPalette,'neon');assert.equal(w.localStorage.getItem('showup-body-palette'),'neon');
 assert(run('DB.settingsAtK.bodyPalette>0'));assert.equal(run('settingsSnap().bodyPalette'),'"neon"');
 assert.equal(run('JSON.stringify({days:DB.days,week:DB.week,name:DB.settings.name,sex:DB.settings.sex})'),before);
 run("adoptRemoteSettings({settings:{bodyPalette:'normal'},settingsAt:Date.now()+10000,settingsAtK:{bodyPalette:Date.now()+10000}})");
 assert.equal(w.document.documentElement.dataset.bodyPalette,'normal');assert.equal(run('DB.settings.name'),'Fixture');
 run("DB.settings.bodyPalette='invalid';applyTheme()");assert.equal(w.document.documentElement.dataset.bodyPalette,'normal');
 console.log('PASS palette default, controls, safe persistence, per-key sync, remote repaint and unknown fallback');
}finally{dom.window.close();}
process.exit(0);
