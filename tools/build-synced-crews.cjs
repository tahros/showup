// Resample the approved 16-second 3D renders into seekable 120-frame atlases.
// Runtime maps these frames to a ten-second cycle: arrival every five seconds.
const sharp=require('sharp'),fs=require('fs'),path=require('path');
(async()=>{
 const root=path.resolve(process.argv[2]||'.'),out=path.join(root,'assets/crew/synced');fs.mkdirSync(out,{recursive:true});
 for(const id of ['pip','bell','bag','headphones','band','bottle','roller','ball','plate','mat']){
  const input=path.join(root,'assets/crew/roaming',id+'.webp'),meta=await sharp(input,{animated:true}).metadata();
  let t=0;const starts=meta.delay.map(d=>{const s=t;t+=d;return s;});const layers=[];
  for(let i=0;i<120;i++){
   const p=i/20;
   const sec=p<.4?13.5+p/.4*4.5:p<3?18+(p-.4)/2.6*4.3:p<3.4?6.3+(p-3)/.4*2.7:9+(p-3.4)/2.6*4.5;
   const page=starts.findLastIndex(s=>s<=(sec%16)*1000);
   layers.push({input:await sharp(input,{page,pages:1}).resize(720,80).png().toBuffer(),left:(i%4)*720,top:Math.floor(i/4)*80});
  }
  // A grid stays within conservative mobile texture dimension limits.
  await sharp({create:{width:2880,height:2400,channels:4,background:'#00000000'}}).composite(layers).webp({quality:88}).toFile(path.join(out,id+'.webp'));
  console.log('Built',id);
 }
})().catch(e=>{console.error(e);process.exit(1);});
