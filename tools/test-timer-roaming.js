const fs=require('fs'),path=require('path'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=process.argv[2]||'.';let source=fs.readFileSync(path.join(root,'js/derive.js'),'utf8');
if(process.argv.includes('--probe-still'))source=source.replace('const roaming=','const roaming=false&&');
const dom=new JSDOM('<html class="bigtimer"><body><div id="hTimer"></div></body></html>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.$=s=>w.document.querySelector(s);w.DB={settings:{clubAvatar:'pip'}};w.todayISO='2026-10-15';w.lastSetAt=Date.now()-1000;w.view='home';w.day=()=>({w:[{at:w.lastSetAt,ex:'Run'}]});w.isLive=()=>true;w.clubAvatar=()=>[w.DB.settings.clubAvatar];w.isCardio=()=>true;w.cardioLine=()=> '1 mi';w.restSessionLine=()=>'';let reduce=false;w.matchMedia=()=>({matches:reduce});
w.eval(source.slice(source.indexOf('function tickRest(){'),source.indexOf('setInterval(tickRest,1000)')));
for(const id of ['pip','bell','bag','headphones','band','bottle','roller','ball','plate','mat']){
 w.DB.settings.clubAvatar=id;w.tickRest();const el=w.document.querySelector('.rt-buddy');assert.equal(el.getAttribute('src'),`assets/crew/roaming/${id}.webp`);assert(el.classList.contains('rt-roaming'));
 const bytes=fs.readFileSync(path.join(root,'assets/crew/roaming',id+'.webp'));assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes.includes(Buffer.from('ANIM')));assert(bytes.includes(Buffer.from('ANMF')));
}
const el=w.document.querySelector('.rt-buddy'),anchor=w.lastSetAt;w.tickRest();assert.strictEqual(w.document.querySelector('.rt-buddy'),el);assert.equal(w.lastSetAt,anchor);
reduce=true;w.tickRest();assert(el.src.includes('/white/'));reduce=false;
w.document.documentElement.dataset.mascotMotion='still';w.tickRest();assert(el.src.includes('/white/'));
w.document.documentElement.dataset.mascotMotion='animated';w.tickRest();el.onerror();assert(el.src.includes('/white/'));w.tickRest();assert(!el.classList.contains('rt-roaming'));
delete el.dataset.failedCrew;w.document.documentElement.classList.remove('bigtimer');w.tickRest();assert(el.src.includes('/white/'));
console.log('PASS timer roaming: ten animated assets, identity, stable clock, reduced motion, still, failure and portrait fallback');dom.window.close();
