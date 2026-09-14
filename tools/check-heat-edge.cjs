const {chromium,webkit}=require('playwright'),assert=require('assert');
(async()=>{const b=process.env.HEAT_BROWSER==='webkit'?await webkit.launch({headless:true,executablePath:process.env.HEAT_WEBKIT_EXE}):await chromium.launch({headless:true,executablePath:'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
try{for(const width of [320,393,430])for(const theme of ['light','dark']){
 const p=await b.newPage({viewport:{width,height:852},serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());await p.goto('http://127.0.0.1:8784/');await p.waitForTimeout(1200);
 await p.evaluate(theme=>{document.querySelector('#onb')?.remove();todayISO='2026-09-14';checkDate=()=>false;DB.settings={...DB.settings,theme,onboarded:true};DB.days={};for(let i=0;i<250;i++){const d=new Date(todayISO+'T12:00');d.setDate(d.getDate()-i);DB.days[d.toLocaleDateString('en-CA')]={w:[{ex:'Squat',part:'Legs',w:90,reps:[8],at:1}]};}SEED=deriveAll();applyTheme();view='stats';render();},theme);await p.waitForTimeout(450);
 for(const motion of ['no-preference','reduce']){await p.emulateMedia({reducedMotion:motion});await p.waitForTimeout(50);
 const result=await p.evaluate(()=>{const box=document.querySelector('.heatwrap'),cell=box.querySelector('.tod');const r=cell.getBoundingClientRect(),clip=box.getBoundingClientRect();const bottom=[...box.querySelectorAll('.hc')].reduce((n,e)=>Math.max(n,e.getBoundingClientRect().bottom),0);return {right:clip.right-r.right,bottom:clip.bottom-bottom,scroll:box.scrollLeft,width:box.clientWidth,content:box.scrollWidth};});
 console.log(width,theme,motion,result);assert(result.right>=3.5&&result.bottom>=3.5,'Today halo is fully inside the scroll viewport at maximum expansion');}
 if(width===393&&theme==='light'&&process.argv[2])await p.locator('.heatframe').screenshot({path:process.argv[2]});
 await p.close();
}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
