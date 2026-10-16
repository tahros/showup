// Regenerates ICON_SET in js/util.js from tools/icons/iconset.js (the design source).
// node tools/icons/gen.js tools/icons > table.txt, then paste between 'const ICON_SET={' and '};'.
require(process.argv[2]+'/iconset.js');const {ICONS}=globalThis.ICONSET;
const names=['sparkle','edit','copy','paste','selectall','close','plus','minus','trash','move','grip','check','undo','replay','expand','collapse','share','search','download','link','file','chevronR','chevronL','chevronD','chevronU','arrowR','arrowL','arrowU','arrowD','arrowUR','calendar','calendarCheck','calendarLands','lock','trendUp','trendFlat','avoid','alert','info','eye'];
const r=n=>String(+(+n).toFixed(1));
const tidy=d=>d.replace(/-?\d+\.\d+/g,m=>r(m));
const out=[];
for(const n of names){const ic=ICONS[n];if(!ic)throw n;const els=ic.b||ic.a;
 const lineOnly=els.every(e=>['s','s!','S-','s5'].includes(e[0]));const thin=els.some(e=>e[0]==='S-'||e[0]==='s5');
 const W=lineOnly&&!thin?10:7.5;
 const st=(d,w,dash)=>`<path d="${tidy(d)}" style="fill:none;stroke:currentColor;stroke-width:${w}${dash?';stroke-dasharray:8 7.5':''}"/>`;
 const m=[],t=[],c=[];
 for(const [k0,d,w] of els){const top=k0.endsWith('!'),k=k0.replace('!','');let o='';
  if(k==='F')o=`<path d="${tidy(d)}" style="fill:currentColor;stroke:currentColor;stroke-width:${W}"/>`;
  else if(k==='s')o=st(d,W);
  else if(k==='S-')o=st(d,5,true);
  else if(k==='s5')o=st(d,5);
  else if(k==='D')o=`<path d="${tidy(d)}" style="fill:currentColor;stroke:currentColor;stroke-width:${w||0}"/>`;
  else if(k==='x'){c.push(`<path d="${tidy(d)}" fill="none" stroke="#000" stroke-width="${w||W}"/>`);continue;}
  else if(k==='X'){c.push(`<path d="${tidy(d)}" fill="#000" stroke="#000" stroke-width="2"/>`);continue;}
  (top?t:m).push(o);}
 const e=s=>s.replace(/'/g,"\\'");
 out.push(`  ${n}:{m:'${e(m.join(''))}'${t.length?`,t:'${e(t.join(''))}'`:''}${c.length?`,c:'${e(c.join(''))}'`:''}}`);}
console.log(out.join(',\n'));
