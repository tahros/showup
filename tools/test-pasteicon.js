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

const svg=run(`icon('paste',15)`);
ok("the set has a paste glyph", /ic-paste/.test(svg), svg.slice(0,52));
ok("...stroked, at the set's own weight and joins, like sparkle and chevron",
   /stroke="currentColor"/.test(svg) && /stroke-linecap="round"/.test(svg) &&
   /stroke-linejoin="round"/.test(svg) && !/fill="currentColor"/.test(svg));
ok("...normalised through ICON_INK like every other glyph, not hand-placed",
   run(`!!ICON_INK.paste`) && run(`ICON_INK.paste.join(',')`)==='14,5,86,96',
   run(`(ICON_INK.paste||[]).join(',')`));
/* the whole point: it must not be another document-with-lines */
const d=run(`ICON_STROKE.paste`);
ok("...and it is an arrow going IN, not three lines on a board",
   /M50 40 L50 74/.test(d) && /M36 60 L50 74 L64 60/.test(d), d.slice(-34));
/* the first cut crossed the clip over the board's top edge and rendered a
   notch with the line doubled behind it */
ok("...drawn as one continuous outline, clip and gap on the same span",
   /M34 16 L34 10/.test(d) && /L66 16 L76 16/.test(d) &&
   (d.match(/Z/g)||[]).length===1, (d.match(/Z/g)||[]).length+" close(s)");

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
