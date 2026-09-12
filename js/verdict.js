/* ---- STEP UP, OR HOLD ----------------------------------------------------
   The writer's package has carried ONE precomputed load per exercise since it
   was written: `next`, the plate face above your last top set. It is populated
   for every lift, always, and it only ever points UP. So when 215 gave the
   maker 6/6/4/4 the package still handed the model 225, and the prompt's own
   rule -- step only if the reps held -- had nothing to enforce it with.
   The fix is not a bigger rule. It is a field that can say no.

   TWO verdicts, not three. There was a `back off` and the maker deleted it:
     "I should be able to do 8 8 8 8, so until that day, hold."
   The weight is not wrong, he has not finished with it. The app never tells
   him to go down.

   The test is the rep range, not the drop-off. Hit the top of the range on
   EVERY working set and the weight goes up; anything less holds. That is what
   separates his 185 x 8/8/8/8 -> step up from his 125 x 8/8/6/4 -> hold, and
   a drop-off rule gets the second right and the first wrong.
*/
function verdictFor(sessions,range){
  if(!range||!(sessions||[]).length) return null;
  const last=sessions[sessions.length-1];
  const at=(last.sets||[]).filter(s=>Math.abs(s.w-range.weight)<1e-6);
  if(at.length<2) return null;                 // one set says nothing
  const reps=at.map(s=>s.reps);
  /* v4.3.8: THREE OUTCOMES, because the maker gave two kinds of step up.
     185 x 8/8/8/8 -> "step up (reps 8 -> 10)". 30 x 12/12/12 -> "step up
     (weight)". Same clean shape, different answer, and the difference is
     where the uniform number sits in the range: at the floor you climb in
     reps, at the ceiling you add load.
     UNIFORM is the test, not "every set cleared the top". A session that
     wobbles -- 155 x 10/10/10/9 -- is one he called hold, and every falling
     or uneven session in his twelve is a hold. Holding the same number on
     every set is what says you own the weight. */
  const uniform=reps.length>=3 && Math.max(...reps)===Math.min(...reps);
  const n=reps[0];
  if(uniform && n>=range.high)
    return {verdict:'step up weight', reps:range.low,
      why:`${range.weight} × ${reps.join('/')} — ${range.high} on every set`};
  if(uniform && n>=range.low)
    return {verdict:'step up reps', reps:Math.min(range.high,n+2),
      why:`${range.weight} × ${reps.join('/')} — clean at ${n}, climb to ${Math.min(range.high,n+2)}`};
  return {verdict:'hold', reps:range.high,
    why:`${range.weight} × ${reps.join('/')} — ${range.low}\u2013${range.high} not yet complete`};
}
/* the load the verdict implies. Holding means the SAME weight -- the package
   used to have no way to say that, which is the whole bug. */
function verdictLoad(v,range,nextUp){
  if(!v||!range) return null;
  /* only clearing the CEILING moves the load. Climbing within the range keeps
     the same weight and asks for more reps -- which is the thing the old
     `next` field could not express at all. */
  return v.verdict==='step up weight'?(nextUp??range.weight):range.weight;
}
if(typeof module!=='undefined') module.exports={verdictFor,verdictLoad};
