// Record the original canvas, not the palette-limited GIF. No microphone/camera.
export function mp4Type(){
  if(!globalThis.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return '';
  return ['video/mp4;codecs=avc1.42E02A','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t))||'';
}
export async function createPlateVideo({render,signal,onProgress,dark}){
  const mimeType=mp4Type();if(!mimeType)throw Error('MP4 unavailable on this browser');
  const {createMascot}=await import('./mascot-renderer.js');
  if(signal.aborted)throw new DOMException('Cancelled','AbortError');
  const stage=document.createElement('div');stage.style.cssText='position:fixed;left:-10000px;top:0;width:216px;height:132px';stage.setAttribute('aria-hidden','true');document.body.append(stage);
  let mascot,stream,recorder,timer,watchdog,abort,visibility;
  try{
    mascot=createMascot(stage,{mode:'jump',tone:'blue',theme:dark?'dark':'light'});mascot.pause();
    const scene=document.createElement('canvas');render(-200,scene,mascot.captureFrame(0));
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1280;
    const output=canvas.getContext('2d');output.drawImage(scene,0,0);
    stream=canvas.captureStream(50);
    recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8000000});
    return await new Promise((resolve,reject)=>{
      const chunks=[];let failed=false,start;
      const fail=e=>{failed=true;clearTimeout(timer);reject(e);};
      abort=()=>fail(new DOMException('Cancelled','AbortError'));
      visibility=()=>{if(document.hidden)fail(Error('Keep this screen open while preparing video'));};
      signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=e=>fail(e.error||Error('Video encoding failed'));
      recorder.onstop=()=>{if(!failed){const blob=new Blob(chunks,{type:'video/mp4'});blob.size?resolve(blob):reject(Error('Empty video'));}};
      function tick(){
        if(failed||signal.aborted)return;
        try{
          const elapsed=performance.now()-start,t=Math.min(3500,elapsed-200);
          render(t,scene,mascot.captureFrame(Math.max(0,t)));output.drawImage(scene,0,0);
          onProgress(Math.min(99,Math.round(elapsed/57)));
          if(elapsed>=5700){recorder.stop();return;}
          timer=setTimeout(tick,20);
        }catch(e){fail(e);}
      }
      watchdog=setTimeout(()=>fail(Error('Video preparation timed out')),15000);
      if(signal.aborted){abort();return;}start=performance.now();recorder.start();tick();
    });
  }finally{
    clearTimeout(timer);clearTimeout(watchdog);signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);
    if(recorder&&recorder.state!=='inactive')recorder.stop();
    stream?.getTracks().forEach(t=>t.stop());mascot?.dispose();stage.remove();
  }
}
