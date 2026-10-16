// Render the approved local 3D source at 60fps; never interpolate old images.
// Usage: node tools/render-synced-60.cjs [ShowUp workspace root] [crew id]
const fs=require('fs'),path=require('path'),http=require('http'),sharp=require('sharp'),{chromium}=require('playwright');
const {sourceSeconds}=require('./build-synced-crews.cjs');
const root=path.resolve(process.argv[2]||'..'),out=path.resolve(__dirname,'../assets/crew/synced');
const ids={pip:'pip',kettle:'bell',duffy:'bag',beats:'headphones',snap:'band',sip:'bottle',rolly:'roller',bounce:'ball',plato:'plate',matty:'mat'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(f,(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'text/html');res.end(e?'missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const manifestPath=path.join(out,'frames.json'),manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath)): {fps:60,count:600,cycleMs:10000,tileWidth:160,tileHeight:80,columns:20,crews:{}};
 try{for(const [kind,id]of Object.entries(ids)){
  if(process.argv[3]&&process.argv[3]!==id)continue;
  const page=await browser.newPage({viewport:{width:1080,height:498}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/Crew-Final-Review/'+(kind==='bounce'?'bounce-roaming-3d.html':'crew-roaming-3d.html?crew='+kind+'&angle=45'));await page.waitForFunction(()=>window.ready);
  const layers=[],xs=[],hashes=new Set();let maxContact=0;
  for(let i=0;i<600;i++){
   const t=sourceSeconds(i/600)%16;
   const data=await page.evaluate(({t,bounce})=>{const check=window.frame(bounce?t*1.25:t);return {check,png:document.querySelector('body > canvas').toDataURL('image/png').split(',')[1]};},{t,bounce:kind==='bounce'});
   maxContact=Math.max(maxContact,data.check.contactError||0);
   const {data:pixels,info}=await sharp(Buffer.from(data.png,'base64')).resize(720,80).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let min=720,max=0;for(let j=3;j<pixels.length;j+=4)if(pixels[j]>2){const x=((j-3)/4)%720;min=Math.min(min,x);max=Math.max(max,x);}
   if(max-min>=158)throw Error('Crop too narrow '+id+' frame '+i+' '+(max-min));
   const x=Math.max(0,Math.min(560,Math.floor((min+max)/2)-80));xs.push(x);
   const tile=await sharp(pixels,{raw:info}).extract({left:x,top:0,width:160,height:80}).png().toBuffer();
   hashes.add(require('crypto').createHash('sha256').update(tile).digest('hex'));
   layers.push({input:tile,left:(i%20)*160,top:Math.floor(i/20)*80});
   if(i%120===119)console.log(id,i+1+'/600');
  }
  if(errors.length||maxContact>.01)throw Error(JSON.stringify({errors,maxContact}));
  await sharp({create:{width:3200,height:2400,channels:4,background:'#00000000'}}).composite(layers).webp({quality:88}).toFile(path.join(out,id+'.webp'));
  manifest.crews[id]={x:xs,uniqueFrames:hashes.size,maxContactError:maxContact};
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));await page.close();console.log('RENDERED',id,hashes.size+' unique poses',fs.statSync(path.join(out,id+'.webp')).size+' bytes');
 }}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
