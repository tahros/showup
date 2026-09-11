/* Generates transparent assets FROM the approved renderer; never edits a screenshot.
   Run against an isolated local server: NODE_PATH=<playwright install> node tools/render-mascot-assets.cjs URL */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe',args:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:720,height:440},deviceScaleFactor:1,serviceWorkers:'block'});
 await page.goto(process.argv[2]||'http://127.0.0.1:8768');
 await page.evaluate(()=>{document.body.innerHTML='<div id="asset" style="width:720px;height:440px"></div>';});
 for(const [tone,theme] of [['charcoal','light'],['white','dark']]){
   const png=await page.evaluate(async theme=>{
     const {createMascot}=await import('./js/mascot-renderer.js');
     const m=createMascot(document.querySelector('#asset'),{theme,mode:'still',still:true});
     const png=m.capture();m.dispose();return png;
   },theme);
   const filename=path.join(__dirname,'../assets/mascot-'+tone+'.png');
   fs.writeFileSync(filename,Buffer.from(png.split(',')[1],'base64'));
   // Square identity is a tight transparent crop, keeping every plate and the bottom shadow.
   const mark=await page.evaluate(async png=>{
      const im=new Image();im.src=png;await im.decode();
      const c=document.createElement('canvas');c.width=c.height=512;
      c.getContext('2d').drawImage(im,152,69,416,346,0,43,512,426);
      return c.toDataURL();
   },png);
   fs.writeFileSync(path.join(__dirname,'../assets/mascot-mark-'+tone+'.png'),Buffer.from(mark.split(',')[1],'base64'));
   if(tone==='charcoal'){
     // Browser mark only. Platform-masked installation tiles are a separate asset.
     for(const [name,size,inset] of [['favicon-32.png',32,0]]){
       const icon=await page.evaluate(async ({mark,size,inset})=>{
         const im=new Image();im.src=mark;await im.decode();
         const c=document.createElement('canvas');c.width=c.height=size;
         c.getContext('2d').drawImage(im,inset,inset,size-inset*2,size-inset*2);
         return c.toDataURL();
       },{mark,size,inset});
       fs.writeFileSync(path.join(__dirname,'..',name),Buffer.from(icon.split(',')[1],'base64'));
     }
   }
 }
 await browser.close();
 console.log('Generated four transparent mascot PNG assets.');
})().catch(e=>{console.error(e);process.exit(1);});
