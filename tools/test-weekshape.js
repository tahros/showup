/* test-weekshape.js — v3.3.512, the rest card's week shape.
 * Driven through a real render with real ledgers, because the claim is about
 * what the card SAYS, and the sentence has to come from the data or not at all.
 */
const { JSDOM } = require("jsdom");
const fs=require("fs"), path=require("path"), vm=require("vm");
const dir=process.argv[2]||"."; let fail=0;
const ok=(n,c,g)=>{ console.log((c?"PASS ":"FAIL ")+n+(g!==undefined?" → "+g:"")); if(!c) fail=1; };
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,""),
  {url:"https://tahros.github.io/showup/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window, ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error("offline"));
w.matchMedia=q=>({matches:/no-preference/.test(String(q)),media:String(q),addEventListener(){},removeEventListener(){}});
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});};
/* ---- an IntersectionObserver that honours rootMargin ----
   jsdom has none, so without this every assertion about WHEN the week grows
   would be a string read off the constructor. This one implements the bit the
   rule turns on: the root's bottom edge is inset by rootMargin, and a target
   intersects when its box overlaps what is left. scrollTo(y) then walks the
   card up the screen so the trigger point can be measured rather than assumed.
*/
const VH=800; let cardTop=VH+400;      // starts below the fold
Object.defineProperty(w,'innerHeight',{value:VH,configurable:true});
const ios=[];
w.IntersectionObserver=class{
  constructor(cb,opt){ this.cb=cb; this.opt=opt||{}; this.t=new Set(); ios.push(this); }
  observe(el){ this.t.add(el); this.check(); }
  unobserve(el){ this.t.delete(el); }
  disconnect(){ this.t.clear(); }
  check(){
    const m=/(-?\d+)%\s*0px$/.exec(this.opt.rootMargin||'0px 0px 0px 0px');
    const inset=m?(+m[1]/100)*VH:0;            // negative shrinks the bottom
    const bottom=VH+inset;
    const hits=[...this.t].filter(el=>{
      const r=el.getBoundingClientRect();
      return r.top < bottom && r.bottom > 0;
    });
    if(hits.length) this.cb(hits.map(t=>({target:t,isIntersecting:true})));
  }
};
const scrollCardTo=y=>{ cardTop=y; ios.forEach(o=>o.check()); };
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
/* v4.5.24: PINNED DATE. This suite built its fixture from the real clock, so what
   it asserted depended on the day it happened to run -- it passed all afternoon and
   went red at midnight UTC on code that had not changed. A gate that reports a
   different answer tomorrow is not a gate. Saturday 2026-09-12 is chosen deliberately:
   these fixtures count back 1, 3 and 5 days and expect all three inside ONE
   Monday-Sunday week, with 9 days back outside it. A midweek pin silently pushed
   the oldest of them into the previous week and the counts came up short. */
vm.runInContext(`todayISO='2026-09-12';checkDate=()=>false;`,ctx);
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);
/* the week card's box is ours to move; everything else keeps jsdom's zeros */
w.Element.prototype.getBoundingClientRect=function(){
  if(this.classList&&this.classList.contains('restweek'))
    return {top:cardTop,bottom:cardTop+260,left:0,right:380,width:380,height:260,x:0,y:cardTop};
  return {top:0,bottom:0,left:0,right:0,width:0,height:0,x:0,y:0};
};

/* build a ledger by a rule: trainOn(dowIndex) decides each of the last N days */
/* the rest card is the TODAY tab's, shown only while today is a declared rest
   -- "the day's own frame, shown only while the frame is true" (v3.3.469).
   A first cut of this rendered the stats view and found no card at all. */
