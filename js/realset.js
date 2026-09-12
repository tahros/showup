/* ---- WHICH SETS ARE REAL -------------------------------------------------
   Counting sets treats a warm-up, a burnout and a working set as one thing.
   The maker's own record shows why that fails: his shoulder press ran ten to
   twelve sets a session all spring, and FOUR of them were work. When he cut
   the junk in August the set count halved and every real set got heavier --
   an app counting sets reads that as a 40% decline and tells him to undo the
   best change he made all year.
   Three facts decide it, and none needs new logging:

   1. LOAD, against this exercise's own top TODAY. Not the day's top: with
      bodyweight counted, a dip at BW+25 outweighs a bench single, so a
      day-wide comparison measures cable flies against dips.
   2. BODYWEIGHT IS LOAD. A pull-up at "0 lb" is the maker's 154 lb. Without
      this every bodyweight set has a top of zero and the arithmetic is void.
   3. REPS, only as a ceiling. Past ~35 reps the cardiovascular system quits
      before the muscle does. Below that the LOAD does the separating --
      155x10 at 89% is work, 110x25 at 67% is not, and a rep cap at 15 would
      have thrown out 132x15, which the maker confirmed is real.
*/
const REAL_FLOOR=0.70;     // share of this exercise's top load today
const REAL_REP_CAP=20;     // beyond this the set trains breathing, not muscle
/* v4.3.6: TWENTY, not thirty-five. The table of rep bands puts hypertrophy at
   6-30 and "too light" at 35+, and on that reading January's 35.3 lb x 30 --
   80% of that day's top -- is real work. The maker says it is trash, and he
   is right for a reason the percentage cannot see: his top THAT DAY was
   itself light, so measuring against it proves nothing. Thirty reps is the
   tell that the whole session was light.
   Twenty is the highest ceiling that gets every one of his rulings right:
   132x15 survives, a 16-rep pull-up survives, 30-rep burnouts do not, and
   August reads as the improvement it was rather than a halving. */

function realSetBodyweight(){
  const kg=+(DB?.settings?.bodyweight||DB?.settings?.bw||0);
  return kg>0?kg:0;        // 0 means "not set" -- see realSetLoad
}
/* the load a set actually moved, in kg */
function realSetLoad(row,set){
  const added=+(set?.w ?? row?.w ?? 0)||0;
  return isBodyweightEx(row?.ex)?realSetBodyweight()+added:added;
}
/* v4.3.6: bodyweight movements are the ones the record logs at zero while the
   maker is plainly carrying himself. Without a bodyweight on file the load is
   whatever was added, which for a plain pull-up is zero -- so every set ties
   for top and they all count. That is the right failure: it counts too much
   rather than silently discarding a day's work. */
function isBodyweightEx(ex){
  return /pull up|chin up|dip|push up|hanging leg raise|sit up|plank/i.test(String(ex||''));
}
/* rows: [{ex, w, reps:[...]}] for ONE exercise on ONE day */
function realSets(rows){
  const flat=[];
  for(const r of rows||[]) for(const reps of (r.reps||[])) flat.push({ex:r.ex,w:realSetLoad(r),reps});
  if(!flat.length) return [];
  const top=Math.max(...flat.map(s=>s.w));
  if(!(top>0)) return flat.filter(s=>s.reps<=REAL_REP_CAP);   // no load on file
  return flat.filter(s=>s.w>=top*REAL_FLOOR && s.reps<=REAL_REP_CAP);
}
function realSetCount(rows){ return realSets(rows).length; }
if(typeof module!=='undefined') module.exports={realSets,realSetCount,realSetLoad,isBodyweightEx,REAL_FLOOR,REAL_REP_CAP};
