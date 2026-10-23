/* Approved pixel-city effects, owned by one first-run screen. No app state writes. */
export function mountCityEffects(root, state, reduced){
 const shared={}, worldPreview={get state(){return state();}}, CITIES=[{id:'seoul'},{id:'tokyo'},{id:'la'}];
 let disposed=false;const frames=new Set(),observers=new Set(),cancellations=new Set();
 function requestAnimationFrame(fn){if(disposed)return 0;let id=window.requestAnimationFrame(t=>{frames.delete(id);if(!disposed)fn(t);});frames.add(id);return id;}
 class ResizeObserver extends window.ResizeObserver{constructor(fn){super(fn);observers.add(this);}disconnect(){super.disconnect();observers.delete(this);}}
/* Opaque scene-to-scene tiles. Never fade either image through the page color. */
const revealCityTiles=function({from,to,device,reduced,nextIndex}){
 const scene=root.querySelector('.ww-scene');const canvas=document.createElement('canvas');canvas.className='ww-transition';canvas.setAttribute('aria-hidden','true');scene.appendChild(canvas);
 device.dataset.cityTransition='true';
 const reveal=shared.cityTileReveal={from,to,oldIndex:worldPreview.state.index,newIndex:nextIndex,cols:0,rows:0,progress:0,isRevealed(x,y){return this.progress>=(.60*(1-x/Math.max(1,this.cols-1))+.38*(1-y/Math.max(1,this.rows-1))+((this.cols-1-x+this.rows-1-y)%2)*.02)||this.progress===1;}};
 const ctx=canvas.getContext('2d',{alpha:false});let oldBuffer,newBuffer,cols,rows,w,h,elapsed=0,last=performance.now(),previousStep=-1,done=false;
 function imageBuffer(img){const buffer=document.createElement('canvas');buffer.width=w;buffer.height=h;const c=buffer.getContext('2d',{alpha:false});c.fillStyle='#0c1026';c.fillRect(0,0,w,h);const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;c.drawImage(img,(w-iw)/2,(h-ih)*.57,iw,ih);return buffer;}
 function resize(){const ratio=Math.min(devicePixelRatio||1,2);w=canvas.width=Math.max(1,Math.round(scene.clientWidth*ratio));h=canvas.height=Math.max(1,Math.round(scene.clientHeight*ratio));cols=Math.max(8,Math.round(scene.clientWidth/6.5));rows=Math.max(8,Math.round(scene.clientHeight/6.5));reveal.cols=cols;reveal.rows=rows;oldBuffer=imageBuffer(from);newBuffer=imageBuffer(to);previousStep=-1;paint();}
 function paint(){const step=Math.min(40,Math.floor(elapsed/30));if(step===previousStep)return;previousStep=step;ctx.drawImage(oldBuffer,0,0);const progress=step/40;reveal.progress=progress;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   // A diagonal wave with a small alternating stair-step edge.
   const threshold=(.60*(1-x/Math.max(1,cols-1))+.38*(1-y/Math.max(1,rows-1))+((cols-1-x+rows-1-y)%2)*.02);
   if(progress>=threshold||step===40){const left=Math.round(x*w/cols),top=Math.round(y*h/rows),right=Math.round((x+1)*w/cols),bottom=Math.round((y+1)*h/rows);ctx.drawImage(newBuffer,left,top,right-left,bottom-top,left,top,right-left,bottom-top);}
  }canvas.dataset.step=String(step);
 }
 const observer=new ResizeObserver(resize);observer.observe(scene);resize();
 return new Promise(resolve=>{const abort=()=>{if(done)return;done=true;observer.disconnect();canvas.remove();delete shared.cityTileReveal;delete device.dataset.cityTransition;resolve(()=>{});};cancellations.add(abort);function finish(){if(done)return;done=true;cancellations.delete(abort);observer.disconnect();resolve(()=>{canvas.remove();delete device.dataset.cityTransition;delete shared.cityTileReveal;});}
 function tick(now){if(done)return;const dt=Math.min(now-last,80);last=now;if(reduced.matches){elapsed=1200;paint();finish();return;}if(!device.classList.contains('ww-paused')&&!document.hidden){elapsed+=dt;paint();}if(elapsed>=1200)finish();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
};
/* Hand-positioned light accents in source-image coordinates. Render at a
   coarse game-pixel grid; no movement of the artwork or signup controls. */
(()=>{const canvas=root.querySelector('.ww-lights'),ctx=canvas.getContext('2d'),scene=canvas.parentElement,device=root;
const maps={
 tokyo:{windows:[[.19,.34],[.204,.373],[.335,.401],[.362,.428],[.452,.379],[.474,.407],[.551,.471],[.629,.429],[.662,.458],[.822,.378],[.851,.409],[.89,.443]],neon:[[.762,.271,'#ff7668'],[.757,.385,'#ffb64d'],[.346,.306,'#78cfff'],[.642,.361,'#b4a5ff']],stars:[[.418,.212],[.583,.248],[.698,.197]],lamps:[[.158,.127],[.461,.132],[.831,.13]]},
 seoul:{windows:[[.183,.348],[.206,.405],[.346,.387],[.39,.434],[.474,.409],[.548,.464],[.625,.422],[.68,.488],[.827,.384],[.86,.456]],neon:[[.769,.304,'#ff8c9a'],[.768,.37,'#8ccfff'],[.365,.338,'#8faeff'],[.626,.358,'#78cfff']],stars:[[.43,.196],[.567,.232],[.679,.204]],lamps:[[.154,.134],[.481,.146],[.82,.145]]},
 la:{windows:[[.64,.506],[.665,.519],[.705,.484],[.722,.503],[.768,.52],[.793,.48],[.84,.515]],neon:[[.49,.496,'#ffd59c'],[.706,.47,'#d3b1ff']],stars:[],lamps:[[.173,.105],[.52,.11],[.866,.101]],water:[[.19,.526],[.26,.536],[.34,.511],[.395,.53],[.43,.516],[.57,.53]]}
};let t=0,last=performance.now(),drawn=0,frame=0,previousCity=-1;
function resize(){canvas.width=Math.max(1,Math.round(scene.clientWidth/2));canvas.height=Math.max(1,Math.round(scene.clientHeight/2));ctx.imageSmoothingEnabled=false;paint(t);}
function paint(time){
 ctx.clearRect(0,0,canvas.width,canvas.height);const reveal=shared.cityTileReveal;
 if(reveal){renderLayer(time,reveal.oldIndex,false);renderLayer(time,reveal.newIndex,true);}else renderLayer(time,worldPreview.state.index,null);
 canvas.dataset.frame=String(++frame);canvas.dataset.city=CITIES[worldPreview.state.index].id;
}
function renderLayer(time,cityIndex,incoming){const state=worldPreview.state,reveal=shared.cityTileReveal;const city=CITIES[cityIndex].id,map=maps[city];if(!map)return;
 const img=incoming===null?root.querySelectorAll('.ww-scene img')[state.active]:(incoming?reveal.to:reveal.from);if(!img.naturalWidth)return;
 ctx.save();
 if(incoming!==null){ctx.beginPath();for(let y=0;y<reveal.rows;y++)for(let x=0;x<reveal.cols;x++){if(reveal.isRevealed(x,y)===incoming){const l=x*canvas.width/reveal.cols,t=y*canvas.height/reveal.rows;ctx.rect(l,t,canvas.width/reveal.cols,canvas.height/reveal.rows);}}ctx.clip();}
 const scale=Math.max(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale,ox=(canvas.width-iw)/2,oy=(canvas.height-ih)*.57;
 const point=(x,y)=>[Math.round(ox+x*iw),Math.round(oy+y*ih)];
 const fade=1;
 function pixel(x,y,color,alpha,w=1,h=1){const [px,py]=point(x,y);ctx.globalAlpha=alpha*fade;ctx.fillStyle=color;ctx.fillRect(px,py,w,h);}
 map.windows.forEach(([x,y],i)=>{const phase=(time+i*691)%6400;const level=phase<1500?.18:phase<3100?.68:phase<4700?.35:.1;pixel(x,y,i%3===0?'#b6d9ff':'#ffe7a6',level,1,i%3===0?2:1);});
 map.neon.forEach(([x,y,color],i)=>{const phase=(time+i*1700)%6800;const pulse=[.3,.48,.7,.48][Math.floor(phase/1700)];const [px,py]=point(x,y);ctx.fillStyle=color;ctx.globalAlpha=pulse*.16*fade;ctx.fillRect(px-2,py-2,5,5);ctx.globalAlpha=pulse*fade;ctx.fillRect(px,py,1,2);
  if(phase>1900&&phase<2900){ctx.globalAlpha=.58*fade;ctx.fillRect(px-2,py,5,1);ctx.fillRect(px,py-2,1,5);ctx.globalAlpha=.9*fade;ctx.fillStyle='#fff8e4';ctx.fillRect(px,py,1,1);}
 });
 map.stars.forEach(([x,y],i)=>{const phase=(time+i*2300)%9000;if(phase<1500){const [px,py]=point(x,y);ctx.fillStyle='#c1cfff';ctx.globalAlpha=(phase<500?.25:phase<1000?.6:.25)*fade;ctx.fillRect(px,py,1,1);if(phase>=500&&phase<1000){ctx.globalAlpha=.22*fade;ctx.fillRect(px-1,py,3,1);ctx.fillRect(px,py-1,1,3);}}});
 map.lamps.forEach(([x,y],i)=>{const pulse=.12+.06*Math.sin(time/1200+i);const [px,py]=point(x,y);ctx.fillStyle='#ffdca1';ctx.globalAlpha=pulse*fade;ctx.fillRect(px-2,py-1,5,3);});
 (map.water||[]).forEach(([x,y],i)=>pixel(x,y,'#ffe2ab',.12+Math.max(0,Math.sin(time/1500+i))*.35,2,1));
 ctx.globalAlpha=1;ctx.restore();
}
function tick(now){const reduced=device.classList.contains('ww-reduced'),stopped=device.classList.contains('ww-suspended')||reduced;const current=worldPreview.state.index;if(reduced){ctx.clearRect(0,0,canvas.width,canvas.height);}else if(!stopped){t+=Math.min(now-last,80);if(now-drawn>125){paint(t);drawn=now;}}else if(current!==previousCity){paint(t);}previousCity=current;last=now;requestAnimationFrame(tick);}
new ResizeObserver(resize).observe(scene);resize();requestAnimationFrame(tick);
})();

 return {reveal:(args)=>revealCityTiles({...args,device:root,reduced}),dispose(){if(disposed)return;disposed=true;frames.forEach(id=>window.cancelAnimationFrame(id));observers.forEach(o=>o.disconnect());cancellations.forEach(fn=>fn());root.querySelectorAll('.ww-transition').forEach(e=>e.remove());}};
}
