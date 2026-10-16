const assert=require('assert'),sharp=require('sharp');
const {compositeCrewShadow}=require('./crew-shadow.cjs');
(async()=>{
 const width=2160,height=240,body=Buffer.alloc(width*height*4),full=Buffer.alloc(body.length);
 for(let y=140;y<170;y++)for(let x=1000;x<1120;x++){
  const i=(y*width+x)*4;full[i]=100;full[i+1]=30;full[i+2]=50;full[i+3]=46;
 }
 for(let y=40;y<150;y++)for(let x=1000;x<1080;x++){
  const i=(y*width+x)*4;body[i]=full[i]=230;body[i+1]=full[i+1]=235;body[i+2]=full[i+2]=240;body[i+3]=full[i+3]=255;
 }
 const raw={width,height,channels:4},png=b=>sharp(b,{raw}).png().toBuffer();
 const b=await png(body),f=await png(full),result=await compositeCrewShadow(f,b),air=await compositeCrewShadow(f,b,11);
 const at=(x,y)=>(y*width+x)*4;
 assert.deepEqual([...result.data.subarray(at(1040,80),at(1040,80)+4)],[230,235,240,255],'body remains crisp and unchanged');
 let shadowPixels=0;
 for(let y=151;y<height;y++)for(let x=0;x<width;x++){
  const i=at(x,y);if(result.data[i+3]>1){shadowPixels++;assert.equal(result.data[i],0);assert.equal(result.data[i+1],0);assert.equal(result.data[i+2],0);assert(result.data[i+3]<=46);}
 }
 assert(shadowPixels>0,'shadow is retained');
 assert(result.data[at(1122,160)+3]>0,'ground shadow edge is feathered');
 assert(air.data[at(1126,160)+3]>result.data[at(1126,160)+3],'airborne shadow has a wider penumbra');
 console.log('PASS shadows: neutral matte, soft perimeter, height-dependent softness, unchanged opaque character');
})().catch(e=>{console.error(e);process.exitCode=1;});
