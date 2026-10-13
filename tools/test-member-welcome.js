// Executes the production reveal with a small DOM and immediate animations.
// Real Chromium geometry, rotation and lifecycle checks live in check-member-welcome.cjs.
const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('assert');
const source=fs.readFileSync((process.argv[2]||'.')+'/js/membership.js','utf8');
const start=source.indexOf('async function memberWelcome('),reveal=source.slice(start,source.indexOf('/* v4.6.278:',start));
(async()=>{
 for(const [reduced,sound,theme] of [[false,true,'dark'],[false,false,'light'],[true,true,'dark']]){
  const dom=new JSDOM('<div id="view"><div class="club-card"><button data-club-coin></button><div class="club-number">120</div></div></div>',{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,frames=[],tones=[];
  Object.assign(w,{view:'sync',loggerPrefs:{sound},_tickOn:true,
   matchMedia:()=>({matches:reduced}),mascotMode:()=> 'animated',
   clubMembershipFacts:()=>({reference:true,number:'120'}),clubMembershipKey:()=> 'same',
   clubCoinDispose:()=>{},clubBindCoin:()=>{},clubPaintMembership:()=>{},clubCoinMotion:{},
   clubCoinHTML:()=>'<button class="club-coin-button"><div class="club-coin-rotor"><div class="club-coin-face"></div><span class="club-coin-number">120</span></div></button>',
   DOMMatrix:class{constructor(){this.m31=0;this.m11=1;}},
   _tickCtx:{state:'running',currentTime:0,destination:{},
    createOscillator:()=>{const s={frequency:{},connect(){},disconnect(){},start(){tones.push(s)},stop(){s.stopped=true}};return s},
    createGain:()=>({gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}})}
  });
  w.document.documentElement.dataset.theme=theme;
  w.HTMLElement.prototype.getBoundingClientRect=()=>({left:200,top:60,width:60,height:60});
  w.Element.prototype.animate=function(f,o){frames.push({el:this,f,o});return {finished:Promise.resolve(),cancel(){}}};
  const timer=w.setTimeout.bind(w);w.setTimeout=(f)=>timer(f,0);
  w.eval(reveal);await w.memberWelcome({key:'same',angle:'none',rect:{left:40,top:150,width:84}});
  assert.equal(w.document.querySelector('#memberWelcome'),null);
  assert.equal(w.document.querySelector('.club-number').textContent,'120');
  assert.equal(w.document.querySelector('[data-club-coin]').style.visibility,'');
  if(!reduced){
   assert(frames.some(x=>x.el.matches('.mw-pip')));
   assert.equal(frames.find(x=>x.el.matches('.mw-pip')).el.getAttribute('src'),'assets/mascot-'+(theme==='dark'?'white':'blue')+'.png');
   assert(frames.some(x=>x.el.matches('.mw-copy')&&x.el.textContent.includes('Welcome to the club.')));
   const copy=frames.find(x=>x.el.matches('.mw-copy')).el;
   assert.equal(copy.textContent,'Welcome to the club.','minimal welcome contains only the approved headline');
   assert.equal(copy.querySelectorAll('small,p').length,0);
   assert.equal(frames.filter(x=>x.el.matches('.mw-squares i')).length,22);
   const travel=frames.filter(x=>x.el.matches('.mw-flight'));
   assert.equal(travel.length,2);
   for(const x of travel)for(const f of x.f)assert(!/scale\([^)]*,/.test(f.transform),'coin scales uniformly');
  }else assert(!frames.some(x=>x.el.matches('.mw-pip,.mw-flight')));
  assert.equal(tones.length,sound&&!reduced?12:0);
  assert(tones.every(s=>s.stopped),'cleanup stops decorative audio');
  dom.window.close();console.log('PASS welcome lifecycle, rigid coin, Pip and sound',reduced,sound);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
