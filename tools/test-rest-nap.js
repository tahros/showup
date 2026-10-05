const fs=require('fs'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(process.argv[2]||'.','js/mascot-renderer.js'),'utf8');
const rest={yaw:-.12,lift:0,roll:0,squash:1,blink:1,wink:1,x:0};
const fn=src.slice(src.indexOf('function napPose('),src.indexOf('function idlePose('));
const nap=new Function('rest','return '+fn)(rest);
assert.deepEqual(nap(0,false),nap(12000,false));
assert.deepEqual(nap(0,true),nap(8000,true));
assert(nap(3200,false).blink<.2);assert(nap(3580,false).blink>.9);assert(nap(4100,false).wink<.3);
assert.deepEqual(nap(1800,false,true),nap(0,false));
assert(nap(900,false,true).blink>1);
for(let t=0;t<24000;t+=20){const p=nap(t,false);assert(Object.values(p).every(Number.isFinite));assert(Math.abs(p.roll)<.15);}
console.log('PASS nap loop seam, sleepy nod, catch, wink, wake return, bounded pose and static reduced motion');
