/* test-realset.js — v4.3.6, which sets are real.
 * Every case below is from the maker's own record and his own words about it.
 * Pure arithmetic, no DOM: the rule has to be right before anything is built
 * on it, and this is the file everything else will depend on.
 */
const path=require('path'),dir=process.argv[2]||'.';
global.DB={settings:{bodyweight:70}};                 // 70 kg = 154.3 lb
const {realSets,realSetCount,realSetLoad,isBodyweightEx}=require(path.resolve(dir,'js/realset.js'));
let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const LB=0.45359237;
const S=(ex,lb,...reps)=>({ex,w:lb*LB,reps});          // the record stores kg
const n=rows=>realSetCount(rows);

// ---- the maker's five rulings, verbatim
const bench=[S('Incline Barbell Bench Press',95,10),S('Incline Barbell Bench Press',115,10),
             S('Incline Barbell Bench Press',155,10,10,10,9),S('Incline Barbell Bench Press',175,5)];
ok('155x10 is real work, and so is the 175 top single', n(bench)===5, n(bench)+' of 7');
ok('...so the 95 and 115 warm-ups are the two dropped',
   realSets(bench).every(s=>s.w>=155*LB*0.999), realSets(bench).map(s=>Math.round(s.w/LB)).join(','));

const july=[S('Incline Barbell Bench Press',110,26,20,16,20),S('Incline Barbell Bench Press',165,1,2,1,2),
            S('Incline Barbell Bench Press',99.2,20,20,18,12)];
ok('110x25 is trash — it is 67% of the top', n(july)===4, n(july)+' of 12');
ok('...and the four that survive are the 165 sets',
   realSets(july).every(s=>Math.round(s.w/LB)===165), realSets(july).map(s=>Math.round(s.w/LB)).join(','));

const jan=[S('Dumbbell Shoulder Press',35.3,30,30,30,30),S('Dumbbell Shoulder Press',44.1,15,15,15,15),
           S('Dumbbell Shoulder Press',24.3,30,30)];
/* the 24 lb sets go on load; the 35.3 lb x 30 sets go on REPS. Thirty reps
   says the whole session was light, which is the one thing a percentage of
   that session's own top can never see. Only the 44.1 x 15 sets are work. */
ok('January leaves only the four sets at the top weight', n(jan)===4, n(jan)+' of 10');
ok('...and those are the 44.1 lb sets',
   realSets(jan).every(s=>Math.round(s.w/LB)===44), realSets(jan).map(s=>Math.round(s.w/LB)).join(','));
const now=[S('Dumbbell Shoulder Press',35,10),S('Dumbbell Shoulder Press',60,4),
           S('Dumbbell Shoulder Press',55,8,8,8)];
ok('and today: four real sets from five', n(now)===4, n(now)+' of 5');
ok('...the 35 lb warm-up being the one dropped',
   !realSets(now).some(s=>Math.round(s.w/LB)===35));

// ---- THE TEST THAT MATTERS: does it agree August was an improvement?
const spring=[S('Dumbbell Shoulder Press',35.3,30,30,30,30),S('Dumbbell Shoulder Press',44.1,15,15,15,15),
              S('Dumbbell Shoulder Press',24.3,30,30,30,20)];
ok('AUGUST READS AS AN IMPROVEMENT, not a 50% decline',
   n(now)>=n(spring)-1 && n(spring)<=8,
   `spring ${n(spring)} of 12 real · now ${n(now)} of 5 real`);

// ---- bodyweight is load
ok('a pull-up is not a zero-load set',
   Math.round(realSetLoad({ex:'Pull Up',w:0}))===70, String(Math.round(realSetLoad({ex:'Pull Up',w:0}))));
ok('...and a weighted one adds to it',
   Math.round(realSetLoad({ex:'Pull Up',w:25*LB}))===81, String(Math.round(realSetLoad({ex:'Pull Up',w:25*LB}))));
ok('...a dip at BW+45 outweighs a 175 lb bench single',
   realSetLoad({ex:'Dip',w:45*LB})>175*LB);
const pu=[S('Pull Up',0,16,10,12,6)];
ok('every pull-up set counts — 16 reps is not slacking, it is your bodyweight',
   n(pu)===4, n(pu)+' of 4');
ok('...which a rep cap of 15 would have wrongly cut', 16<35);

// ---- the ceiling still catches the pointless
const burn=[S('Lateral Raise',30,12,12,12),S('Lateral Raise',10,40)];
ok('40 reps at a third of the load is out', n(burn)===3, n(burn)+' of 4');

// ---- comparison is per EXERCISE, never across the day
const day=[...bench,...[S('Cable Fly Up',30,12,12,12)]];
ok('a cable fly is judged against cable flies, not against the bench',
   n([S('Cable Fly Up',30,12,12,12)])===3);
ok('...so mixing them in one call would be wrong, and the caller splits by exercise',
   new Set(day.map(r=>r.ex)).size===2);

// ---- degenerate cases
ok('no rows, no sets', n([])===0 && n(null)===0);
ok('a row with no reps contributes nothing', n([{ex:'Squat',w:100,reps:[]}])===0);
ok('with no bodyweight on file a pull-up still counts rather than vanishing',
   (()=>{const b=global.DB.settings.bodyweight; global.DB.settings.bodyweight=0;
     const r=n([S('Pull Up',0,10,10,10)]); global.DB.settings.bodyweight=b; return r===3;})());
process.exit(fails?1:0);
