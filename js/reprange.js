/* ---- REP RANGES ----------------------------------------------------------
   A rep range is what turns a session into a verdict: hit the top of the range
   on every set and the weight goes up; otherwise it holds. Without one the app
   can only watch reps drift and guess.
   The range is DERIVED, never prescribed -- the maker's own record knows what
   he does. A first attempt scored 10 of 14 against his own answers, and the
   four misses were all one fault:

   IT READ ACROSS A WEIGHT CHANGE. His cable fly reps of 15 were at 15 lb, back
   in August, before he moved to 30. Pooling every weight together picked the
   light era's reps and proposed 13-15 for a lift he now does for 12. Same for
   pull-ups, where he has just added 25 lb and his reps have properly fallen.
   So the range comes from the CURRENT working weight only. A weight he moved
   to yesterday has almost no evidence behind it, and that is reported rather
   than hidden -- see confidence below. */
const RANGE_SPAN=2;          // a range is its ceiling and two below

/* sessions: [{d, sets:[{w,reps}]}] for ONE exercise, newest last, real sets only */
function repRangeFor(sessions){
  const s=(sessions||[]).filter(x=>x&&(x.sets||[]).length);
  if(!s.length) return null;
  /* the working weight: the load carrying the most sets in the latest session.
     Not the heaviest -- a top single is not the work. */
  const last=s[s.length-1];
  const by={}; for(const x of last.sets) (by[x.w]=by[x.w]||[]).push(x.reps);
  const working=+Object.entries(by).sort((a,b)=>b[1].length-a[1].length||b[0]-a[0])[0][0];
  /* Two filters below, and they are REDUNDANT for every case the suite can
     construct: removing either leaves the other enforcing the split, so a
     probe of one alone always passes. They guard different shapes -- the
     session filter drops a whole lighter session, the set filter drops a top
     single sitting inside the working session -- and I could not build a case
     that separates them. Kept as a pair, and recorded as untested rather than
     claimed as covered. */
  /* every session that used that same weight, and only those */
  const atWeight=s.filter(x=>x.sets.some(y=>Math.abs(y.w-working)<1e-6));
  const reps=atWeight.flatMap(x=>x.sets.filter(y=>Math.abs(y.w-working)<1e-6).map(y=>y.reps));
  if(!reps.length) return null;
  /* v4.3.7: WHICH END OF THE RANGE THE EVIDENCE GIVES YOU.
     If the reps FALL across the session, the best you repeat is the CEILING --
     you are still reaching for it. If they are uniform, you have mastered that
     number and it is the FLOOR; the ceiling is where you are climbing to. That
     is the difference between the maker's "185 x 8/8/8/8 -> step up to 10" and
     his "125 x 8/8/6/4 -> hold 6-8". Same weight, opposite ends. */
  const latest=last.sets.filter(y=>Math.abs(y.w-working)<1e-6).map(y=>y.reps);
  const uniform=latest.length>=3 && Math.max(...latest)-Math.min(...latest)<=0;
  const count={}; reps.forEach(r=>count[r]=(count[r]||0)+1);
  const repeated=Object.keys(count).filter(r=>count[r]>=2).map(Number);
  const best=repeated.length?Math.max(...repeated):Math.max(...reps);
  /* when the latest session is uniform, the number you MASTERED is that
     session's number -- not the best you ever managed at this weight. Pooling
     read the maker's 55 lb press as 10-12 because he once hit 10s, when he is
     now doing clean 8s and climbing from there. */
  const hi=uniform?latest[0]+RANGE_SPAN:best;
  return {
    low:Math.max(1,hi-RANGE_SPAN), high:hi, weight:working, uniform,
    sessions:atWeight.length,
    /* two sessions at a weight is the least that can show a repeat; below that
       the range is a first guess and should be offered, not asserted */
    confident:atWeight.length>=2
  };
}
if(typeof module!=='undefined') module.exports={repRangeFor,RANGE_SPAN};
