// Deterministic encoder completion/race tests, using the production export UI.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const source=fs.readFileSync(path.join(process.argv[2]||'.','js/plates.js'),'utf8');
const dom=new JSDOM('<div id="repOv"><img id="repImg"><button id="repDo">Share</button></div>',{runScripts:'outside-only'}),w=dom.window,c=dom.getInternalVMContext();
w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLMediaElement.prototype.load=()=>{};
let jobs=[],urls=0,revoked=0;w.URL.createObjectURL=()=>`blob:fixture-${++urls}`;w.URL.revokeObjectURL=()=>revoked++;
w._repCv={cv:{toDataURL:()=> 'data:image/png;base64,AA=='}};w.repOvEl=()=>w.document.querySelector('#repOv');w.drawPlateShare=()=>{};
vm.runInContext(source.slice(source.indexOf('let plateExportCleanup='),source.indexOf('function plateMark(')),c);
const encoder=opts=>new Promise((resolve,reject)=>jobs.push({opts,resolve,reject}));w.gif={createPlateGif:encoder};w.video={mp4Type:()=> 'video/mp4',createPlateVideo:encoder};
const run=s=>vm.runInContext(s,c),click=f=>w.document.querySelector(`[data-format="${f}"]`).click(),share=w.document.querySelector('#repDo'),status=()=>w.document.querySelector('[role="status"]').textContent;
const settle=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 run('bindPlateExport({dark:false},null,gif,video)');
 // Reproduce the old automatic keepSelection path all the way through completion.
 for(const job of jobs){job.opts.onProgress(100);job.resolve(new w.Blob(['mp4'],{type:'video/mp4'}));}await settle();
 assert(!share.disabled&&share.textContent==='Share image','Opening and completing preparation must not strand the sheet on Preparing');
 assert(jobs.length===0,'No automatic encoder competes with the selected format');
 click('mp4');assert(share.disabled&&share.textContent==='Preparing…');let job=jobs.at(-1);job.opts.onProgress(100);job.resolve(new w.Blob(['video'],{type:'video/mp4'}));await settle();
 assert(!share.disabled&&share.textContent==='Share video'&&w._repCv.videoBlob,'MP4 completion enables sharing and attaches the file');assert(!w.document.querySelector('video').hidden&&w.document.querySelector('#repImg').hidden);assert(status()==='');
 click('image');assert(!w._repCv.videoBlob&&share.textContent==='Share image');const count=jobs.length;click('mp4');assert(jobs.length===count&&!share.disabled,'Completed file is reused');
 click('gif');const old=jobs.at(-1);click('image');assert(old.opts.signal.aborted);old.resolve(new w.Blob(['gif']));await settle();assert(share.textContent==='Share image'&&!w._repCv.gifBlob,'Cancelled completion cannot replace image');
 click('gif');job=jobs.at(-1);job.reject(Error('encoder failed'));await settle();assert(!share.disabled&&share.textContent==='Share image'&&status().includes('unavailable'),'Failure recovers to a usable image');
 click('gif');const stale=jobs.at(-1);click('gif');const active=jobs.at(-1);stale.reject(Error('late error'));await settle();assert(share.disabled,'Old error cannot reset newer job');active.resolve(new w.Blob(['gif']));await settle();assert(share.textContent==='Share GIF'&&!share.disabled);
 click('image');click('gif');run('plateExportCleanup()');assert(w.document.querySelectorAll('.plate-export-options,video').length===0);assert(urls===revoked,'Closing releases preview URLs');
 run('bindPlateExport({dark:false},null,gif,video)');click('mp4');job=jobs.at(-1);job.resolve(new w.Blob([]));await settle();assert(!share.disabled&&share.textContent==='Share image'&&status().includes('unavailable'),'Empty file is not a successful export');
 click('mp4');const closing=jobs.at(-1);run('plateExportCleanup();_repCv={cv:{toDataURL:()=>"data:image/png;base64,AA=="}};bindPlateExport({dark:false},null,gif,video)');assert(closing.opts.signal.aborted);closing.resolve(new w.Blob(['old file']));await settle();assert(!share.disabled&&share.textContent==='Share image'&&!w._repCv.videoBlob,'Completion after closing cannot affect a reopened sheet');run('plateExportCleanup()');
 run('_repCv={cv:{toDataURL:()=>"data:image/png;base64,AA=="}};bindPlateExport({dark:false},null,gif,{mp4Type:()=>"",createPlateVideo:video.createPlateVideo})');assert(w.document.querySelector('[data-format="mp4"]').disabled&&!share.disabled&&share.textContent==='Share image','Unsupported MP4 keeps image usable');run('plateExportCleanup()');
 console.log('PASS export completion, selection, caching, cancellation, failure, stale tasks, cleanup and fallback');dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);dom.window.close();process.exit(1);});
