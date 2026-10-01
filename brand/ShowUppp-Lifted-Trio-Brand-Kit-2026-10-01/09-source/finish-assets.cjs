const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require('C:/Users/sungj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const {trace}=require('./.brandkit-tools/node_modules/potrace');
const PDFDocument=require('./.brandkit-tools/node_modules/pdfkit');
const SVGtoPDF=require('./.brandkit-tools/node_modules/svg-to-pdfkit');
const out=path.join(__dirname,'ShowUppp-Lifted-Trio-Brand-Kit-2026-10-01');
const put=(p,s)=>{p=path.join(out,p);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
const source=fs.readFileSync(path.join(out,'09-source/approved-lifted-trio.svg'),'utf8');
const letters=source.slice(source.indexOf('<g'),source.lastIndexOf('</svg>'));
const svg=(w,h,s)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
const word=(x,y,w,c)=>`<g transform="translate(${x} ${y}) scale(${w/350})">${letters.replaceAll('currentColor',c)}</g>`;
(async()=>{
 const {data,info}=await sharp(path.join(out,'03-mascot/transparent/mascot-charcoal-4096.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});const mask=Buffer.alloc(info.width*info.height);
 // Small-use one-ink derivative: preserve face knockouts, suppress the two
 // perspective-occluded hairline seams rather than printing broken slivers.
 for(let i=0;i<mask.length;i++){const k=i*4,x=i%info.width;const face=x>info.width*.36&&x<info.width*.64;mask[i]=data[k+3]>127&&(!face||data[k]<180)?0:255;}
 const binary=await sharp(mask,{raw:{width:info.width,height:info.height,channels:1}}).png().toBuffer();
 const traced=await new Promise((resolve,reject)=>trace(binary,{color:'#000000',threshold:128,turdSize:0,alphaMax:1,optTolerance:.12},(e,s)=>e?reject(e):resolve(s)));
 const shape=traced.match(/<path[^>]*d="([^"]+)"/)[1];
 const flat=(x,y,w,c)=>`<g transform="translate(${x} ${y}) scale(${w/info.width})"><path fill="${c}" fill-rule="evenodd" d="${shape}"/></g>`;
 for(const [name,c] of Object.entries({black:'#000000',white:'#FFFFFF',blue:'#3049DC',charcoal:'#2C2C2C'})){
  const mark=svg(info.width,info.height,flat(0,0,info.width,c));put(`03-mascot/flat-vector/mascot-${name}.svg`,mark);
  put(`03-mascot/flat-vector/mascot-${name}-4096.png`,await sharp(Buffer.from(mark)).png().withMetadata({density:300}).toBuffer());
  for(const layout of ['horizontal','vertical']){
   const h=96.6*info.height/info.width;
   const code=layout==='horizontal'?svg(235.04,90,flat(12,12+(66.577-h)/2,96.6,c)+word(122.6,12,100.44,c)):svg(180,210,flat(35,12,110,c)+word(24,12+110*info.height/info.width+18,132,c));
   put(`02-lockups/one-color/${name}-${layout}.svg`,code);
   put(`02-lockups/one-color/${name}-${layout}-4096.png`,await sharp(Buffer.from(code)).resize({width:4096}).png().withMetadata({density:300}).toBuffer());
  }
  // Genuine one-color SVG for browser icons / decals / one-ink printing.
  put(`04-web/favicon-${name}.svg`,svg(100,100,flat(10,50-40*info.height/info.width,80,c)));
 }
 // Print master collection. Lettering and flat marks remain actual PDF paths.
 const pdf=new PDFDocument({autoFirstPage:false,compress:true,info:{Title:'ShowUppp - Lifted p trio - Print Masters',Author:'ShowUppp',Subject:'Approved outlined lettering; original mascot; RGB artwork'}});
 const dest=path.join(out,'07-print/ShowUppp-Print-Masters.pdf');fs.mkdirSync(path.dirname(dest),{recursive:true});const stream=fs.createWriteStream(dest);pdf.pipe(stream);
 const pages=[
  ['Pure vector wordmark / charcoal','01-wordmark/showuppp-lifted-charcoal.svg','#FFFFFF'],
  ['Pure vector wordmark / blue','01-wordmark/showuppp-lifted-blue.svg','#FFFFFF'],
  ['Reversed pure vector wordmark','01-wordmark/showuppp-lifted-white.svg','#3049DC'],
  ['Primary lockup / light','02-lockups/light/showuppp-horizontal.svg','#FFFFFF'],
  ['Primary lockup / dark','02-lockups/dark/showuppp-horizontal.svg','#191B24'],
  ['Primary lockup / blue','02-lockups/blue/showuppp-horizontal.svg','#3049DC'],
  ['Primary lockup / charcoal','02-lockups/charcoal/showuppp-horizontal.svg','#F6F3EC'],
  ['Vertical lockup / light','02-lockups/light/showuppp-vertical.svg','#FFFFFF'],
  ['Pure vector one-ink lockup','02-lockups/one-color/black-horizontal.svg','#FFFFFF'],
  ['Pure vector reversed lockup','02-lockups/one-color/white-horizontal.svg','#000000'],
  ['Pure vector mascot','03-mascot/flat-vector/mascot-black.svg','#FFFFFF']
 ];
 for(const [label,file,bg] of pages){pdf.addPage({size:[842,595],margin:0});pdf.rect(0,0,842,595).fill(bg);const code=fs.readFileSync(path.join(out,file),'utf8');SVGtoPDF(pdf,code,60,65,{width:722,height:465,preserveAspectRatio:'xMidYMid meet',assumePt:true});pdf.fillColor(bg==='#FFFFFF'||bg==='#F6F3EC'?'#777777':'#CCCCCC').fontSize(9).text(label+' | RGB master - printer converts to target profile',30,568);}
 pdf.end();await new Promise((resolve,reject)=>{stream.on('finish',resolve);stream.on('error',reject);});
 put('09-source/package.json',JSON.stringify({private:true,scripts:{build:'node build-static-assets.cjs'},dependencies:{sharp:'^0.34.0',potrace:'^2.1.8',pdfkit:'^0.17.0','svg-to-pdfkit':'^0.1.8'}},null,2));
 put('00-START-HERE.txt',`SHOWUPPP / LIFTED P TRIO BRAND KIT
2026-10-01

THE DEFAULT
Use 02-lockups/light/showuppp-horizontal.svg on light backgrounds.
For simple drag-and-drop use its -4096.png transparent companion.
Use dark or blue folders on those backgrounds. The dark/blue transparent
lockups are deliberately white lettering + white mascot; their background
is not baked in. Preview files show the intended background.

01-wordmark       Exact approved outlined lettering, SVG + 1024/2048/4096 PNG.
02-lockups        Mascot + lettering, horizontal and vertical. Four 3D themes.
                  one-color/ contains fully vector flat lockups, four colors.
03-mascot         Body-only transparent, grounded stills, and flat-vector versions.
04-web            Optimized WebP lockups, favicon SVG/ICO/PNG, 180/192/512 icons.
05-app-store      1024 square PNG, 512 Play icon, 1024x500 feature graphic,
                  separate foreground/background artwork layers.
06-social         Avatar 1080; square 1080; portrait 1080x1350;
                  story 1080x1920; link preview 1200x630; wide 1500x500.
07-print          Multi-page PDF: vector wordmarks, mixed-media 3D lockups,
                  and fully vector one-color versions.
08-motion         Open light.html, dark.html, blue.html or charcoal.html.
                  Click Replay. Original approved one-shot choreography.
                  No workout data, no network requests, no autoplay loop.
09-source         Approved lettering, original Three.js model, native renders,
                  crop coordinates and production scripts.

QUALITY / IMPORTANT DISTINCTIONS
The wordmark is real vector outlines. No font installation is required.
The flat mascot is a vector trace of the approved renderer's resting silhouette,
with transparent face knockouts and no fine structural seams. It is a one-ink production derivative,
not a replacement 3D model. Inspect a physical proof for very small embroidery.
The 3D mascot was freshly rendered at 8192x5006 pixels, then cropped to a
4432x2657 body and downsampled for delivery. No old small PNG was enlarged.
3D lockup SVGs embed this high-resolution PNG; their lettering remains vector.
Do not describe the 3D portion as resolution-independent vector artwork.
4096px at 300ppi supports approximately 13.65 inches / 34.68cm of width.
For substantially larger close-view print, rerender the supplied 3D source.
Flat vector artwork can scale without pixel-resolution limits.

PRIMARY PROPORTIONS
App-approved columns: mascot 96.6 units, gap 14, wordmark 100.44.
Outer artboard padding is additional. Do not stretch letters or flatten the p trio.
The exact eight letter contours and p offsets are copied from the approved asset.
Primary is mascot at left + stacked Show/Uppp. Vertical is a secondary layout.
Use mascot-only icons at small sizes; never squeeze the full logo into a favicon.
Recommended starting minima: lockup 212px wide, wordmark 100px, mascot 48px.
16px favicons cannot retain all facial/structural detail; this is expected.
Keep at least one capital-stroke width of clear space from unrelated content.

COLOR
Brand blue #3049DC (48,73,220)
Soft charcoal #2C2C2C (44,44,44)
White #FFFFFF; dark surface #191B24; warm paper #F6F3EC.
All supplied files are RGB/sRGB intent. PDF is not CMYK/PDF-X certified.
Your print vendor must convert to their press/paper ICC profile and proof blue.
For one-ink printing, vinyl cutting, or embroidery choose one-color SVGs.
No chrome mascot is included in the delivered artwork.

SHADOW / MOTION
Body-only renders contain no baked floor shadow. Use one separate ground shadow
when animating them. Grounded PNGs already contain the physical floor shadow:
do not add another. The animated lockup uses body-only + one animated ground.
Motion files preserve the approved letter and mascot motion, return to the
Lifted p trio rest pose, and respect prefers-reduced-motion. Replay is optional.
These are browser HTML/JS assets, not GIF/MP4 files. All static fallbacks are included.

PLATFORM NOTES
Store icons are full square canvases, no pre-rounded corners. PNG1024 is opaque.
512 Play icons are under 1MB. Foreground/background layers are source artwork,
not a finished Apple Icon Composer file or Android adaptive-icon XML package.
Preview under each platform's masks before submission; no store upload was made.
Social artwork is logo-only; no invented product claims, URL, or QR code.

Official sizing references checked 2026-10-01:
https://developer.apple.com/design/human-interface-guidelines/app-icons/
https://developer.apple.com/documentation/xcode/configuring-your-app-icon
https://support.google.com/googleplay/android-developer/answer/9866151?hl=en
https://developer.android.com/distribute/google-play/resources/icon-design-specifications

SOURCE / REBUILD
The model is procedural Three.js source, not a BLEND/GLB export. Vendor license
is included. Source files may contain earlier material options; no chrome output
is part of this package. The export override changes only pixel density to 1.
Render.html requires a local HTTP server; the motion HTML works directly offline.
Build scripts record this Windows production environment and need local paths
adapted before reuse elsewhere. Prefer native-renders + approved-lifted-trio.svg
as the portable master sources. ASSET-MANIFEST.json includes dimensions and hashes.
`);
 put('09-source/finish-assets.cjs',fs.readFileSync(__filename));
 // Exact outline regression, independent from size, packaging or color export.
 const current=fs.readFileSync(path.join(out,'01-wordmark/showuppp-lifted-charcoal.svg'),'utf8');
 const paths=s=>[...s.matchAll(/<path[^>]*transform="([^"]+)"[^>]*d="([^"]+)"/g)].map(m=>m[1]+'|'+m[2]);
 if(JSON.stringify(paths(current))!==JSON.stringify(paths(source))||paths(source).length!==8)throw Error('Letter contours or offsets changed');
 const files=[];async function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await scan(p);else{const buf=fs.readFileSync(p),item={file:path.relative(out,p).replaceAll('\\','/'),bytes:buf.length,sha256:crypto.createHash('sha256').update(buf).digest('hex')};if(/\.png$|\.webp$/i.test(p)){const m=await sharp(buf).metadata();Object.assign(item,{width:m.width,height:m.height,alpha:m.hasAlpha});if(p.includes('05-app-store')&&p.endsWith('icon-512.png')&&buf.length>1048576)throw Error('Play icon over1MB');}files.push(item);}}}await scan(out);
 put('ASSET-MANIFEST.json',JSON.stringify({created:'2026-10-01',approvedSource:'showuppp-c.svg / Lifted p trio',outlineCheck:'PASS: 8 exact contours and permanent transforms',files},null,2));
 console.log(JSON.stringify({count:files.length,bytes:files.reduce((a,b)=>a+b.bytes,0),pdfPages:pages.length}));
})();
