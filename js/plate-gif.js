// All encoding stays on-device. The worker receives pixels, never account data.
let fontPromise;
export function loadExportFonts(){
  return fontPromise ||= Promise.all([['Regular',400],['Medium',500],['SemiBold',600],['Bold',700]].map(async([file,weight])=>{
    const face=new FontFace('ShowUp Export Plex',`url(${new URL('../assets/fonts/IBMPlexSans-'+file+'.ttf',import.meta.url)})`,{weight:String(weight)});
    await face.load();document.fonts.add(face);
  })).catch(e=>{fontPromise=null;throw e;});
}
export async function createPlateGif({render,signal,onProgress,dark}){
  const {createMascot}=await import('./mascot-renderer.js');
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  const stage=document.createElement('div');stage.style.cssText='position:fixed;left:-10000px;top:0;width:216px;height:132px;pointer-events:none';stage.setAttribute('aria-hidden','true');document.body.append(stage);
  let mascot,worker,pending;
  const abort=()=>{pending?.reject(new DOMException('Cancelled','AbortError'));worker?.terminate();};
  signal.addEventListener('abort',abort,{once:true});
  try{
    mascot=createMascot(stage,{mode:'jump',tone:'blue',theme:dark?'dark':'light'});mascot.pause();
    worker=new Worker(new URL('./plate-gif-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=e=>{const p=pending;pending=null;e.data.error?p?.reject(Error(e.data.error)):p?.resolve(e.data);};
    worker.onerror=e=>{pending?.reject(Error(e.message));pending=null;};
    const send=(data,transfer=[])=>new Promise((resolve,reject)=>{if(signal.aborted)return reject(new DOMException('Cancelled','AbortError'));pending={resolve,reject};worker.postMessage(data,transfer);});
    const canvas=document.createElement('canvas');
    // Quantize the final composition so the initial empty sky does not decide colours.
    render(undefined,canvas,mascot.captureFrame(2800));
    let pixels=canvas.getContext('2d').getImageData(0,0,1080,1280).data;
    await send({type:'init',pixels:pixels.buffer},[pixels.buffer]);
    // 50 fps motion, then a two-second final hold. Repeated hold frames need not encode.
    for(let i=0;i<=150;i++){
      if(signal.aborted)throw new DOMException('Cancelled','AbortError');
      const t=i*20-200;render(t,canvas,mascot.captureFrame(Math.max(0,Math.min(2800,t))));
      pixels=canvas.getContext('2d').getImageData(0,0,1080,1280).data;
      await send({type:'frame',pixels:pixels.buffer,delay:i===150?2000:20},[pixels.buffer]);
      onProgress(Math.round((i+1)/151*100));
      await new Promise(r=>setTimeout(r,0));
    }
    const result=await send({type:'finish'});return new Blob([result.bytes],{type:'image/gif'});
  }finally{signal.removeEventListener('abort',abort);worker?.terminate();mascot?.dispose();stage.remove();}
}
