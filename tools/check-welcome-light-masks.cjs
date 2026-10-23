// Real renderer regression for sunset-sky spill and broad facade darkening.
// PORT=8784 node tools/check-welcome-light-masks.cjs; ENGINE=webkit checks WebKit.
const {chromium,webkit}=require('playwright'),fs=require('fs'),assert=require('assert');
const BASE=process.env.BASE||`http://127.0.0.1:${process.env.PORT||8784}/`;
(async()=>{const engine=process.env.ENGINE||'chromium';const b=await(engine==='webkit'?webkit:chromium).launch({executablePath:engine==='webkit'?process.env.PW_WEBKIT:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.route(/\/js\/welcome-effects\.js(?:\?.*)?$/,async route=>{let s=process.env.MASK_SOURCE?fs.readFileSync(process.env.MASK_SOURCE,'utf8'):await(await route.fetch()).text();const name=s.match(/const (FACADE_LIGHTS_V\d+)=/)[1];s=s.replace('// Use pre-rendered,',`root.__lightQA={data:${name},draw:sceneLights};\n// Use pre-rendered,`);await route.fulfill({body:s,contentType:'application/javascript'});});
await p.goto(BASE);await p.waitForFunction(()=>document.querySelector('.ww-root')?.__lightQA);await p.evaluate(()=>onbWorldStop?.());
const results=await p.evaluate(()=>{const qa=document.querySelector('.ww-root').__lightQA,c=document.createElement('canvas');c.width=941;c.height=1672;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
// Independently selected sky gaps from the supplied screenshots, in original artwork coordinates.
const protectedAreas={manila:[[562,504,588,550],[622,525,633,560]],shanghai:[[309,650,332,680],[428,600,452,630]],nyc:[[660,580,679,602],[544,550,553,568],[696,610,709,626]]};
return Object.entries(qa.data).map(([city,list])=>{const permitted=new Uint8Array(941*1672);let duplicates=0;for(const p of list)for(const[x,y]of p.points){const pos=(p.y+y)*941+p.x+x;if(permitted[pos])duplicates++;permitted[pos]=1;}let spill=0,foreign=0,animated=false,previous=null;
for(const t of[0,1700,5900]){ctx.clearRect(0,0,941,1672);qa.draw(ctx,city,t);const data=ctx.getImageData(0,0,941,1672).data;let alpha=0;for(let i=0;i<permitted.length;i++){const a=data[i*4+3];alpha+=a;if(a&&!permitted[i])foreign++;}if(previous!==null&&previous!==alpha)animated=true;previous=alpha;for(const[l,top,r,bottom]of [[310,400,430,450],...(protectedAreas[city]||[])])for(let y=top;y<bottom;y++)for(let x=l;x<r;x++)if(data[(y*941+x)*4+3])spill++;}
return{city,lights:list.length,duplicates,spill,foreign,animated,maxArea:Math.max(...list.map(p=>p.points.length)),maxW:Math.max(...list.map(p=>p.w)),maxH:Math.max(...list.map(p=>p.h))};});});
assert.deepEqual(results.filter(r=>r.spill).map(r=>({city:r.city,paintedSkyPixels:r.spill})),[], 'lighting must never darken the reported sky gaps');
for(const r of results){assert.equal(r.spill,0,r.city+' lighting paints the protected sky');assert.equal(r.foreign,0,r.city+' atlas leaks outside mask');assert.equal(r.duplicates,0,r.city+' duplicate pixels');assert(r.maxArea<=320&&r.maxW<=26&&r.maxH<=36,r.city+' broad surface included');assert(r.animated,r.city+' lights should animate');console.log('PASS '+engine+' '+r.city+': transparent sky, bounded lights, no atlas spill, animation active');}
assert.deepEqual(errors,[]);console.log('LIGHT MASKS GREEN: '+results.length+' cities in '+engine);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
