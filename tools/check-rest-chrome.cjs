const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});try{
const p=await b.newPage({serviceWorkers:'block',viewport:{width:393,height:852}});
await p.goto('http://127.0.0.1:8795/');
for(const theme of ['light','dark']){
const result=await p.evaluate(theme=>{
DB.settings.theme=theme;document.body.classList.add('rest-home');applyTheme();
const root=document.documentElement,meta=document.querySelector('meta[name="theme-color"]');
const normalize=color=>{const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,1,1);return Array.from(x.getImageData(0,0,1,1).data).join(',');};
const rest={root:normalize(getComputedStyle(root).backgroundColor),meta:normalize(meta.content),flag:root.dataset.restHome};
document.body.classList.remove('rest-home');syncPageChrome();
return {rest,cleared:!root.hasAttribute('data-rest-home'),normal:normalize(meta.content)};
},theme);
assert.equal(result.rest.root,result.rest.meta);assert.equal(result.rest.flag,'1');assert(result.cleared);assert.notEqual(result.normal,result.rest.meta);
console.log('PASS '+theme+': status color matches Rest canvas; normal color restored');
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
