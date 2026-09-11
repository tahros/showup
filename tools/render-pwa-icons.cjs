// Approved C: white mascot on ShowUp Blue. Compose the approved identity crop;
// no new geometry, effects, or baked-in OS corner mask.
// NODE_PATH=<canvas installation> node tools/render-pwa-icons.cjs
const {createCanvas,loadImage}=require('canvas');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
 const mascot=await loadImage(path.join(root,'assets/mascot-mark-white.png'));
 for(const [name,size,scale] of [
  ['app-icon-blue-192.png',192,.82],['app-icon-blue-512.png',512,.82],
  ['app-icon-blue-maskable-512.png',512,.66],
  ['apple-touch-icon-blue.png',180,.82],['favicon-blue-32.png',32,.82]
 ]){
  const canvas=createCanvas(size,size),ctx=canvas.getContext('2d');
  ctx.fillStyle='#3049dc';ctx.fillRect(0,0,size,size);
  const inset=size*(1-scale)/2;
  ctx.drawImage(mascot,inset,inset,size*scale,size*scale);
  const pixels=ctx.getImageData(0,0,size,size).data;
  for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255,'Installed icons must be opaque');
  // Every non-background pixel fits the central 80%-diameter safe circle.
  if(name.includes('maskable'))for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=(y*size+x)*4;
   if(pixels[i]!==48||pixels[i+1]!==73||pixels[i+2]!==220)
    assert(Math.hypot(x+.5-size/2,y+.5-size/2)<=size*.4,'Mascot exceeds maskable safe zone');
  }
  fs.writeFileSync(path.join(root,name),canvas.toBuffer('image/png'));
  console.log(`${name}: ${size}x${size}, opaque${name.includes('maskable')?', safe circle verified':''}`);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
