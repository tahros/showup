// v4.6.210: the planner's routine text puts sets at one load on one line; the newer-plan buttons have a gap.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../js/planner-flow.js','utf8'),m=/function pfOneLine[\s\S]*?\n/.exec(src);assert(m,'pfOneLine exists');
const c={};vm.runInNewContext(m[0]+';this.f=pfOneLine',c);let n=0;const t=(name,got,want)=>{assert.deepStrictEqual([...got],want,name);console.log('PASS '+name);n++;};
t('same load on three lines becomes one',c.f(['35 lb × 14 14','35 lb × 14','35 lb × 14']),['35 lb × 14 14 14 14']);
t('the warm-up keeps its own line; the working sets join',c.f(['BW +35 lb × 8 (warm-up)','BW +35 lb × 8 8','BW +35 lb × 8','BW +35 lb × 8']),['BW +35 lb × 8 (warm-up)','BW +35 lb × 8 8 8 8']);
t('a different load starts a new line',c.f(['95 lb × 10 (warm-up)','135 lb × 8','135 lb × 8','145 lb × 6']),['95 lb × 10 (warm-up)','135 lb × 8 8','145 lb × 6']);
t('by feel joins too, and different reps stay in order',c.f(['by feel × 15','by feel × 15','by feel × 12']),['by feel × 15 15 12']);
t('a line that is not sets is left alone',c.f(['Run — 1.99 mi · 20 min','','60 lb × 8']),['Run — 1.99 mi · 20 min','','60 lb × 8']);
assert(/class="pf-conflict-actions">\$\{pwButton\('load-newer'/.test(src));assert(/\.pf-conflict-actions\{display:flex;flex-wrap:wrap;gap:10px/.test(fs.readFileSync(__dirname+'/../css/planner-flow.css','utf8')));console.log('PASS the newer-plan buttons sit in a row with a gap');n++;
console.log(n+' checks');process.exit(0);
