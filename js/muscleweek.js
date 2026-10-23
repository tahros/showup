/* v4.6.397: MUSCLE THIS WEEK. Working sets per muscle, this week, as one bar each.

   The number that tracks muscle growth is hard sets per muscle per week (ACSM 2026: about 10
   for hypertrophy; past that, more still helps, by less each set -- Sports Medicine 2026,
   56:481). So each bar runs to 20 with a mark at 10, and nothing on the card says what to do
   about it: the mark is a reference, not a goal.

   What counts, all from rules the app already keeps:
     a WORKING set   -- realSets() (js/realset.js): this exercise's sets near the day's top load
                        and under the rep ceiling. Warm-ups and burnouts are not growth work.
     its MAIN muscle -- exMuscle() (js/derive.js), the table every card reads, or the muscle you
                        set for an exercise you made. Counts 1.
     its HELPERS     -- MW_HELP below. Count 1/2, the counting that best predicted growth in
                        that meta-analysis (indirect sets as half a set).
   A set whose exercise has no muscle at all (a custom Legs movement nobody set) is counted in
   no bar rather than guessed into one; the card says how many. The week is the app's week
   (weekDays(), your Settings start day), the same window as every weekly number here. */
/* helpers: the muscles that do real work in the lift besides its main one (a muscle that only
   steadies it is left out; every press and dip counts the front delts and triceps). Each set
   counts half for each. */
const MW_HELP={
  'Incline Smith Machine Bench Press':['front-delts','triceps'],'Incline Dumbbell Bench Press':['front-delts','triceps'],
  'Incline Barbell Bench Press':['front-delts','triceps'],'Flat Smith Machine Bench Press':['triceps','front-delts'],
  'Chest Press':['triceps','front-delts'],'Machine Chest Press':['triceps','front-delts'],'Barbell Bench Press':['triceps','front-delts'],
  'Dumbbell Bench Press':['triceps','front-delts'],'Landmine Press':['front-delts','triceps'],'Dumbbell Pullover':['lats'],
  'Push Up':['triceps','front-delts'],'Weighted Push Up':['triceps','front-delts'],'Dip':['triceps','front-delts'],
  'Decline Barbell Bench Press':['triceps','front-delts'],'Decline Dumbbell Bench Press':['triceps','front-delts'],'Pull Up':['biceps'],
  'Weighted Pull Up':['biceps'],'Chin Up':['biceps'],'Lat Pulldown':['biceps'],'Close-Grip Lat Pulldown':['biceps'],'Bent-Over Row':['lats','biceps'],
  'Pendlay Row':['lats','biceps'],'Seated Cable Row':['lats','biceps'],'Single-Arm Dumbbell Row':['lats','biceps'],'T-Bar Row':['lats','biceps'],
  'Inverted Row':['lats','biceps'],'Chest-Supported Row':['lats','biceps','rear-delts'],'Machine Row':['lats','biceps'],'Rack Pull':['glutes'],
  'Deadlift':['glutes','upper-back'],'Romanian Deadlift':['glutes'],'Dumbbell Shoulder Press':['triceps','side-delts'],
  'Overhead Barbell Press':['triceps','side-delts'],'Arnold Press':['side-delts','triceps'],'Machine Shoulder Press':['triceps','side-delts'],
  'Dumbbell Combination':['front-delts'],'Upright Row':['upper-back'],'Dumbbell Bent Over Side Raise':['upper-back'],'Rear Deltoids':['upper-back'],
  'Face Pull':['upper-back'],'Reverse Pec Deck':['upper-back'],'Cable Rear Delt Fly':['upper-back'],'Squat':['glutes'],'Front Squat':['glutes'],
  'Hack Squat':['glutes'],'Leg Press':['glutes'],'Goblet Squat':['glutes'],'Bulgarian Split Squat':['glutes'],'Dumbbell Lunge':['glutes'],
  'Walking Lunge':['glutes'],'Step Up':['glutes'],'Hip Thrust':['hamstrings'],'Close Grip Bench Press':['chest','front-delts'],
  'Diamond Push Up':['chest','front-delts'],'Hanging Leg Raise':['obliques'],'Plank':['obliques'],'Russian Twist':['abs'],'Bicycle Crunch':['abs'],
  'Bench Dip':['front-delts'],'Svend Press':['front-delts','triceps']
};
const MW_HELP_ID=Object.fromEntries(Object.entries(MW_HELP).map(([n,m])=>[exSlug(n),m]));
/* the rows, in the order they read on a body: upper first, then core and legs */
const MW_ROWS=[['Upper',[['Chest',['upper-chest','chest','lower-chest']],['Front delts',['front-delts']],['Side delts',['side-delts']],['Rear delts',['rear-delts']],
    ['Lats',['lats']],['Upper back',['upper-back']],['Biceps',['biceps']],['Triceps',['triceps']]]],
  ['Core & legs',[['Abs',['abs']],['Obliques',['obliques']],['Quads',['quads']],['Hamstrings',['hamstrings']],['Glutes',['glutes']],['Calves',['calves']]]]];
