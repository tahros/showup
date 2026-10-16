/* ShowUppp icon set — one source, two styles.
   Grid: 100 box, ink inside 12..88, stroke 9, corner radius 10, round caps and joins.
   Element kinds:
     F  area: A outlines it, B fills it (with the same stroke so corners round alike)
     s  line: a stroke in both styles
     x  cut:  A draws it as a line; B cuts it out of the filled area (width w)
     X  cut area: A fills it; B cuts it out
     D  detail: filled (plus optional thin stroke w) in both styles
     !  suffix: drawn above the cut mask in B (e.g. a ring on top of a gap)
     S- dashed outline in both
   a:/b: give explicit element lists when the two styles differ in construction. */
(function(G){
const star=(cx,cy,r)=>{const k=r*.2;return `M${cx} ${cy-r}Q${cx+k} ${cy-k} ${cx+r} ${cy}Q${cx+k} ${cy+k} ${cx} ${cy+r}Q${cx-k} ${cy+k} ${cx-r} ${cy}Q${cx-k} ${cy-k} ${cx} ${cy-r}Z`;};
const rr=(x,y,w,h,r)=>`M${x+r} ${y}H${x+w-r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${y+h-r}A${r} ${r} 0 0 1 ${x+w-r} ${y+h}H${x+r}A${r} ${r} 0 0 1 ${x} ${y+h-r}V${y+r}A${r} ${r} 0 0 1 ${x+r} ${y}Z`;
const circ=(cx,cy,r)=>`M${cx-r} ${cy}A${r} ${r} 0 1 0 ${cx+r} ${cy}A${r} ${r} 0 1 0 ${cx-r} ${cy}Z`;
const cloud=(dy=0)=>`M30 ${78+dy}H70A16 16 0 0 0 72 ${46+dy}A22 22 0 0 0 30 ${48+dy}A15 15 0 0 0 30 ${78+dy}Z`;
const gear=()=>{const n=8,R=38,r=29,cx=50,cy=50;let d='';for(let i=0;i<n;i++){const a0=(i/n)*Math.PI*2-Math.PI/2,w=Math.PI/n;const pts=[[a0-w*.42,R],[a0+w*.42,R],[a0+w*.62,r],[a0+w*1.38,r]];for(const [a,rad] of pts){const x=(cx+rad*Math.cos(a)).toFixed(1),y=(cy+rad*Math.sin(a)).toFixed(1);d+=(d?'L':'M')+x+' '+y;}}return d+'Z';};
const calFrame=rr(14,20,72,68,10), rings='M34 12V26M66 12V26';
const dots=[[30,52],[46,52],[62,52],[30,68],[46,68]].map(([x,y])=>rr(x,y,8,8,2)).join('');
const ICONS={
 /* actions */
 sparkle:{a:[['F',star(42,58,28)],['D',star(76,24,13),4]]},
 edit:{a:[['F','M65 17L83 35L36 82L15 86L19 65Z'],['x','M56 26L74 44',6]]},
 copy:{a:[['s','M34 34V24A10 10 0 0 1 44 14H76A10 10 0 0 1 86 24V56A10 10 0 0 1 76 66H66'],['F',rr(14,34,52,52,10)]],
       b:[['F',rr(34,14,52,52,10)],['x',rr(14,34,52,52,10),17],['F!',rr(14,34,52,52,10)]]},
 paste:{a:[['s','M38 22H28A10 10 0 0 0 18 32V78A10 10 0 0 0 28 88H72A10 10 0 0 0 82 78V32A10 10 0 0 0 72 22H62'],['F',rr(38,12,24,18,6)],['x','M50 44V72M39 61L50 72L61 61']],
        b:[['F',rr(18,22,64,66,10)],['F',rr(38,12,24,18,6)],['x','M50 44V72M39 61L50 72L61 61']]},
 selectall:{a:[['s','M30 14H14V30M70 14H86V30M14 70V86H30M86 70V86H70'],['s','M34 51L45 62L67 39']],
            b:[['F',rr(14,14,72,72,14)],['x','M34 51L45 62L67 39']]},
 close:{a:[['s','M28 28L72 72M72 28L28 72']]},
 plus:{a:[['s','M50 20V80M20 50H80']]},
 minus:{a:[['s','M20 50H80']]},
 trash:{a:[['s','M16 27H84'],['s','M38 27V22A6 6 0 0 1 44 16H56A6 6 0 0 1 62 22V27'],['F','M24 37H76L73 80A8 8 0 0 1 65 88H35A8 8 0 0 1 27 80Z'],['x','M42 50V74M58 50V74',6]]},
 move:{a:[['s','M18 36H80M66 22L80 36L66 50M82 64H20M34 50L20 64L34 78']]},
 grip:{a:[['s','M20 32H80M20 50H80M20 68H80']]},
 check:{a:[['s','M18 52L40 74L82 28']]},
 undo:{a:[['s','M34.6 30.4A29 29 0 1 0 70.5 34.5L65.6 29.5'],['s','M82.6 29.5L65.6 29.5L65.6 46.5']]},
 replay:{a:[['s','M65.4 30.4A29 29 0 1 1 29.5 34.5L34.4 29.5'],['s','M17.4 29.5L34.4 29.5L34.4 46.5']]},
 expand:{a:[['s','M58 16H84V42M84 16L58 42M42 84H16V58M16 84L42 58']]},
 collapse:{a:[['s','M82 42H58V18M58 42L84 16M18 58H42V82M42 58L16 84']]},
 share:{a:[['F','M46 18L14 48L46 78V61C64 61 75 66 86 82C83 57 70 40 46 37Z']]},
 search:{a:[['s',circ(44,44,25)],['s','M63 63L84 84']]},
 download:{a:[['s','M50 14V58M32 40L50 58L68 40'],['s','M16 64V76A10 10 0 0 0 26 86H74A10 10 0 0 0 84 76V64']]},
 link:{a:[['s','M42.4 53.8A19 19 0 0 0 71.1 55.9L82.5 44.5A19 19 0 0 0 55.6 17.6L49.0 24.1'],['s','M57.6 46.2A19 19 0 0 0 28.9 44.1L17.5 55.5A19 19 0 0 0 44.4 82.4L50.9 75.9']]},
 file:{a:[['F','M28 12H54L80 38V80A8 8 0 0 1 72 88H28A8 8 0 0 1 20 80V20A8 8 0 0 1 28 12Z'],['x','M54 14V30A8 8 0 0 0 62 38H78',6],['x','M34 58H66M34 72H56',6]]},
 /* directions */
 chevronR:{a:[['s','M38 20L68 50L38 80']]},
 chevronL:{a:[['s','M62 20L32 50L62 80']]},
 chevronD:{a:[['s','M20 36L50 66L80 36']]},
 chevronU:{a:[['s','M20 64L50 34L80 64']]},
 arrowR:{a:[['s','M16 50H82M58 26L82 50L58 74']]},
 arrowL:{a:[['s','M84 50H18M42 26L18 50L42 74']]},
 arrowU:{a:[['s','M50 84V18M26 42L50 18L74 42']]},
 arrowD:{a:[['s','M50 16V82M26 58L50 82L74 58']]},
 arrowUR:{a:[['s','M24 76L74 26M36 26H74V64']]},
 /* states & meaning */
 calendar:{a:[['F',calFrame],['s!',rings],['x','M14 40H86',7],['X',dots]],
           b:[['F',calFrame],['s','M34 10V22M66 10V22'],['X',dots]]},
 calendarCheck:{a:[['F',calFrame],['s!',rings],['x','M14 40H86',7],['x','M34 62L45 73L66 51']],
                b:[['F',calFrame],['s','M34 10V22M66 10V22'],['x','M34 62L45 73L66 51']]},
 calendarLands:{a:[['S-',calFrame],['s5','M34 12V26M66 12V26']]},
 lock:{a:[['s','M32 46V34A18 18 0 0 1 68 34V46'],['F',rr(20,46,60,42,10)],['x','M50 60V72']]},
 trendUp:{a:[['s','M14 74L38 50L56 64L84 34M64 34H84V54']]},
 trendFlat:{a:[['s','M14 50H84M66 32L84 50L66 68']]},
 avoid:{a:[['F',circ(50,50,34)],['x','M32 50H68']],b:[['F',circ(50,50,34)],['x','M30 50H70',13]]},
 alert:{a:[['F',circ(50,50,34)],['x','M50 32V54'],['X',circ(50,68,5.5)]]},
 info:{a:[['F',circ(50,50,34)],['x','M50 46V68'],['X',circ(50,32,5.5)]]},
 eye:{a:[['F','M10 50C25 26 75 26 90 50C75 74 25 74 10 50Z'],['D',circ(50,50,10)]],
      b:[['F','M10 50C25 26 75 26 90 50C75 74 25 74 10 50Z'],['X',circ(50,50,17)],['D!',circ(50,50,9)]]},
 /* navigation */
 navToday:{a:[['F',rr(18,18,64,64,16)]]},
 navTrain:{a:[['s','M36 50H64'],['F',rr(22,26,12,48,5)],['F',rr(66,26,12,48,5)],['F',rr(10,36,10,28,4)],['F',rr(80,36,10,28,4)]]},
 navProgress:{a:[['F',rr(16,58,12,28,4)],['F',rr(44,38,12,48,4)],['F',rr(72,16,12,70,4)]]},
 navSettings:{a:[['F',gear()],['X',circ(50,50,12)]],b:[['F',gear()],['X',circ(50,50,12)]]},
 /* weather */
 sun:{a:[['F',circ(50,50,16)],['s','M50 12V22M50 78V88M12 50H22M78 50H88M23 23L30 30M70 70L77 77M77 23L70 30M30 70L23 77']]},
 moon:{a:[['F','M62 14A36 36 0 1 0 86 58A28 28 0 0 1 62 14Z']]},
 cloud:{a:[['F',cloud(0)]]},
 sunCloud:{a:[['s','M38 12V18M16 34H22M22 18L26 22M54 18L50 22'],['F','M27 44A14 14 0 0 1 52 30'],['F!',cloud(4)]],
           b:[['s','M38 12V18M16 34H22M22 18L26 22M54 18L50 22'],['F',circ(38,36,14)],['x',cloud(4),18],['F!',cloud(4)]]},
 moonCloud:{a:[['F','M44 12A22 22 0 1 0 60 40A16 16 0 0 1 44 12Z'],['F!',cloud(6)]],
            b:[['F','M44 12A22 22 0 1 0 60 40A16 16 0 0 1 44 12Z'],['x',cloud(6),18],['F!',cloud(6)]]},
 rain:{a:[['F',cloud(-12)],['s','M36 78L32 88M52 78L48 88M68 78L64 88']]},
 snow:{a:[['F',cloud(-12)],['D',circ(34,82,4.5)+circ(50,86,4.5)+circ(66,82,4.5)]]},
 sleet:{a:[['F',cloud(-12)],['s','M36 78L32 88M64 78L60 88'],['D',circ(50,84,4.5)]]},
 thunder:{a:[['F',cloud(-12)],['F!','M52 62L40 80H52L46 94L64 72H52L58 62Z']],
          b:[['F',cloud(-12)],['x','M52 62L40 80H52L46 94L64 72H52L58 62Z',14],['F!','M52 62L40 80H52L46 94L64 72H52L58 62Z']]},
 fog:{a:[['F',cloud(-18)],['s','M16 74H84M28 88H72']]}
};
let uid=0;const W0=7.5;let LINE_W=10;
function draw(name,style,sz,extra='',lw){
 const ic=ICONS[name];if(!ic)return '';
 const els=(style==='B'&&ic.b)?ic.b:ic.a;
 const lineOnly=els.every(e=>e[0]==='s'||e[0]==='s!'||e[0]==='S-'||e[0]==='s5');
 const W=(style==='B'&&lineOnly&&!els.some(e=>e[0]==='S-'||e[0]==='s5'))?(lw||LINE_W):W0;const id='m'+(++uid);
 const masked=[],top=[],cuts=[];
 const strokeEl=(d,w=W,dash)=>`<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}"${dash?' stroke-dasharray="8 7.5"':''}/>`;
 for(const [k0,d,w] of els){const onTop=k0.endsWith('!');const k=k0.replace('!','');let out='';
  if(style==='A'){
   if(k==='F'||k==='s'||k==='x')out=strokeEl(d);
   else if(k==='X')out=`<path d="${d}" fill="currentColor" stroke="currentColor" stroke-width="2"/>`;
   else if(k==='D')out=`<path d="${d}" fill="currentColor" stroke="currentColor" stroke-width="${w||0}"/>`;
   else if(k==='S-')out=strokeEl(d,5,true);
   else if(k==='s5')out=strokeEl(d,5);
   (onTop?top:masked).push(out);
  } else {
   if(k==='F')out=`<path d="${d}" fill="currentColor" stroke="currentColor" stroke-width="${W}"/>`;
   else if(k==='s')out=strokeEl(d);
   else if(k==='D')out=`<path d="${d}" fill="currentColor" stroke="currentColor" stroke-width="${w||0}"/>`;
   else if(k==='s5')out=strokeEl(d,5);
   else if(k==='S-')out=strokeEl(d,5,true);
   else if(k==='x'){cuts.push(`<path d="${d}" fill="none" stroke="#000" stroke-width="${w||W}"/>`);continue;}
   else if(k==='X'){cuts.push(`<path d="${d}" fill="#000" stroke="#000" stroke-width="2"/>`);continue;}
   (onTop?top:masked).push(out);
  }
 }
 const mask=cuts.length?`<mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>${cuts.join('')}</mask>`:'';
 return `<svg class="ic2 ic2-${name}" viewBox="6 6 88 88" width="${sz}" height="${sz}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${mask}<g${cuts.length?` mask="url(#${id})"`:''}>${masked.join('')}</g>${top.join('')}</svg>`;
}
G.ICONSET={ICONS,draw,setLine:v=>LINE_W=v};
})(typeof window!=='undefined'?window:globalThis);