const build=pred=>run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  const N=364; for(let i=N;i>=1;i--){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i);
    const dow=d.getDay(); if((${pred})(dow)) DB.days[d.toLocaleDateString('en-CA')]=
      {w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8],at:1}],upd:1};}
  DB.days[todayISO]={w:[],rest:1,upd:1};            // today is a rest day
  SEED=deriveAll(); view='today'; lift.plan=null; render();})()`);
const card=()=>run(`(function(){const el=document.querySelector('.restweek');
  return el?el.textContent.replace(/\\s+/g,' ').trim():'(absent)';})()`);
const line=()=>run(`(function(){const el=document.querySelector('.restweek .rwline');
  return el?el.textContent.trim():'(absent)';})()`);

// ---- a Sunday rester: trains every day but Sunday
build("dow=>dow!==0");
ok("the shape appears under the rest grid",
   run(`!!document.querySelector('.crcard.resting .restweek')`));
/* v4.5.24: the wording rotates by date (v4.5.14), so pinning one exact sentence
   pinned the calendar too. The claim was never the phrasing -- it is that the
   sentence NAMES the day the data found, and states it outright rather than
   hedging. Both halves are asserted; the wording is free to vary. */
ok("...and names the day, because the data names it",
   /\bSundays\b/.test(line())&&!/most on|evenly|leans?|likeliest/.test(line()), line());
ok("...with seven columns, Monday first",
   run(`[...document.querySelectorAll('.restweek .rwbar b')].map(b=>b.textContent).join('')`)==="MTWTFSS",
   run(`[...document.querySelectorAll('.restweek .rwbar b')].map(b=>b.textContent).join('')`));
ok("...and Sunday is the one marked as leading",
   run(`(function(){const b=[...document.querySelectorAll('.restweek .rwbar')];
     return b.filter(x=>x.classList.contains('lead')).length===1 && b[6].classList.contains('lead');})()`));
/* today is itself a declared rest in this fixture, so its own weekday reads
   one rest out of a year -- 2%, not 0%. Sunday must be 100% and every other
   column near zero; pinning all seven to exact strings would break on the day
   of the week the suite happens to run. */
ok("...reading 100% for Sunday and near zero for the rest",
   run(`(function(){const v=[...document.querySelectorAll('.restweek .rwbar small')].map(s=>parseInt(s.textContent));
     return v.length===7 && v[6]===100 && v.slice(0,6).every(n=>n<=3);})()`),
   run(`[...document.querySelectorAll('.restweek .rwbar small')].map(s=>s.textContent).join(' ')`));

// ---- RATE, not count: rest every Sunday AND every Monday, but the record
//      starts on a Monday so there is one more Monday than Sunday
build("dow=>dow!==0&&dow!==1");
ok("two rest days are named as two, not crowned as one",
   /Sundays and Mondays|Mondays and Sundays/.test(line()), line());

// ---- a flat record says so rather than crowning the tallest column
let seed=1; const rnd=()=>((seed=seed*1103515245+12345&0x7fffffff)/0x7fffffff);
build("dow=>((dow*2654435761)%97)>24");
/* v4.5.14: the claim is that a flat record is HEDGED, not that it uses two
   particular words. The wordings rotate now, so the accepted hedges are listed
   -- and the definite forms are named too, because "is it hedged" is only worth
   asserting if "is it definite" can fail. */
ok("a record with no rhythm is not given one",
   /evenly|most on|leans? to|lean toward|likeliest|No weekday carries|spread flat|takes a turn/.test(line()), line());
ok("...and it never states a rest day outright",
   !/are your rest day|Rest lands on|are when you stop|takes \w+days off|^You rest on \w+days\.$/.test(line().trim()), line());

// ---- nothing is a target
ok("the shape sets no goal, grades nothing and names no ideal",
   !/goal|target|ideal|should|score|streak|better|worse|👏|🎉/i.test(card()), card().slice(0,110));
ok("...and the long run stays a fact in the footer",
   /longest run \d+/.test(card()));

// ---- the counters it sits under are untouched
/* ---- v3.3.513: the columns grow in ----
   The first cut styled this with a transition on height, which animates
   nothing: the bar is born at its final height and a transition needs a
   CHANGE. Asserted against the resolved rule, with the stylesheet actually
   installed -- the harness only LINKS it and jsdom fetches nothing, so
   getComputedStyle would otherwise read browser defaults and pass by vacancy. */
run(`(function(){const s=document.createElement('style'); s.id='__csstmp';
  s.textContent=${JSON.stringify(fs.readFileSync(path.join(dir,"css/app.css"),"utf8"))};
  document.head.appendChild(s);})()`);
ok("(fixture) the stylesheet is really loaded, or the next checks prove nothing",
   run(`getComputedStyle(document.querySelector('.restweek .rwbar i')).height`)==='86px',
   run(`getComputedStyle(document.querySelector('.restweek .rwbar i')).height`));
ok("each column carries its place in the week, so the growth staggers",
   run(`[...document.querySelectorAll('.restweek .rwbar i')].map(e=>e.style.getPropertyValue('--j').trim()).join(',')`)==='0,1,2,3,4,5,6',
   run(`[...document.querySelectorAll('.restweek .rwbar i')].map(e=>e.style.getPropertyValue('--j').trim()).join(',')`));
ok("...and grows from zero as a keyframe, not a transition that can never fire",
   (function(){const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
     return /@keyframes rwgrow\{from\{height:0\}to\{height:var\(--h/.test(css)
         && /\.restweek\.grown \.rwbar i::after\{[\s\S]{0,120}?animation:rwgrow/.test(css)
         && !/\.restweek \.rwbar i::after\{transition:height/.test(css);})());
/* ---- v3.3.514: it grows when it is SEEN ----
   The animation used to run at paint, when this card is still a screen and a
   half below the fold, so it was always over before the maker reached it. The
   gate is a class an observer adds on first intersection. The important half
   is that it FAILS OPEN, the rule v3.3.496 had to build for the float: the
   resting state is the column at FULL height and only the keyframe is gated,
   so a silent observer costs the animation and never the data. */
ok("the columns are fully drawn before anything animates",
   run(`(function(){const bars=[...document.querySelectorAll('.restweek .rwbar i')];
     return bars.length===7 && bars.every(b=>{const h=b.style.getPropertyValue('--h');
       return h && h!=='0' && h!=='0%';});})()`),
   run(`[...document.querySelectorAll('.restweek .rwbar i')].map(b=>b.style.getPropertyValue('--h')).join(' ')`));
ok("...and the keyframe waits for .grown, so nothing moves off-screen",
   /#view:not\(\.norise\) \.restweek\.grown \.rwbar i::after/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
/* v3.3.515: the trigger is WHERE ON THE SCREEN, not how much of the card.
   A threshold asks about the card's proportions -- and this card is tall, so a
   third of it clears the fold while the whole thing is still at the bottom
   edge. rootMargin asks about the viewport: shrink its bottom and the observer
   speaks when the card's TOP crosses that line. Driven for real below; this
   pins the shape of the rule, because jsdom has no IntersectionObserver and
   the constructor options are the only thing readable from here. */
{
  const appSrc=fs.readFileSync(path.join(dir,"js/app.js"),"utf8");
  ok("...which an observer adds when the card comes into view",
     /rwIO=new IntersectionObserver/.test(appSrc) && /el.classList.add\('grown'\)/.test(appSrc));
  const m=appSrc.match(/rwIO=new IntersectionObserver[\s\S]{0,220}?rootMargin:'0px 0px -(\d+)% 0px'/);
  ok("...once its TOP is at least two thirds up the screen, not merely on it",
     !!m && +m[1]>=30 && +m[1]<=40, m?`bottom inset ${m[1]}% → fires at ${100-+m[1]}% down`:"no rootMargin");
  ok("...and not on a fraction of the card, which is a question about the card",
     !/rwIO=new IntersectionObserver[\s\S]{0,220}?threshold:\s*0?\.[1-9]/.test(appSrc));
}
/* ---- and now driven, not read ---- */
const grown=()=>run(`!!document.querySelector('.restweek.grown')`);
scrollCardTo(VH+200);
ok("(driven) below the fold, nothing has grown", !grown());
scrollCardTo(VH-40);
ok("...its top just onto the screen is still too early", !grown(),
   `top=${VH-40} of ${VH} → ${Math.round((VH-40)/VH*100)}% down`);
scrollCardTo(Math.round(VH*0.70));
ok("...70% down the screen: still waiting", !grown(), "top at 70%");
scrollCardTo(Math.round(VH*0.64));
ok("...and it grows once its top passes about two thirds up", grown(), "top at 64%");
ok("...and adds it outright where there is no observer to wait for",
   /if\(!\('IntersectionObserver' in window\)\)\{ go\(\); return; \}/.test(fs.readFileSync(path.join(dir,"js/app.js"),"utf8")));
/* the card's last row is small type that has to be read, not glanced at */
ok("...and the page clears the floating pill by more than a hairline",
   (function(){const m=fs.readFileSync(path.join(dir,"css/app.css"),"utf8")
     .match(/data-skin="minimal"\] #app\{padding-bottom:(\d+)px\}/);
     return !!m && +m[1]>=130;})(),
   (fs.readFileSync(path.join(dir,"css/app.css"),"utf8").match(/data-skin="minimal"\] #app\{padding-bottom:(\d+)px\}/)||[])[1]);

ok("...only on an arrival, never on an in-place repaint",
   /#view:not\(\.norise\) \.restweek\.grown \.rwbar i::after/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
run(`(function(){const s=document.getElementById('__csstmp'); if(s) s.remove();})()`);

ok("the card still leads with the count and the share",
   run(`(function(){const c=document.querySelector('.crcard.resting');
     return /days rested/.test(c.textContent) && /% of days since/.test(c.textContent);})()`));
// ---- the attendance card does NOT get it: it is a rest reading
ok("the attendance card gets no week shape — it is a rest reading",
   run(`(function(){view='stats'; render();
     return !document.querySelector('.restweek');})()`));
process.exit(fail?1:0);
