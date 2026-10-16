// Recover the ground-shadow matte from matched full/body-only 3D passes.
// Never blur the character, replace its silhouette, or invent an ellipse.
const sharp=require('sharp');
async function compositeCrewShadow(fullPng,bodyPng,hop=0){
 const resize=input=>sharp(input).resize(2160,240).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const [full,body]=await Promise.all([resize(fullPng),resize(bodyPng)]);
 const matte=Buffer.alloc(full.data.length);
 for(let i=3;i<matte.length;i+=4){
  const b=body.data[i]/255,f=full.data[i]/255;
  // A(full) = A(body) + A(shadow) * (1 - A(body)).
  matte[i]=b>=.995?0:Math.round(255*Math.max(0,Math.min(.18,(f-b)/(1-b))));
 }
 const shadow=await sharp(matte,{raw:full.info}).blur(4+Math.max(0,hop)*.3).png().toBuffer();
 const png=await sharp(shadow).composite([{input:body.data,raw:body.info}]).png().toBuffer();
 return sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
}
module.exports={compositeCrewShadow};
