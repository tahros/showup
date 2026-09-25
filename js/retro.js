/* Optional Retro appearance. No workout, goal, navigation or reward state. */
function isRetro(){return document.documentElement.dataset.appearance==='retro';}
const retroImages=new Map();
/* v4.6.135: THE FILM'S SPRITE. The Retro mascot is the one from the ShowUp gym
   film: a 42x24 dumbbell with a 1px navy outline, a three-step light ramp and a
   live face (eyes that look, blink and wink; a grin that widens). Its jump is the
   approved 3D jump's own keyframes (js/mascot-renderer.js), sampled on the pixel
   grid so every frame lands on whole pixels. Tones follow the 3D mascot's rules:
   silver on light, white on dark, blue for completion, green on a rest day.
   Drawn into a 48x48 canvas and shown at whole multiples (css/retro.css). */
const RETRO_W=48,RETRO_H=48,RETRO_QF=1000/12,RETRO_OUT='#151826';
const RETRO_TONES={chrome:['#6A6A6A','#A2A2A2','#E6E6E6','#303030'],white:['#BFC2C7','#E6E8EB','#FFFFFF','#303030'],
  blue:['#2033AF','#3049DC','#5368ED','#FFFFFF'],rest:['#1B5E20','#3E8E41','#66BB6A','#FFFFFF']};
const RETRO_N={x:0,y:0,sx:1,sy:1,r:0,bend:0,eye:1,wink:1,look:0,face:0,grin:0};
const RETRO_JUMP=[[0,{}],[220,{eye:1.12,face:-8}],[570,{sx:1.15,sy:.73,bend:27,eye:.32,face:13}],[700,{sx:.85,sy:1.23,y:-24,bend:-32,eye:1.12,grin:.55}],
  [960,{sx:.96,sy:1.04,y:-102,r:-6,bend:-19,eye:1.16,grin:1}],[1170,{sx:1.03,sy:.98,y:-110,r:5,bend:-5,eye:.82,grin:1}],[1410,{sx:.93,sy:1.09,y:-42,r:2,bend:22,eye:1.06,grin:.75}],
  [1530,{sx:1.21,sy:.65,bend:33,eye:.12,grin:.2}],[1700,{sx:.96,sy:1.06,y:-23,bend:-22,eye:.92,grin:.65}],[1870,{sx:1.055,sy:.91,bend:10,eye:.9,grin:.3}],[2080,{sx:.99,sy:1.02,bend:-4}],[2300,{}],[2700,{}]];
