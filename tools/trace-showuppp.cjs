/* Rebuild the approved custom lettering, not a font substitution.
 * node tools/trace-showuppp.cjs /path/to/approved-board.png
 * Authoring-only dependencies: sharp, potrace (never shipped to the app).
 * Source: exec-8841178d-eb37-49ae-8e04-b226ee8727bf.png, 2172 x 724.
 * Crops exclude mascot, shadows and captions. Solid ink removes raster grain.
 */
const sharp=require('sharp'),{trace}=require('potrace'),fs=require('fs'),path=require('path');
const source=process.argv[2];
if(!source)throw Error('Pass the approved 2172 x 724 brand board');
(async()=>{
 const meta=await sharp(source).metadata();
 if(meta.width!==2172||meta.height!==724)throw Error('Unexpected reference dimensions');
 for(const [name,box] of Object.entries({a:{left:390,top:250,width:345,height:230},c:{left:1760,top:250,width:350,height:232}})){
  const pixels=await sharp(source).extract(box).greyscale().threshold(128).png().toBuffer();
  const svg=await new Promise((resolve,reject)=>trace(pixels,{threshold:128,turdSize:8,optTolerance:.25,color:'#2c2c2c'},(e,s)=>e?reject(e):resolve(s)));
  const labelled=svg.replace('<svg ', '<svg role="img" aria-label="ShowUppp" ').replace(/<path /,'<title>ShowUppp — '+(name==='a'?'Sidekick':'Rising')+' lettering</title><path ');
  fs.writeFileSync(path.join(__dirname,'../assets/showuppp-'+name+'.svg'),labelled+'\n');
  console.log('Traced',name);
 }
})().catch(e=>{console.error(e);process.exit(1);});
