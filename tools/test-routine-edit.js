// v4.6.73: the routine page -- last time on the spine, edit in place.
// Synthetic records only. Every assertion is an EFFECT on the draft or the DOM,
// never "the markup contains a class" alone.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^?"]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let checks=0;
function test(name,code){assert(run(code),name);console.log('PASS '+name);checks++;}
const q=s=>run(`document.querySelector(${JSON.stringify(s)})`);
const click=s=>{const el=q(s);assert(el,'missing '+s);el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));};
const key=(k)=>{const el=run(`document.getElementById('peInput')`);assert(el,'no open chip');el.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true}));};

run(`DB={days:{},settings:{unit:'lb',name:'Sungjee',sex:'M',onboarded:true},plan:null,week:null,planTracking:null};todayISO='2026-09-19';checkDate=()=>false;pwState=null;lift={part:'Shoulders',ex:'Dumbbell Shoulder Press'};
const lb=x=>x*0.45359237;
DB.days['2026-09-14']={w:[{part:'Shoulders',ex:'Dumbbell Shoulder Press',w:lb(35),reps:[10,8],at:1},{part:'Shoulders',ex:'Dumbbell Shoulder Press',w:lb(55),reps:[8,8,8,8],at:2},{part:'Shoulders',ex:'Rear Deltoids',w:lb(30),reps:[10,10,10,8],at:3}],doneAll:true,upd:1};
const text="Dumbbell Shoulder Press\\n  35 lb x 10 8 (warm-up)\\n  60 lb x 8 8 8 8\\nRear Deltoids\\n  35 lb x 10 10 10 10\\nFace Pull\\n  30 lb x 12 12";
const {items}=planItemsFrom(parsePlan(text));planSave(items,'',text,todayISO);SEED=deriveAll();view='today';pwOpen(todayISO);pfNavigate('edit');`);
test('the routine page opens on the spine, no prescription text, no form card',`pfState().page==='edit'&&document.querySelectorAll('.pe-ex').length===3&&!document.querySelector('.pf-ex-preview,.pf-group-form,[data-pw="pf-edit-line"]')`);
test('every plan line is weight | x | reps',`[...document.querySelectorAll('.pe-line.pe-plan')].every(l=>l.children.length===3&&l.children[1].textContent==='×')&&document.querySelectorAll('.pe-line.pe-plan').length===4`);
test('last time sits under the plan, folded by weight, with the date after the final line',`(()=>{const ex=document.querySelector('.pe-ex[data-pw-row="0"]'),last=[...ex.querySelectorAll('.pe-line.pe-last')];return last.length===2&&last[0].querySelector('.pe-w').textContent==='35 lb'&&last[1].querySelector('.pe-w').textContent==='55 lb'&&last[1].querySelectorAll('.pe-reps i').length===4&&last[0].querySelectorAll('.pe-reps i').length===2&&!last[0].querySelector('.pe-d')&&last[1].querySelector('.pe-d').textContent==='9/14';})()`);
test('changes are blue by position, compared from the end: 60 vs 55 is blue, its reps are not, the opener matches',`(()=>{const ex=document.querySelector('.pe-ex[data-pw-row="0"]'),plan=[...ex.querySelectorAll('.pe-line.pe-plan')];return plan[1].querySelector('.pe-w').classList.contains('pe-up')&&!plan[1].querySelector('.pe-reps i.pe-up')&&!plan[0].querySelector('.pe-up');})()`);
test('a rep that changed is blue on its own',`(()=>{const ex=document.querySelector('.pe-ex[data-pw-row="1"]'),ups=[...ex.querySelectorAll('.pe-plan .pe-up')];return ups.length===2&&ups[0].classList.contains('pe-w')&&ups[1].textContent==='10'&&ex.querySelectorAll('.pe-plan .pe-reps i')[3]===ups[1];})()`);
test('an exercise with no last time shows nothing blue and no last line',`(()=>{const ex=document.querySelector('.pe-ex[data-pw-row="2"]');return !ex.querySelector('.pe-up')&&!ex.querySelector('.pe-last');})()`);
test('no warm-up mark anywhere on the page',`!/warm|\\bw\\b/i.test(document.querySelector('.pf-routine-card').textContent)`);

