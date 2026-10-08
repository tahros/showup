// Approved receipt fixture + dynamic export geometry. Synthetic data only.
const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME});try{
 const p=await b.newPage({serviceWorkers:'block'}),origin='http://127.0.0.1:'+(process.env.PW_PORT||8858)+'/';
 await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await p.goto(origin);await p.waitForTimeout(1500);
 const result=await p.evaluate(async()=>{
  await (await import('./js/plate-gif.js')).loadExportFonts();await document.fonts.load('600 19px "IBM Plex Mono"');
  const wordmark=new Image(),pip=new Image();wordmark.src='assets/showuppp-wordmark-dark.svg';pip.src='assets/mascot-white.png';await Promise.all([wordmark.decode(),pip.decode()]);
  const crop=document.createElement('canvas');crop.width=pip.width;crop.height=pip.height;const tx=crop.getContext('2d');tx.drawImage(pip,0,0);const a=tx.getImageData(0,0,pip.width,pip.height).data;let x0=pip.width,y0=pip.height,x1=0,y1=0;
  for(let y=0;y<pip.height;y++)for(let x=0;x<pip.width;x++)if(a[(y*pip.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  const g=(load,reps,gain=-1,cardio=false)=>({load,chips:reps.map((label,i)=>({label:String(label),gain:i===gain})),sets:[{cardio}],qualifier:''});
  const row=(ex,refs,actual,note='')=>({ex,actual:actual.length?[{}]:[],note,delta:['+1 reps'],lanes:refs.map((ref,i)=>({ref,actual:actual[i]||null}))});
  const data={dark:true,title:'Wed, Oct 7',firstName:'Sungjee',dayCount:980,unit:'lb',planned:true,parts:['Run','Back'],context:{location:'Princeton, NJ',weather:'66°F · Clear',temperature:'66°F',icon:'sun'},wordmark,pip,pipBounds:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1},values:['68','10','3','3.3'],labels:['minutes','sets','exercises','miles run'],rows:[
   row('Deadlift',[g('135',[8]),g('235',[3,3,3,3])],[g('135',[8]),g('235',[4,3,3,3],0)]),row('Bent-Over Row',[g('155',[12,12,12,12])],[g('155',[12,12,12,12])]),row('Pull Up',[g('BW + 25',[6,6,6,6])],[]),row('Single-Arm Dumbbell Row',[g('60',[8,8,8,8])],[]),row('EZ Bar Curl',[g('65',[14,14,14])],[]),row('Run',[null],[g('3.3 mi',['33:00'],-1,true)],'Added today')
  ]};
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d'),calls=[],fills=[];const ft=ctx.fillText.bind(ctx),rr=ctx.roundRect.bind(ctx);
  ctx.fillText=(s,x,y)=>{const m=ctx.measureText(s),left=x-(ctx.textAlign==='center'?m.width/2:ctx.textAlign==='right'?m.width:0);calls.push({s,x,y,left,right:left+m.width,alpha:ctx.globalAlpha,color:ctx.fillStyle});ft(s,x,y);};
  ctx.roundRect=(...args)=>{fills.push({color:ctx.fillStyle,args});rr(...args);};
  drawDayReview(data,undefined,cv);const still=cv.toDataURL(),snapshot=calls.slice(),initialFills=fills.slice();drawDayReview(data,10000,cv);const match=still===cv.toDataURL();
  const baseHeight=cv.height;data.rows[0].ex='VeryLongExerciseNameWithoutAnySpacesThatMustWrapSafely';data.context.location='A very long location that must wrap without touching the date';data.rows[0].lanes[1].actual=g('235',Array.from({length:60},()=>12));
  calls.length=0;drawDayReview(data,undefined,cv);const long=cv.toDataURL(),grown=cv.height>baseHeight;drawDayReview(data,10000,cv);const longMatch=long===cv.toDataURL();
  const fits=calls.every(c=>c.left>=27&&c.right<=533&&c.y*1080/560<cv.height-20);
  data.rows=[];data.context=null;data.parts=[];drawDayReview(data,undefined,cv);const emptyOk=cv.height>0;
  return {still,match,longMatch,grown,fits,emptyOk,snapshot,fills:initialFills};
 });
 assert(result.match&&result.longMatch,'video final frame equals still');assert(result.grown&&result.fits&&result.emptyOk,'dynamic layout');
 assert.equal(result.fills.length,1);assert(result.fills.every(f=>f.color==='#526fe0'),'only improvement gets chip');
 assert(!result.snapshot.some(c=>c.s.includes('+1 reps')));assert(result.snapshot.some(c=>c.s==='235'&&c.color==='#f4f3f0'));
 const weights=result.snapshot.filter(c=>c.s==='235');assert.equal(weights[0].y,weights[1].y);
 const totals=result.snapshot.filter(c=>['minutes','sets','exercises','miles run'].includes(c.s));assert.deepEqual(totals.map(c=>c.x),[91,217,343,469]);
 fs.mkdirSync(process.env.QA_DIR||'../receipt-release-qa',{recursive:true});fs.writeFileSync((process.env.QA_DIR||'../receipt-release-qa')+'/receipt-approved-dark.png',Buffer.from(result.still.split(',')[1],'base64'));
 console.log('PASS receipt: approved fixture, neutral values, one gain chip, paired alignment, equal totals, long content, empty day, still/video equality');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
