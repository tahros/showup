/* ---- CANONICAL EXERCISE IDS ---------------------------------------------
   One exercise, one id, whatever it was typed as. "Barbell Bench Press",
   "Bench Press (Barbell)" and "bb bench" are the same movement, and today the
   app treats them as three: history splits, `usual` looks thinner than it is,
   and per-muscle coverage counts the same work under different names.
   This file RESOLVES ONLY. It writes nothing, migrates nothing and is not yet
   read by anything else -- the record is untouched until the merges below have
   been looked at and agreed.
   The rule throughout: NEVER GUESS. A name that does not resolve confidently
   comes back null and keeps its text. A wrong merge is unrecoverable; an
   unresolved name costs nothing. */

/* Words that describe the same thing in different clothes. Expanded BEFORE
   matching, so "bb"/"barbell" and "db"/"dumbbell" meet in the middle. */
const EXID_SYN={
  bb:'barbell', db:'dumbbell', kb:'kettlebell', bw:'bodyweight',
  ohp:'overhead press', rdl:'romanian deadlift', dl:'deadlift',
  sldl:'stiff leg deadlift', bp:'bench press', pulldown:'pull down',
  pullup:'pull up', chinup:'chin up', pushup:'push up', situp:'sit up',
  legpress:'leg press', tricep:'triceps', bicep:'biceps',
  machines:'machine', presses:'press', raises:'raise', rows:'row',
  curls:'curl', flyes:'fly', flies:'fly', extensions:'extension',
  'lat pulldown':'lat pulldown'
};
/* Noise that never distinguishes two movements */
const EXID_DROP=new Set(['the','a','an','with','on','using','exercise','machine,']);

function exidNorm(name){
  let s=String(name||'').toLowerCase();
  s=s.replace(/[()\[\]{}.,;:!?"'`]/g,' ').replace(/[-_/\\]/g,' ');
  s=s.replace(/\s+/g,' ').trim();
  for(const [k,v] of Object.entries(EXID_SYN)) s=s.replace(new RegExp('\\b'+k+'\\b','g'),v);
  const words=s.split(' ').filter(w=>w&&!EXID_DROP.has(w));
  /* word ORDER is not meaning: "Bench Press Barbell" is "Barbell Bench Press".
     Sorting is what lets the two meet without a rule per pair. */
  return words.sort().join(' ');
}
/* The vocabulary is the catalog's own words. Guessing at English is how a
   resolver merges two real exercises; checking against words the app actually
   uses cannot invent a match that does not exist. */
let EXID_VOCAB=new Set();
function exidVocab(names){
  EXID_VOCAB=new Set();
  for(const n of names) for(const w of exidNorm(n).split(' ')) if(w) EXID_VOCAB.add(w);
  return EXID_VOCAB;
}
function exidFix(words){
  const out=[];
  for(let w of words){
    if(EXID_VOCAB.has(w)){ out.push(w); continue; }
    /* a plural only if the singular is a word the app knows: "squats" ->
       "squat" because squat exists; "press" is left alone because "pres" is
       not a word here */
    if(w.endsWith('es')&&EXID_VOCAB.has(w.slice(0,-2))){ out.push(w.slice(0,-2)); continue; }
    if(w.endsWith('s')&&EXID_VOCAB.has(w.slice(0,-1))){ out.push(w.slice(0,-1)); continue; }
    /* a run-together compound only if BOTH halves are known: "skullcrusher"
       splits, a typo does not */
    let split=null;
    for(let i=3;i<=w.length-3;i++){
      const a=w.slice(0,i), b=w.slice(i);
      if(EXID_VOCAB.has(a)&&EXID_VOCAB.has(b)){ split=[a,b]; break; }
    }
    if(split){ out.push(...split); continue; }
    out.push(w);
  }
  return out;
}
function exidKey(name){
  let s=String(name||'').toLowerCase()
    .replace(/[()\[\]{}.,;:!?"'`]/g,' ').replace(/[-_/\\]/g,' ')
    .replace(/\s+/g,' ').trim();
  for(const [k,v] of Object.entries(EXID_SYN)) s=s.replace(new RegExp('\\b'+k+'\\b','g'),v);
  /* joined forms the catalog spells as one word */
  s=s.replace(/\bdead lift\b/g,'deadlift').replace(/\bpull down\b/g,'pulldown');
  let words=s.split(' ').filter(w=>w&&!EXID_DROP.has(w));
  if(EXID_VOCAB.size) words=exidFix(words);
  return words.sort().join(' ');
}

/* built from the catalog the app already ships, plus any name in the record */
function exidBuild(names){
  exidVocab(names);                       // the vocabulary first, then the keys
  const byKey=new Map();
  for(const n of names){
    const k=exidKey(n); if(!k) continue;
    if(!byKey.has(k)) byKey.set(k,{id:k,canonical:n,aliases:new Set([n])});
    else { const e=byKey.get(k); e.aliases.add(n);
      /* the longest spelling wins as canonical: it is the most explicit, and
         "Incline Barbell Bench Press" reads better than "incline bb bench" */
      if(n.length>e.canonical.length) e.canonical=n; }
  }
  return byKey;
}
function exidResolve(name,byKey){
  const k=exidKey(name); const hit=byKey.get(k);
  return hit?{id:hit.id,canonical:hit.canonical,exact:true}:null;
}
if(typeof module!=='undefined') module.exports={exidNorm,exidKey,exidBuild,exidResolve,exidVocab,EXID_SYN};
