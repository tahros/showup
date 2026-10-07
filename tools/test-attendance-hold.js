// Execute the real encoders with deterministic canvas/worker/recorder adapters.
// Existing plate exports retain their still hold; attendance opts into motion.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const dir=process.argv[2]||'.';
async function check(kind,animateHold){
 const times=[],delays=[];let clock=0;
 const canvas=()=>({width:1080,height:1280,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(4)})}),captureStream:()=>({getTracks:()=>[{stop(){}}]})});
 class Worker{postMessage(d){if(d.type==='frame')delays.push(d.delay);queueMicrotask(()=>this.onmessage({data:d.type==='finish'?{bytes:new Uint8Array([1,2,3])}:{}}));}terminate(){}}
 class Recorder{static isTypeSupported(){return true;}constructor(){this.state='inactive';}start(){this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['video'])});this.onstop();}}
 const document={hidden:false,body:{append(){}},addEventListener(){},removeEventListener(){},createElement:t=>t==='canvas'?canvas():{style:{},setAttribute(){},remove(){}}};
 const scope={document,Worker,MediaRecorder:Recorder,HTMLCanvasElement:{prototype:{captureStream(){}}},Blob,URL,AbortController,DOMException,Uint8Array,Uint8ClampedArray,performance:{now:()=>clock+=20},setTimeout:(fn,ms)=>{if(ms<500)queueMicrotask(fn);return 1;},clearTimeout(){},queueMicrotask};
 const name=kind==='gif'?'createPlateGif':'createPlateVideo';
 let source=fs.readFileSync(path.join(dir,'js/plate-'+kind+'.js'),'utf8').replaceAll('export ','').replaceAll("await import('./mascot-renderer.js')",'({createMascot(){throw Error("unexpected mascot");}})').replaceAll('import.meta.url',"'https://test.invalid/js/plate-gif.js'");
 vm.createContext(scope);vm.runInContext(source+';globalThis.create='+name,scope);
 await scope.create({render:t=>times.push(t),signal:new AbortController().signal,onProgress(){},dark:false,withMascot:false,duration:40,animateHold});
 const finite=times.filter(Number.isFinite);
 assert(animateHold?Math.max(...finite)>2000:Math.max(...finite)===40,kind+' final render time');
 if(kind==='gif')assert(animateHold?delays.every(n=>n===20):delays.at(-1)===2000,'GIF hold frame delays');
 console.log('PASS '+kind+': '+(animateHold?'final hold keeps rendering light':'legacy still hold preserved'));
}
(async()=>{for(const kind of ['gif','video'])for(const animate of [false,true])await check(kind,animate);console.log('ALL PASS');})().catch(e=>{console.error(e);process.exitCode=1;});
