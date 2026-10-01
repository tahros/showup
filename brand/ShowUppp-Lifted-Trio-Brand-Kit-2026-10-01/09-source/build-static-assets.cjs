const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require('C:/Users/sungj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=__dirname,out=path.join(root,'ShowUppp-Lifted-Trio-Brand-Kit-2026-10-01');
const put=(p,s)=>{p=path.join(out,p);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
const original=fs.readFileSync(path.join(out,'09-source/approved-lifted-trio.svg'),'utf8');
const letters=original.slice(original.indexOf('<g'),original.lastIndexOf('</svg>'));
const svg=(w,h,content)=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`;
const word=(x,y,w,color)=>`<g transform="translate(${x} ${y}) scale(${w/350})" color="${color}">${letters.replaceAll('currentColor',color)}</g>`;
const image=(data,x,y,w,h)=>`<image x="${x}" y="${y}" width="${w}" height="${h}" xlink:href="data:image/png;base64,${data.toString('base64')}"/>`;
const themes=[{name:'light',tone:'blue',ink:'#2C2C2C',bg:'#FFFFFF'},{name:'dark',tone:'white',ink:'#FFFFFF',bg:'#191B24'},{name:'blue',tone:'white',ink:'#FFFFFF',bg:'#3049DC'},{name:'charcoal',tone:'charcoal',ink:'#2C2C2C',bg:'#F6F3EC'}];
async function png(rel,code,width,bg){let job=sharp(Buffer.from(code)).resize({width});if(bg)job=job.flatten({background:bg}).removeAlpha();const b=await job.png().withMetadata({density:300}).toBuffer();put(rel,b);return b;}
async function family(rel,code,sizes=[1024,2048,4096]){put(rel+'.svg',code);for(const size of sizes)await png(rel+'-'+size+'.png',code,size);}
const crops={};
function lock(t,layout='horizontal'){
 const data=crops[t.tone],h=96.6*data.h/data.w;
 // Preserve the final app's two columns and open gap. Geometry is not retypeset.
 if(layout==='horizontal')return svg(235.04,90, image(data.body,12,12+(66.577-h)/2,96.6,h)+word(122.6,12,100.44,t.ink));
 const mw=110,mh=mw*data.h/data.w;return svg(180,210,image(data.body,35,12,mw,mh)+word(24,12+mh+18,132,t.ink));
}
function icon(t,size=1024){const d=crops[t.tone],w=size*.70,h=w*d.h/d.w;return svg(size,size,`<rect width="${size}" height="${size}" fill="${t.bg}"/>`+image(d.body,(size-w)/2,(size-h)/2,w,h));}
function tile(t,w,h,layout='horizontal'){
 const code=lock(t,layout);const vb=layout==='horizontal'?[235.04,90]:[180,210];const ww=Math.min(w*.8,h*.66*vb[0]/vb[1]),hh=ww*vb[1]/vb[0];return svg(w,h,`<rect width="${w}" height="${h}" fill="${t.bg}"/>`+`<svg x="${(w-ww)/2}" y="${(h-hh)/2}" width="${ww}" height="${hh}" viewBox="0 0 ${vb.join(' ')}">${code.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg>`);
}
(async()=>{
 // Bounding boxes are derived from native alpha, not guessed from a screenshot.
 for(const tone of ['blue','charcoal','white']){
  const src=path.join(out,`09-source/native-renders/mascot-${tone}-body-native.png`);
  const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});let l=info.width,r=0,t=info.height,b=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  const bounds={left:l-4,top:t-4,width:r-l+9,height:b-t+9};const body=await sharp(src).extract(bounds).png().toBuffer();crops[tone]={body,w:bounds.width,h:bounds.height};
  put(`09-source/mascot-${tone}-crop.json`,JSON.stringify(bounds));
  for(const size of [1024,2048,4096]){if(bounds.width<size)throw Error('Would upscale mascot');put(`03-mascot/transparent/mascot-${tone}-${size}.png`,await sharp(body).resize({width:size}).withMetadata({density:300}).png().toBuffer());}
  const ground=await sharp(path.join(out,`09-source/native-renders/mascot-${tone}-grounded-native.png`)).trim({background:'#00000000',threshold:2}).toBuffer();
  for(const size of [2048,4096])put(`03-mascot/grounded/mascot-${tone}-${size}.png`,await sharp(ground).resize({width:size}).withMetadata({density:300}).png().toBuffer());
 }
 for(const [name,col] of Object.entries({charcoal:'#2C2C2C',black:'#000000',white:'#FFFFFF',blue:'#3049DC'}))await family(`01-wordmark/showuppp-lifted-${name}`,svg(350,232,word(0,0,350,col)));
 for(const t of themes){
  for(const layout of ['horizontal','vertical']){const code=lock(t,layout);await family(`02-lockups/${t.name}/showuppp-${layout}`,code);await png(`00-preview/${t.name}-${layout}.png`,code,1400,t.bg);}
  for(const size of [1024,512])await png(`05-app-store/${t.name}/icon-${size}.png`,icon(t,size),size,t.bg);
  for(const size of [180,192,512])await png(`04-web/${t.name}/icon-${size}.png`,icon(t,size),size,t.bg);
  for(const size of [16,32,48,64])await png(`04-web/${t.name}/favicon-${size}.png`,icon(t,size),size,t.bg);
  const entries=[];for(const size of [16,32,48])entries.push({size,data:fs.readFileSync(path.join(out,`04-web/${t.name}/favicon-${size}.png`))});
  const header=Buffer.alloc(6+entries.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(entries.length,4);let offset=header.length;
  entries.forEach((e,i)=>{const k=6+16*i;header[k]=e.size;header[k+1]=e.size;header.writeUInt16LE(1,k+4);header.writeUInt16LE(32,k+6);header.writeUInt32LE(e.data.length,k+8);header.writeUInt32LE(offset,k+12);offset+=e.data.length;});put(`04-web/${t.name}/favicon.ico`,Buffer.concat([header,...entries.map(e=>e.data)]));
  await png(`06-social/${t.name}/avatar-1080.png`,icon(t,1080),1080,t.bg);
  for(const [name,w,h,layout] of [['square',1080,1080,'vertical'],['portrait',1080,1350,'vertical'],['story',1080,1920,'vertical'],['link-preview',1200,630,'horizontal'],['wide-banner',1500,500,'horizontal']])await png(`06-social/${t.name}/${name}-${w}x${h}.png`,tile(t,w,h,layout),w,t.bg);
  await png(`05-app-store/${t.name}/feature-graphic-1024x500.png`,tile(t,1024,500),1024,t.bg);
  // Separated artwork layers, no baked corner mask or exterior shadow.
  const size=1024,d=crops[t.tone],ww=size*.70,hh=ww*d.h/d.w;
  await png(`05-app-store/${t.name}/layers/foreground-1024.png`,svg(size,size,image(d.body,(size-ww)/2,(size-hh)/2,ww,hh)),size);
  await png(`05-app-store/${t.name}/layers/background-1024.png`,svg(size,size,`<rect width="1024" height="1024" fill="${t.bg}"/>`),size,t.bg);
 }
 // Transparent web-optimized companions: SVG lettering remains the preferred wordmark.
 for(const t of themes){const code=lock(t);put(`04-web/${t.name}/lockup-960.webp`,await sharp(Buffer.from(code)).resize({width:960}).webp({quality:95,alphaQuality:100}).toBuffer());}
 const cards=themes.map((t,i)=>{const x=(i%2)*900,y=180+Math.floor(i/2)*510;const code=lock(t);return `<g transform="translate(${x} ${y})"><rect width="900" height="510" fill="${t.bg}"/><text x="50" y="58" fill="${t.ink}" font-family="Arial" font-size="20" letter-spacing="3">${t.name.toUpperCase()}</text><svg x="60" y="110" width="780" height="299" viewBox="0 0 235.04 90">${code.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg></g>`;}).join('');
 const sheet=svg(1800,1420,`<rect width="1800" height="1420" fill="#F6F3EC"/><text x="55" y="70" font-family="Arial" font-size="38" font-weight="bold" fill="#2c2c2c">ShowUppp / Lifted p trio</text><text x="55" y="119" font-family="Arial" font-size="22" fill="#555">Original mascot. Exact approved lettering. A complete cross-channel identity kit.</text>${cards}<text x="55" y="1265" font-family="Arial" font-size="24" fill="#2c2c2c">SVG lettering + high-resolution mascot renders / horizontal + vertical / light + dark + blue + charcoal</text><text x="55" y="1315" font-family="Arial" font-size="24" fill="#2c2c2c">Web / social / store icons / print masters / animated web lockup / editable source</text><text x="55" y="1370" font-family="Arial" font-size="19" fill="#666">01 OCT 2026     •     Start with 00-START-HERE.txt</text>`);
 await png('00-OVERVIEW.png',sheet,1800);
 const functionSource=fs.readFileSync('C:/Users/sungj/.codex/visualizations/2026/08/11/019ff10f-c20d-77f0-9faa-31c13de635df/showup-planner-live/js/mascot.js','utf8');
 const motion=functionSource.slice(functionSource.indexOf('function showupppAnimate(host)'),functionSource.indexOf('/* v4.6.69:'));
 put('08-motion/approved-pop.js',`function mascotMode(){return 'animated';}\n${motion}`);
 const css=`body{margin:0;background:#fff;color:#2c2c2c;font:16px Arial}main{display:grid;min-height:100vh;place-content:center;gap:45px;padding:70px;box-sizing:border-box}.showuppp-c{position:relative;display:flex;align-items:center;gap:14px;width:211.04px;min-height:83px;--accent-ink:#3049dc;transform:scale(2);transform-origin:center;margin:80px auto}.showuppp-character{width:96.6px;height:59.892px;position:relative;flex:none}.showuppp-character img{position:absolute;width:184.615%;left:-42.308%;top:-43.83%;transform-origin:50% 77%}.showuppp-ground{position:absolute;left:0;right:0;bottom:0;height:5px;background:radial-gradient(ellipse,#0003 0%,#00000014 48%,#0000 74%);filter:blur(.5px)}.showuppp-lettering{width:100.44px;flex:none;overflow:visible;transform-origin:50% 70%}.showuppp-lettering [data-letter]{transform-box:fill-box;transform-origin:50% 85%}.showuppp-burst{position:absolute;width:3px;height:9px;border-radius:2px;background:var(--accent-ink);pointer-events:none}button{padding:12px 24px;background:#3049dc;border:0;border-radius:12px;color:white;font-size:16px}p{text-align:center;max-width:520px;line-height:1.5}@media(prefers-reduced-motion:reduce){*{animation:none!important}}`;
 for(const t of themes){const native=await sharp(path.join(out,`09-source/native-renders/mascot-${t.tone}-body-native.png`)).resize(1440,880).png().toBuffer();put(`08-motion/mascot-${t.tone}-body.png`,native);
 put(`08-motion/${t.name}.html`,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ShowUppp animated Lifted p trio</title><style>${css}body{background:${t.bg};color:${t.ink}}.showuppp-c{--accent-ink:${t.name==='blue'?'#FFFFFF':'#3049DC'}}</style><main><div id="host"><div class="showuppp-c" role="img" aria-label="ShowUppp"><span class="showuppp-character"><i class="showuppp-ground"></i><img alt="" src="mascot-${t.tone}-body.png"></span><svg class="showuppp-lettering" viewBox="0 0 350 232">${letters}</svg></div></div><button id="replay">Replay animation</button><p>Approved one-shot Pop motion. The logo returns to the Lifted p trio resting pose. Reduced-motion preference is respected.</p></main><script src="approved-pop.js"></script><script>const host=document.querySelector('#host');document.querySelector('button').onclick=()=>showupppAnimate(host);</script>`);}
 put('09-source/build-static-assets.cjs',fs.readFileSync(__filename));
 console.log('Built static variants, previews, web assets, store assets and motion source.');
})();
