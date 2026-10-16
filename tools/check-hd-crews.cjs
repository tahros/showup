// Verify every shipped HD page and produce a native-resolution visual QA sheet.
const fs=require('fs'),path=require('path'),assert=require('assert'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/crew/synced');
(async()=>{
 const m=JSON.parse(fs.readFileSync(path.join(dir,'frames.json'))),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const ids=['pip','bell','bag','headphones','band','bottle','roller','ball','plate','mat'];
 assert.deepEqual(Object.keys(m.crews).sort(),[...ids].sort());
 assert.equal(m.count,840);assert.equal(m.fps,60);assert.equal(m.cycleMs,14000);
 const layers=[];let bytes=0;
 for(const [index,id]of ids.entries()){
  const c=m.crews[id];assert.equal(c.x.length,840);assert(c.uniqueFrames>120);assert(c.maxContactError<.01);
  assert(c.x.every(x=>Number.isInteger(x)&&x>=0&&x<=1680));
  for(let p=0;p<14;p++){
   const name=id+(p?'-'+p:'')+'.webp',file=path.join(dir,name),meta=await sharp(file).metadata();
   assert.equal(meta.width,3840);assert.equal(meta.height,1920);assert(meta.hasAlpha);
   assert(sw.includes("'./assets/crew/synced/"+name+"'"),'offline cache includes '+name);
   bytes+=fs.statSync(file).size;
  }
  // Frame 150: native pixels, no enlargement or resampling for QA.
  const tile=await sharp(path.join(dir,id+'-2.webp')).extract({left:6*480,top:3*240,width:480,height:240}).png().toBuffer();
  layers.push({input:tile,left:index%2*480,top:Math.floor(index/2)*240});
 }
 const out=path.resolve(root,'../Crew-Final-Review/HD-Recovery-7s/All-Ten-HD-QA.png');
 await sharp({create:{width:960,height:1200,channels:4,background:'#d8dfeb'}}).composite(layers).png().toFile(out);
 console.log('PASS 140 HD pages; 840 frames per Crew; 60fps; 7s crossings; '+(bytes/1048576).toFixed(1)+' MB total');
 console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1;});
