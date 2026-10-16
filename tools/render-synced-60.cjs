// Render the approved local 3D source at 60fps; never interpolate old images.
// Usage: node tools/render-synced-60.cjs [ShowUp workspace root] [crew id]
const fs=require('fs'),path=require('path'),http=require('http'),sharp=require('sharp'),{chromium}=require('playwright');
const {sourceSeconds}=require('./build-synced-crews.cjs');
const {compositeCrewShadow}=require('./crew-shadow.cjs');
const root=path.resolve(process.argv[2]||'..'),out=path.resolve(__dirname,'../assets/crew/synced');
const ids={pip:'pip',kettle:'bell',duffy:'bag',beats:'headphones',snap:'band',sip:'bottle',rolly:'roller',bounce:'ball',plato:'plate',matty:'mat'};
const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(f,(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':'text/html');if(!e&&/\b(crew-roaming-3d.js|bounce-roaming-3d.html)$/.test(f))b=b.toString().replace('renderer.setSize(1080,120);','renderer.setPixelRatio(3);renderer.setSize(1080,120);').replace('renderer.setPixelRatio(1);','renderer.setPixelRatio(3);').replace('shadow.mapSize.set(2048,1024)','shadow.mapSize.set(4096,2048)').replace('color:0x351a20,opacity:.13','color:0x000000,opacity:.18').replace('window.frame(0);await document.fonts.ready;',`window.captureCrewBody=()=>{floor.visible=false;renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png').split(',')[1];floor.visible=true;return png;};window.frame(0);await document.fonts.ready;`);res.end(e?'missing':b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const browser=await chromium.launch({executablePath:process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const manifestPath=path.join(out,'frames.json'),manifest={fps:60,count:840,cycleMs:14000,tileWidth:480,tileHeight:240,columns:8,framesPerPage:60,pages:14,crews:{}};
 // CREW_SKIP resumes explicitly named, completed Crews from this same build.
 const skip=(process.env.CREW_SKIP||'').split(',').filter(Boolean);
 if((process.argv[3]||skip.length)&&fs.existsSync(manifestPath))manifest.crews=JSON.parse(fs.readFileSync(manifestPath)).crews;
 for(const id of skip)if(manifest.crews[id]?.x.length!==840)throw Error('Cannot skip incomplete Crew '+id);
 const jobs=Object.entries(ids).filter(([,id])=>!skip.includes(id));let cursor=0;
 try{await Promise.all(Array.from({length:Math.max(1,Math.min(2,Number(process.env.CREW_WORKERS)||1))},async()=>{while(cursor<jobs.length){const [kind,id]=jobs[cursor++];
  if(process.argv[3]&&process.argv[3]!==id)continue;
  const page=await browser.newPage({viewport:{width:1080,height:498}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+port+'/Crew-Final-Review/'+(kind==='bounce'?'bounce-roaming-3d.html':'crew-roaming-3d.html?crew='+kind+'&angle=45'));await page.waitForFunction(()=>window.ready);
  let layers=[];const xs=[],hashes=new Set();let maxContact=0,totalBytes=0;
  for(let i=process.env.CREW_PREVIEW?150:0;i<840;i++){
   const t=sourceSeconds(i/840)%16;
   const data=await page.evaluate(({t,bounce})=>{const check=window.frame(bounce?t*1.25:t);const png=document.querySelector('body > canvas').toDataURL('image/png').split(',')[1];return {check,png,body:window.captureCrewBody()};},{t,bounce:kind==='bounce'});
   maxContact=Math.max(maxContact,data.check.contactError||0);
   const source=sharp(Buffer.from(data.png,'base64')),size=await source.metadata();
   if(size.width!==3240||size.height!==360)throw Error('Not a native HD render: '+id);
   const {data:pixels,info}=await compositeCrewShadow(Buffer.from(data.png,'base64'),Buffer.from(data.body,'base64'),data.check.hop||0);
   if(process.env.CREW_PREVIEW){
    const file=path.join(root,'Crew-Final-Review/HD-Recovery-7s/'+id+'-shadow-preview.png');
    await sharp(pixels,{raw:info}).png().toFile(file);console.log('PREVIEW',file);break;
   }
   let min=2160,max=0;for(let j=3;j<pixels.length;j+=4)if(pixels[j]>2){const x=((j-3)/4)%2160;min=Math.min(min,x);max=Math.max(max,x);}
   if(max-min>=478)throw Error('Crop too narrow '+id+' frame '+i+' '+(max-min));
   const x=Math.max(0,Math.min(1680,Math.floor((min+max)/2)-240));xs.push(x);
   const tile=await sharp(pixels,{raw:info}).extract({left:x,top:0,width:480,height:240}).png().toBuffer();
   hashes.add(require('crypto').createHash('sha256').update(tile).digest('hex'));
   const local=i%60;
   layers.push({input:tile,left:(local%8)*480,top:Math.floor(local/8)*240});
   if(local===59){
    const pageNo=Math.floor(i/60),file=path.join(out,id+(pageNo?'-'+pageNo:'')+'.webp');
    await sharp({create:{width:3840,height:1920,channels:4,background:'#00000000'}}).composite(layers).webp({quality:95,alphaQuality:100,effort:4}).toFile(file);
    totalBytes+=fs.statSync(file).size;layers=[];
   }
   if(i%120===119)console.log(id,i+1+'/840');
  }
  if(errors.length||maxContact>.01)throw Error(JSON.stringify({errors,maxContact}));
  if(process.env.CREW_PREVIEW){await page.close();continue;}
  manifest.crews[id]={x:xs,uniqueFrames:hashes.size,maxContactError:maxContact};
  fs.writeFileSync(manifestPath,JSON.stringify(manifest));await page.close();console.log('RENDERED',id,hashes.size+' unique poses',totalBytes+' bytes');
 }}));}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