const MW_MARK=10,MW_SCALE=20;
function mwRows(iso){
  if(iso===todayISO)return ((DB.days[iso]||{}).w||[]).map(s=>({part:s.part,ex:s.ex,w:s.w,reps:s.reps||[]}));
  return (SEED.sessions?.[iso]||[]).map(r=>({part:r[0],ex:r[1],w:r[2],reps:r[3]||[]}));
}
/* this week: working sets per muscle (helpers at half), the total, and sets nobody has a muscle for */
function muscleWeek(){
  const days=weekDays(),m={},by={};let total=0,loose=0;
  for(const iso of days){
    if(iso>todayISO)continue;
    const g={};for(const r of mwRows(iso)){if(r.ex==='Run'||!r.reps.length)continue;(g[r.ex]=g[r.ex]||[]).push(r);}
    for(const [ex,rows] of Object.entries(g)){
      const n=typeof realSets==='function'?realSets(rows).length:rows.reduce((a,r)=>a+r.reps.length,0);if(!n)continue;
      total+=n;
      const part=rows[0].part,main=typeof exMuscle==='function'?exMuscle(ex,part):'unassigned';
      if(!main||main==='unassigned'){loose+=n;continue;}
      m[main]=(m[main]||0)+n;(by[main]=by[main]||{})[ex]=(by[main][ex]||0)+n;
      for(const h of MW_HELP_ID[exIdOf(ex)]||[])if(h!==main)m[h]=(m[h]||0)+n/2;
    }
  }
  return {days,m,total,loose};
}
const mwNum=v=>Number.isInteger(v)?String(v):v.toFixed(1);
function muscleWeekCard(){
  const {days,m,total,loose}=muscleWeek();
  const d0=new Date(days[0]+'T00:00'),d6=new Date(days[6]+'T00:00');
  const range=d0.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+(d0.getMonth()===d6.getMonth()?d6.getDate():d6.toLocaleDateString('en-US',{month:'short',day:'numeric'}));
  const rows=MW_ROWS.map(([g,list])=>`<div class="mw-grp">${g}</div>`+list.map(([name,keys])=>{
    const v=keys.reduce((a,k)=>a+(m[k]||0),0),w=Math.min(100,v/MW_SCALE*100);
    return `<span class="mw-name">${name}</span><span class="mw-bar" role="img" aria-label="${name}: ${mwNum(v)} working sets"><i style="width:${w.toFixed(1)}%"></i><u></u></span><span class="mw-n">${mwNum(v)}</span>`;
  }).join('')).join('');
  return `<div class="mw-head"><strong>${range}</strong><span>${total} working set${total===1?'':'s'}</span></div>
    <div class="mw-rows">${rows}</div>
    <p class="mw-foot">Mark at 10 sets.${loose?` ${loose} set${loose===1?'':'s'} with no muscle set aren’t in a bar.`:''}</p>`;
}
