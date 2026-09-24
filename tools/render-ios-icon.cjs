/* render-ios-icon.cjs URL — the App Store icon, from the approved renderer (v4.6.119).
   Apple wants one 1024x1024 PNG: opaque, NO alpha channel, square corners (iOS
   applies its own mask). The only existing mark is 512px, and scaling it up
   would blur, so this re-renders the same approved mascot (tone white, dark
   theme -- exactly what assets/mascot-mark-white.png was cut from) on a stage
   four times larger, crops the same region, and composes the approved "C"
   layout: white mascot at 82% on ShowUp Blue #3049dc (MASCOT.md, v4.1.7).
   Also writes the iOS 18 dark-appearance variant on #10131B, the approved dark
   tile colour. Writes RGBA; tools/ios-icon-finish.py flattens to RGB.
   NODE_PATH=<playwright> CHROMIUM_PATH=<chrome> node tools/render-ios-icon.cjs http://127.0.0.1:PORT */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:880},deviceScaleFactor:2,serviceWorkers:'block'});
  await page.goto(process.argv[2]||'http://127.0.0.1:8784/index.html');
  await page.evaluate(()=>{document.body.innerHTML='<div id="asset" style="width:1440px;height:880px"></div>';});
  const out=await page.evaluate(async()=>{
    const {createMascot}=await import('./js/mascot-renderer.js');
    const m=createMascot(document.querySelector('#asset'),{theme:'dark',tone:'white',mode:'still',still:true});
    const png=m.capture();m.dispose();
    const im=new Image();im.src=png;await im.decode();
    const k=im.width/720;                                  // same crop as the 512 mark, in this stage's pixels
    const mark=document.createElement('canvas');mark.width=mark.height=2048;
    mark.getContext('2d').drawImage(im,152*k,69*k,416*k,346*k,0,172,2048,1704);
    /* v4.6.119: CENTRE THE DUMBBELL, NOT THE CROP. The 512 mark's crop box is
       not balanced -- more empty space below the mascot than above -- so
       placing the box at the centre put the mascot ~39px high (the maker saw
       it). Measure the body itself (opaque pixels; the faint contact shadow
       is left to hang below) and move it so its centre is the tile's centre.
       Scale is unchanged: the mark still spans 82% of the width. */
    const a=mark.getContext('2d').getImageData(0,0,2048,2048).data;
    let top=2048,bot=-1,left=2048,right=-1;
    for(let y=0;y<2048;y++)for(let x=0;x<2048;x++)if(a[(y*2048+x)*4+3]>200){if(y<top)top=y;if(y>bot)bot=y;if(x<left)left=x;if(x>right)right=x;}
    const s=1024*.82,k2=s/2048;
    const ox=512-((left+right)/2)*k2, oy=512-((top+bot)/2)*k2;
    const tile=(bg)=>{const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d');
      x.fillStyle=bg;x.fillRect(0,0,1024,1024);x.imageSmoothingQuality='high';x.drawImage(mark,ox,oy,s,s);return c.toDataURL('image/png');};
    return {w:im.width,body:[left,top,right,bot],any:tile('#3049dc'),dark:tile('#10131B')};
  });
  console.log('renderer canvas width:',out.w,'body box in mark:',out.body.join(','));
  for(const [k,f] of [['any','AppIcon-1024.png'],['dark','AppIcon-1024-dark.png']])
    fs.writeFileSync(path.join(__dirname,'../assets/ios',f),Buffer.from(out[k].split(',')[1],'base64'));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
