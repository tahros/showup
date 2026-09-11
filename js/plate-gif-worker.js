import {GIFEncoder,quantize,applyPalette} from '../vendor/gifenc-1.0.3.js';
let gif,palette,first=true;
self.onmessage=({data})=>{
  try{
    if(data.type==='init'){palette=quantize(new Uint8Array(data.pixels),256,{format:'rgb565'});gif=GIFEncoder();first=true;}
    if(data.type==='frame'){
      const index=applyPalette(new Uint8Array(data.pixels),palette,'rgb565');
      gif.writeFrame(index,1080,1280,{palette:first?palette:undefined,delay:data.delay,repeat:0});first=false;
    }
    if(data.type==='finish'){gif.finish();const bytes=gif.bytes();self.postMessage({bytes:bytes.buffer},[bytes.buffer]);gif=null;return;}
    self.postMessage({ok:true});
  }catch(e){self.postMessage({error:String(e.message||e)});}
};