// ---- edit in place
click('[data-pw="pf-row-toggle"][data-index="0"]');
test('Edit opens the exercise in place: chips on the same spine, a bin per line, no pencils',`(()=>{const ex=document.querySelector('.pe-ex[data-pw-row="0"]');return ex.classList.contains('pe-open')&&ex.querySelectorAll('.pe-line.pe-edit').length===2&&ex.querySelectorAll('.pe-del').length===2&&ex.querySelectorAll('.pe-chip[data-field="r"]').length===6&&ex.querySelectorAll('.pe-chip[data-field="w"]').length===2&&!ex.querySelector('.lw-pen')&&ex.querySelector('.pe-line.pe-last')&&ex.querySelector('[data-pw="pf-remove-ex"]')&&ex.querySelector('[data-pw="pf-add-line"]');})()`);
click('[data-pw="pf-chip"][data-index="0"][data-line="1"][data-field="r"][data-rep="1"]');
test('a tapped rep becomes an input inside its own slot, holding the value',`(()=>{const i=document.getElementById('peInput');return i&&i.value==='8'&&i.closest('.pe-line.pe-edit')&&i.closest('.pe-r')&&document.querySelectorAll('.pe-chip[data-field="r"]').length===5;})()`);
run(`document.getElementById('peInput').value='9'`);key('Enter');
test('Enter commits the rep to the draft and closes the chip',`pwDay(pw().active).rows[0].lines.map(l=>l.reps.join(' ')).join('|')==='10 8|8 9 8 8'&&!document.getElementById('peInput')&&pwDay(pw().active).source==='Your draft'`);
test('the edit is one undo point',`!!pwDay(pw().active).undo&&pwDay(pw().active).undo.rows[0].lines[1].reps[1]===8`);
click('[data-pw="pf-chip"][data-index="0"][data-line="1"][data-field="w"]');
test('the weight chip opens as a number, not "60 lb"',`document.getElementById('peInput').value==='60'`);
run(`document.getElementById('peInput').value='65'`);key('Enter');
test('a weight change lands on the whole line',`pwDay(pw().active).rows[0].lines[1].w===65&&pwDay(pw().active).rows[0].lines[1].reps.join(' ')==='8 9 8 8'`);
click('[data-pw="pf-chip"][data-index="0"][data-line="1"][data-field="r"][data-rep="0"]');
run(`document.getElementById('peInput').value='12'`);key('Escape');
test('Escape discards',`pwDay(pw().active).rows[0].lines[1].reps[0]===8&&!document.getElementById('peInput')`);
click('[data-pw="pf-chip"][data-index="0"][data-line="1"][data-field="r"][data-rep="0"]');
run(`document.getElementById('peInput').value='0'`);key('Enter');
test('a rep of 0 is refused, the line keeps its set',`pwDay(pw().active).rows[0].lines[1].reps.join(' ')==='8 9 8 8'`);
click('[data-pw="pf-add-rep"][data-index="0"][data-line="1"]');
test('the plus chip adds a set copying the last rep',`pwDay(pw().active).rows[0].lines[1].reps.join(' ')==='8 9 8 8 8'`);

