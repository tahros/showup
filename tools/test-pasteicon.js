/* test-pasteicon.js — v3.3.529, the paste glyph.
 * WRITE and PASTE ran together as one string of capitals. The glyph is the
 * separator, and it has to say the ACTION -- a board with lines on it reads as
 * "a document", which is what the app already draws for a list.
 */
const { JSDOM } = require("jsdom");
const fs=require("fs"), path=require("path"), vm=require("vm");
const dir=process.argv[2]||"."; let fail=0;
const ok=(n,c,g)=>{ console.log((c?"PASS ":"FAIL ")+n+(g!==undefined?" → "+g:"")); if(!c) fail=1; };
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,""),
  {url:"https://tahros.github.io/showup/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window, ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error("offline"));
w.matchMedia=q=>({matches:/no-preference/.test(String(q)),media:String(q),addEventListener(){},removeEventListener(){}});
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);

/* v4.6.341: the paste glyph is the solid set's clipboard -- the arrow is still
   IN it (cut out of the board), so it still says the action. */
const svg=run(`icon('paste',ICON_SZ.sm)`);
ok("the set has a paste glyph", /ic-paste/.test(svg), svg.slice(0,52));
ok("...a solid board, its arrow cut out of it",
   /style="fill:currentColor/.test(svg) && /mask="url\(#icm-paste\)"/.test(svg));
ok("...and the cut is an arrow going IN, not lines on a board",
   /M50 44V72M39 61L50 72L61 61/.test(run(`ICON_SET.paste.c`)), run(`ICON_SET.paste.c`).slice(0,60));
/* it rides with the word, in both places Paste is offered */
const src=fs.readFileSync(path.join(dir,"js/lift.js"),"utf8")+
          fs.readFileSync(path.join(dir,"js/today.js"),"utf8");
const btns=src.match(/data-planpaste[^>]*>[^<]*/g)||[];
ok("every Paste button carries the glyph before its word",
   btns.length>=2 && (src.match(/icon\('paste',ICON_SZ\.sm\)\}Paste/g)||[]).length===btns.length,
   btns.length+" button(s), "+(src.match(/icon\('paste',ICON_SZ\.sm\)\}Paste/g)||[]).length+" with the glyph");
const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
ok("...with a gap between them, so it is not one run-on string of capitals",
   /\.pedge\[data-planpaste\]\{[^}]*display:inline-flex[^}]*gap:\d/.test(css));
process.exit(fail?1:0);