const RETRO_JUMP_MS=2700;
function retroPose(mode,ms){
  if(mode==='rest')return {...RETRO_N,eye:.3,grin:.35};
  if(!(ms>0))return {...RETRO_N,grin:.35};
  if(ms>=RETRO_JUMP_MS){const u=ms-RETRO_JUMP_MS;return {...RETRO_N,grin:.35,...(u>=250&&u<580?{wink:.06,r:-5,face:-2}:{})};}
  let i=1;while(i<RETRO_JUMP.length-1&&ms>RETRO_JUMP[i][0])i++;
  const [ta,A]=RETRO_JUMP[i-1],[tb,B]=RETRO_JUMP[i];let q=Math.max(0,Math.min(1,(ms-ta)/(tb-ta)));q=q*q*(3-2*q);
  const a={...RETRO_N,...A},b={...RETRO_N,...B},o={};for(const k in RETRO_N)o[k]=a[k]+(b[k]-a[k])*q;return o;
}
function retroSampler(p){
  const eyeRows=e=>e>1.1?4:e>=.7?3:e>=.35?2:1;
  const fd=Math.max(-1,Math.min(1,Math.round(p.face/7))),eyeX=Math.max(-2,Math.min(2,Math.round(p.look/10)));
  const eyeBot=11+fd,topL=eyeBot-eyeRows(p.eye)+1,topR=eyeBot-eyeRows(p.eye*p.wink)+1,mouth=p.grin<.45?0:p.grin<.8?1:2;
  return (a,b)=>{
    if(a<0||a>41||b<0||b>23)return 0;
    const z=a<10?a:a>=32?a-32:-1;
    if(z>=0&&((z>=4&&z<7)||(b>=2&&b<22&&z>=2&&z<9)||(b>=5&&b<19&&z<10))){
      if(b>=20||z>=8||(b>=17&&z>=6))return 1; if(z<=2||b<=3)return 3; return 2;}
    if(a>=9&&a<33&&b>=7&&b<17){
      const ea=a-eyeX,mb=b-fd;
      if(b<=eyeBot&&((ea>=16&&ea<19&&b>=topL)||(ea>=23&&ea<26&&b>=topR)))return 4;
      if(mouth===0){if((mb===14&&(ea===18||ea===23))||(mb===15&&ea>=19&&ea<23))return 4;}
      else if(mouth===1){if((mb===14&&(ea===17||ea===24))||(mb===15&&ea>=18&&ea<24))return 4;}
      else if(((mb===13||mb===14)&&ea>=18&&ea<24)||(mb===15&&ea>=19&&ea<23))return 4;
      if(b<=8)return 3; if(b>=15)return 1; if(a===11&&b>=9&&b<=14)return 3; return 2;}
    return 0;};
}
function retroTone(mode,tone){
  if(mode==='rest')return 'rest';
  if(RETRO_TONES[tone])return tone;
  return document.documentElement.dataset.theme==='dark'?'white':'chrome';
}
/* ms: time into the jump (0 = standing). The lift is half the film's, to fit the app's slots. */
function retroDraw(canvas,mode='hello',tone='',ms=0){
  canvas.width=RETRO_W;canvas.height=RETRO_H;
  const x=canvas.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,RETRO_W,RETRO_H);
  const p=retroPose(mode,ms),T=RETRO_TONES[retroTone(mode,tone)],s=retroSampler(p);
  const rr=p.r*Math.PI/180,cs=Math.cos(rr),sn=Math.sin(rr),sx=1+(p.sx-1)*.8,sy=1+(p.sy-1)*.8,bend=p.bend*.07;
  const lift=-p.y*.13+Math.abs(Math.sin(rr))*8,base=RETRO_H-3-Math.round(lift),cx=RETRO_W/2+Math.round(p.x*.15);
  const M=new Uint8Array(RETRO_W*RETRO_H);
  for(let y=0;y<RETRO_H;y++){const dy=y+.5-base;for(let px=0;px<RETRO_W;px++){const dx=px+.5-cx;
    const lx=(dx*cs+dy*sn)/sx,ly=(-dx*sn+dy*cs)/sy,n=lx/21,v=s(Math.floor(lx+21),Math.floor(ly+24+bend*n*n));if(v)M[y*RETRO_W+px]=v;}}
  let k=1-lift/17;if(k<.35)k=.35;const w=Math.round(36*k)&~1;
  x.fillStyle=document.documentElement.dataset.theme==='dark'?'rgba(0,0,0,.45)':'rgba(21,24,38,.16)';
  x.fillRect(cx-(w>>1),RETRO_H-2,w,1);x.fillRect(cx-(w>>1)+3,RETRO_H-1,w-6,1);
  for(let y=0;y<RETRO_H;y++)for(let px=0;px<RETRO_W;px++){const i=y*RETRO_W+px,v=M[i];
    if(v){x.fillStyle=v===4?T[3]:v===1?T[0]:v===2?T[1]:T[2];x.fillRect(px,y,1,1);}
    else if((px>0&&M[i-1])||(px<RETRO_W-1&&M[i+1])||(y>0&&M[i-RETRO_W])||(y<RETRO_H-1&&M[i+RETRO_W])){x.fillStyle=RETRO_OUT;x.fillRect(px,y,1,1);}}
  return canvas;
}
function retroStill(mode,tone){
  const key=mode+'|'+retroTone(mode,tone)+'|'+document.documentElement.dataset.theme;
  if(!retroImages.has(key))retroImages.set(key,retroDraw(document.createElement('canvas'),mode,tone).toDataURL());
  return retroImages.get(key);
}
function retroMark(){
  // Square share mark: the standing sprite, whole pixels, transparent padding.
  return retroDraw(document.createElement('canvas'),'hello','');
}
function createRetroMascot(el,{mode='hello',tone=''}={}){
  const canvas=document.createElement('canvas');el.appendChild(canvas);
  let timer=null,disposed=false,t0=0;
  function draw(ms=0){
    if(disposed)return;
    retroDraw(canvas,mode,tone,ms);
    const scale=Math.max(1,Math.round(el.getBoundingClientRect().width/RETRO_W));
    canvas.style.width=RETRO_W*scale+'px';canvas.style.height=RETRO_H*scale+'px';
  }
  function stop(){clearTimeout(timer);timer=null;}
  function replay(){
    stop();draw();if(document.hidden||mascotMode()!=='animated'||matchMedia('(prefers-reduced-motion: reduce)').matches||mode==='rest')return;
    t0=performance.now();
    (function step(){if(disposed||document.hidden)return;const ms=Math.floor((performance.now()-t0)/RETRO_QF)*RETRO_QF;
      draw(Math.max(1,ms));if(ms<RETRO_JUMP_MS+700)timer=setTimeout(step,RETRO_QF);else draw();})();
  }
  const resize=new ResizeObserver(()=>draw());resize.observe(el);draw();
  // Celebrate only in the existing completion overlay. Ordinary renders stay quiet.
  if(el.closest('#dayDone'))replay();
  return {replay,pause:stop,captureFrame(ms){stop();draw(ms>0&&ms<RETRO_JUMP_MS+700?ms:0);return canvas;},
    update(next={}){if(typeof next.tone==='string')tone=next.tone;draw();},dispose(){disposed=true;stop();resize.disconnect();canvas.remove();}};
}
let retroAudio=null;
function retroSound(kind='click'){
  if(!isRetro()||DB.settings.retroSound!==true||document.hidden)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    retroAudio ||= new Audio();if(retroAudio.state==='suspended')retroAudio.resume().catch(()=>{});
    const notes=kind==='complete'?[523,659,784]:[660];
    notes.forEach((freq,i)=>{
      const o=retroAudio.createOscillator(),g=retroAudio.createGain(),t=retroAudio.currentTime+i*.09;
      o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(.018,t);g.gain.exponentialRampToValueAtTime(.0001,t+.075);
      o.connect(g);g.connect(retroAudio.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.08);
    });
  }catch(_){}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&retroAudio?.state==='running')retroAudio.suspend().catch(()=>{});});
