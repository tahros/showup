/* test-exid.js — canonical exercise ids, resolve only.
 * "Barbell Bench Press", "Bench Press (Barbell)" and "bb bench press" are one
 * movement and the app treats them as three: history splits, `usual` looks
 * thinner than it is, and coverage counts the same work twice under two names.
 * The rule under test is NEVER GUESS: a wrong merge is unrecoverable, an
 * unresolved name costs nothing.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const {exidBuild,exidResolve,exidKey}=require(path.resolve(dir,'js/exid.js'));
/* the catalog the app actually ships, read through its own source */
const dom=new JSDOM('<html></html>',{runScripts:'outside-only'});
vm.runInContext(fs.readFileSync(path.join(dir,'js/core.js'),'utf8').split('\n').slice(0,12).join('\n'),dom.getInternalVMContext());
const cat=vm.runInContext('SEED0.catalog',dom.getInternalVMContext());
const names=Object.values(cat).flat();
const byKey=exidBuild(names);
const to=n=>{const r=exidResolve(n,byKey);return r?r.canonical:null;};

ok('the shipped catalog is already clean — nothing merges into anything',
   byKey.size===names.length, byKey.size+' ids for '+names.length+' names');

// ---- the same movement, typed differently
const same=[
 ['Barbell Bench Press','Barbell Bench Press','itself'],
 ['bench press (barbell)','Barbell Bench Press','punctuation and order'],
 ['BARBELL BENCH PRESS','Barbell Bench Press','shouting'],
 ['barbell  bench   press','Barbell Bench Press','loose spacing'],
 ['Bench Press Barbell','Barbell Bench Press','word order'],
 ['bb bench press','Barbell Bench Press','abbreviation'],
 ['incline bb bench press','Incline Barbell Bench Press','abbreviation, qualified'],
 ['rdl','Romanian Deadlift','initials'],
 ['Romanian  Dead-lift','Romanian Deadlift','split compound'],
 ['lat pull down','Lat Pulldown','joined compound'],
 ['db lunge','Dumbbell Lunge','abbreviation'],
 ['squats','Squat','plural'],
 ['dips','Dip','plural'],
 ['standing calf raises','Standing Calf Raise','plural'],
 ['cable flyes up','Cable Fly Up','irregular plural'],
 ['skullcrusher','Skull Crusher','run-together'],
 ['pull-up','Pull Up','hyphen'],
];
for(const [input,want,why] of same) ok(`${why}: "${input}"`, to(input)===want, to(input)||'(unresolved)');

// ---- and the refusals, which matter more
ok('a name the catalog does not hold stays unresolved, never guessed',
   to('Triceps Extension')===null, to('Triceps Extension')||'(unresolved)');
ok('...even though two near-neighbours exist',
   names.includes('Overhead Triceps Extension')&&names.includes('Overhead Cable Extension'));
ok('a qualifier is not discarded to force a match',
   to('Incline Barbell Bench Press')!==to('Barbell Bench Press'));
ok('...and neither is a different implement',
   to('Incline Dumbbell Bench Press')!==to('Incline Barbell Bench Press'));
ok('nonsense resolves to nothing', to('asdf qwerty')===null, String(to('asdf qwerty')));
ok('an empty name resolves to nothing', to('')===null&&to(null)===null);
ok('a plural is only undone when the singular is a word the app knows',
   exidKey('press')===exidKey('presses') && exidKey('gas')!==exidKey('ga'));

// ---- and it changes nothing yet
const files=fs.readdirSync(path.join(dir,'js')).filter(f=>f!=='exid.js');
const used=files.filter(f=>/exidResolve|exidBuild/.test(fs.readFileSync(path.join(dir,'js',f),'utf8')));
ok('nothing reads it yet — the record is untouched until the merges are agreed',
   used.length===0, used.join(', ')||'(no callers)');
process.exit(fails?1:0);
