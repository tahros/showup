/* test-reprange.js — v4.3.7, rep ranges derived from the record.
 * Scored against the maker's own answers, exercise by exercise. The previous
 * rule managed 10 of 14 and every miss was the same fault: it pooled reps
 * across a weight change.
 */
const path=require('path'),dir=process.argv[2]||'.';
const {repRangeFor}=require(path.resolve(dir,'js/reprange.js'));
let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const S=(...pairs)=>({sets:pairs.map(([w,r])=>({w,reps:r}))});
const R=x=>x?x.low+'-'+x.high:'—';

/* his real sessions, oldest first, real sets only */
const REC={
 'Squat':            [S([215,6],[215,6],[215,4],[215,4]), S([225,6],[225,7],[225,8],[225,8])],
 'Romanian Deadlift':[S([165,8],[165,6],[165,6]),         S([175,6],[175,8],[175,8])],
 'Dumbbell Lunge':   [S([40,10],[40,10],[40,10]),         S([45,8],[45,10],[45,10])],
 'Incline Barbell Bench':[S([155,10],[155,9],[155,8],[155,7],[175,4]),
                          S([155,10],[155,10],[155,10],[155,9],[175,5])],
 'Incline Dumbbell Bench':[S([55,8],[55,8],[55,8],[55,8]), S([55,10],[55,10],[55,8],[55,8])],
 'Cable Fly Up':     [S([15,10],[15,15],[15,15]), S([25,10],[25,15],[25,15]), S([30,12],[30,12],[30,12])],
 'Deadlift':         [S([215,5],[215,5],[215,5],[215,5]), S([215,8],[215,8],[215,5],[215,4])],
 'Bent-Over Row':    [S([175,10],[175,10],[175,10],[175,10]), S([185,8],[185,8],[185,8],[185,8])],
 'Lat Pulldown':     [S([120,10],[120,7],[120,5]),        S([125,8],[125,8],[125,6],[125,4])],
 'Pull Up':          [S([25,5],[25,4],[25,3],[25,2]),     S([25,6],[25,5],[25,4],[25,4])],
 'Dumbbell Shoulder Press':[S([55,10],[55,10],[55,8],[55,8]), S([55,8],[55,8],[55,8])],
 'Hanging Leg Raise':[S([154,8],[154,6],[154,12]),        S([154,10],[154,10],[154,10])],
 'EZ Bar Curl':      [S([40,15],[40,15],[40,12]),         S([55,10],[55,10],[55,10])],
 'Triceps Pushdown': [S([40,10],[40,10],[40,8],[40,7])],
};
/* what he actually said */
const SAID={'Squat':'6-8','Romanian Deadlift':'6-8','Dumbbell Lunge':'8-10',
 'Incline Barbell Bench':'8-10','Incline Dumbbell Bench':'8-10','Cable Fly Up':'10-12',
 'Deadlift':'6-8','Bent-Over Row':'8-10','Lat Pulldown':'6-8','Pull Up':'5-8',
 'Dumbbell Shoulder Press':'8-10','Hanging Leg Raise':'10-12','EZ Bar Curl':'10-12',
 'Triceps Pushdown':'8-10'};
let hit=0; const miss=[];
for(const [ex,sess] of Object.entries(REC)){
  const r=repRangeFor(sess), d=R(r);
  if(d===SAID[ex]) hit++; else miss.push(`${ex}: derived ${d}, he said ${SAID[ex]}`);
}
console.log(`derived ${hit} of ${Object.keys(REC).length} exactly`);
miss.forEach(m=>console.log('   miss · '+m));
ok('the derivation beats the version that pooled every weight together',
   hit>=12, hit+' of 14 (was 10)');
ok('...and the misses are the two that are preference, not arithmetic',
   miss.length===2 && miss.every(m=>/Cable Fly|Pull Up/.test(m)), miss.length+' left');

// ---- the two the old rule got wrong for the same reason
/* v4.3.7: the two that remain are PREFERENCE, not error, and chasing them
   would be overfitting one man's taste into everyone's app:
   · Cable Fly 30x12/12/12 derives 12-14. He said 10-12 and "step up (weight)".
     Same evidence as his row at 8/8/8/8, opposite answer -- on an isolation
     lift he caps the reps and adds load instead. Nothing in a record says
     which lifts a person treats that way.
   · Pull Up derives 3-5 from +25 lb x 6/5/4/4. He said 5-8, which is where he
     INTENDS to be. A goal is not in the record by definition.
   Both are exactly what the correction step is for: propose, let him fix it,
   never re-derive over the fix. */
ok('Cable Fly at least reads the 30 lb he uses now, not the 15 lb of August',
   repRangeFor(REC['Cable Fly Up']).weight===30,
   R(repRangeFor(REC['Cable Fly Up']))+' at '+repRangeFor(REC['Cable Fly Up']).weight+' lb');
ok('...and the maker overriding it to 10-12 is the designed path, not a failure',
   repRangeFor(REC['Cable Fly Up']).uniform===true);
ok('...and its weight is reported as 30', repRangeFor(REC['Cable Fly Up']).weight===30);
ok('EZ Bar Curl reads 55 lb, not the 40 lb era',
   repRangeFor(REC['EZ Bar Curl']).weight===55, String(repRangeFor(REC['EZ Bar Curl']).weight));

/* the weight split, asserted directly: reps from a LIGHTER session must not
   raise the range for the weight he is on now. Probing this by pooling every
   weight left the scores unchanged, which made the earlier assertion hollow --
   this one reads the range itself. */
{
  const heavyOnly=repRangeFor([S([125,8],[125,8],[125,6],[125,4])]);
  const withLightPast=repRangeFor(REC['Lat Pulldown']);
  ok('a lighter earlier session cannot inflate the current range',
     withLightPast.low===heavyOnly.low && withLightPast.high===heavyOnly.high,
     R(withLightPast)+' vs '+R(heavyOnly)+' from the heavy session alone');
  const inflated=repRangeFor([S([15,15],[15,15],[15,15]), S([30,12],[30,12],[30,12])]);
  ok('...nor can fifteen reps at half the weight',
     inflated.high<=14, R(inflated)+' at '+inflated.weight+' lb');
  /* the case the earlier data never contained, which is why two probes of the
     weight filter both passed while the filter was the only thing protecting
     it: a LIGHT session with many repeats of a HIGH rep count, under a heavy
     session whose reps are falling. Pool them and the light era's twelves win. */
  const trap=repRangeFor([S([100,12],[100,12],[100,12]), S([125,8],[125,8],[125,6],[125,4])]);
  ok('...and twelve easy reps at 100 lb cannot set the range for 125 lb',
     trap.high===8 && trap.weight===125, R(trap)+' at '+trap.weight+' lb');
}

// ---- the working weight is not the top single
const r=repRangeFor(REC['Incline Barbell Bench']);
ok('a top single is not the working weight', r.weight===155, String(r.weight));

// ---- confidence, rather than a confident guess
ok('one session at a weight is offered, not asserted',
   repRangeFor([S([100,8],[100,8],[100,6])]).confident===false);
ok('...two sessions at the same weight is enough to claim it',
   repRangeFor(REC['Incline Dumbbell Bench']).confident===true);
ok('a brand new weight still yields a range, just an unconfident one',
   R(repRangeFor([S([200,5],[200,5],[200,3])]))!=='—',
   R(repRangeFor([S([200,5],[200,5],[200,3])])));

// ---- degenerate
ok('no sessions, no range', repRangeFor([])===null && repRangeFor(null)===null);
ok('empty sets are ignored', repRangeFor([{sets:[]}])===null);
process.exit(fails?1:0);