// ---- lines: delete with the bin, add with Add a line
click('[data-pw="pf-del-line"][data-index="0"][data-line="0"]');
test('the bin deletes the whole line and leaves an Undo strip where it was',`(()=>{const b=pwDay(pw().active),ex=document.querySelector('.pe-ex[data-pw-row="0"]'),strip=ex.querySelector('.pe-removed');return b.rows[0].lines.length===1&&b.rows[0].lines[0].w===65&&strip&&/Removed/.test(strip.textContent)&&/35 lb × 10 8/.test(strip.textContent)&&strip.querySelector('[data-pw="undo"]')&&ex.querySelector('.pe-lines').firstElementChild===strip&&!document.querySelector('.pf-routine-page > [data-pw="undo"], .pw-text[data-pw="undo"]');})()`);
click('.pe-removed [data-pw="undo"]');
test('Undo restores the line and the strip goes',`pwDay(pw().active).rows[0].lines.length===2&&pwDay(pw().active).rows[0].lines[0].reps.join(' ')==='10 8'&&!document.querySelector('.pe-removed')`);
click('[data-pw="pf-add-line"][data-index="0"]');
test('Add a line opens a weight chip prefilled with the previous line, on a new line',`(()=>{const i=document.getElementById('peInput');return i&&i.value==='65'&&pwDay(pw().active).rows[0].lines.length===3&&document.querySelectorAll('.pe-ex[data-pw-row="0"] .pe-line.pe-edit').length===3;})()`);
key('Escape');
test('leaving the new line untouched removes it again',`pwDay(pw().active).rows[0].lines.length===2&&document.querySelectorAll('.pe-ex[data-pw-row="0"] .pe-line.pe-edit').length===2`);
click('[data-pw="pf-add-line"][data-index="0"]');run(`document.getElementById('peInput').value='45'`);key('Enter');
test('typing a weight keeps the new line, with one set copied from the line above',`(()=>{const l=pwDay(pw().active).rows[0].lines;return l.length===3&&l[2].w===45&&l[2].reps.join(' ')==='8'&&l[2].unit==='lb'&&!l[2].qual;})()`);

// ---- remove the exercise, in place undo
click('[data-pw="pf-row-toggle"][data-index="2"]');
click('[data-pw="pf-remove-ex"][data-index="2"]');
test('Remove exercise takes the row out and leaves an Undo strip in its place',`(()=>{const b=pwDay(pw().active),ex=document.querySelectorAll('.pe-ex'),strip=document.querySelector('.pw-exercises > .pe-removed');return b.rows.length===2&&ex.length===2&&strip&&/Face Pull/.test(strip.textContent)&&strip.previousElementSibling===ex[1];})()`);
click('.pe-removed [data-pw="undo"]');
test('Undo brings the exercise back where it was',`pwDay(pw().active).rows.length===3&&pwDay(pw().active).rows[2].ex==='Face Pull'&&!document.querySelector('.pe-removed')`);
click('[data-pw="pf-row-toggle"][data-index="0"]');
test('Done closes the exercise back to the spine, with the edits shown in blue',`(()=>{const ex=document.querySelector('.pe-ex[data-pw-row="0"]');return !ex.classList.contains('pe-open')&&ex.querySelectorAll('.pe-line.pe-plan').length===3&&ex.querySelectorAll('.pe-plan .pe-w')[1].textContent==='65 lb'&&!ex.querySelector('.pe-chip');})()`);

// ---- save carries the edits into the plan; the strip never outlives a save
run(`pfHandle('pf-row-toggle',{dataset:{index:'2'}});pfHandle('pf-remove-ex',{dataset:{index:'2'}});pfSave();`);
test('saving writes the edited routine and drops the strip with the undo',`(()=>{const doc=DB.week?.days?.[todayISO]||DB.plan;const b=pwDay(todayISO);return doc&&doc.items.length===2&&Math.round(doc.items[0].lines[1].w/0.45359237)===65&&doc.items[0].lines[1].reps.join(' ')==='8 9 8 8 8'&&doc.items[0].lines.length===3&&!b.strip&&!b.undo;})()`);

// ---- the bin means delete, everywhere; the cross still dismisses
run(`DB.days[todayISO]={w:[{part:'Shoulders',ex:'Rear Deltoids',w:13.6,reps:[10],at:1}],upd:1};lift.plan=null;view='lift';lift.part='Shoulders';lift.ex='Rear Deltoids';lift.editToday=true;render();`);
test('Edit Logged deletes with the bin',`document.querySelector('[data-lw-del] .ic-trash')&&!document.querySelector('[data-lw-del] .ic-clear')`);
run(`lift.editToday=false;view='history';hist.y=2026;hist.m=9;hist.edit='2026-09-14';render();`);
test('History set tiles delete with the bin',`document.querySelector('[data-hdel] .ic-trash')&&!document.querySelector('[data-hdel]')?.textContent.includes('✕')`);
test('the icon set has a measured bin',`typeof ICON_INK==='object'&&Array.isArray(ICON_INK.trash)&&/ic-trash/.test(icon('trash',ICON_SZ.sm))`);
console.log(`${checks} checks passed`);process.exit(0);
