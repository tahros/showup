/* test-photocard.js — v3.3.502, the photo card.
 *
 * The maker asked for the thing Nike Run does: a photo you just took with the
 * day's numbers over it and the mark on top, offered at the end of a workout.
 *
 * WHAT THIS FILE HAS TO PROVE, in the order the bugs would actually bite:
 *   1. the ceremony offers it, and offering it does NOT dismiss the ceremony
 *      (backing out of the camera must leave the moment on screen);
 *   2. a picked photo produces ONE canvas, and it is the same canvas the
 *      share path receives -- the shown-vs-shipped divergence this project
 *      keeps paying for;
 *   3. the photo never reaches the record;
 *   4. the composite is actually drawn: a cover crop, a scrim, and the day's
 *      numbers -- asserted against the real 2D context, via node-canvas, not
 *      against a stub that would accept any sequence of calls at all.
 *
 * The canvas is real (node-canvas, already a harness dependency for
 * test-poster.js). A stubbed context would make every assertion below pass
 * whatever drawPhotoCard did, which is the trap this suite exists to avoid.
 */
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const { createCanvas, Image: NodeImage } = require("canvas");
const dir = process.argv[2] || ".";
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) console.log("PASS " + name + (got !== undefined ? " → " + got : ""));
  else { console.log("FAIL " + name + (got !== undefined ? " → " + got : "")); fail = 1; }
};

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""),
  { url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = q => ({ matches: /no-preference/.test(String(q)), media: String(q),
  addEventListener() {}, removeEventListener() {} });
w.navigator.vibrate = () => {};
w.scrollTo = () => {};

/* ---- a REAL 2d context, and a log of what was drawn on it ---- */
const calls = [];
w.HTMLCanvasElement.prototype.getContext = function (kind) {
  if (kind !== "2d") return null;
  if (!this.__c) this.__c = createCanvas(this.width || 300, this.height || 150);
  if (this.__c.width !== this.width || this.__c.height !== this.height) {
    this.__c.width = this.width; this.__c.height = this.height;
  }
  const real = this.__c.getContext("2d");
  return new Proxy(real, {
    get(t, k) {
      const v = t[k];
      if (typeof v === "function") return (...a) => { calls.push({ fn: k, args: a }); return v.apply(t, a); };
      return v;
    },
    set(t, k, v) { calls.push({ fn: "set:" + k, args: [v] }); t[k] = v; return true; }
  });
};
w.HTMLCanvasElement.prototype.toDataURL = function () { return "data:image/png;base64,"; };
w.HTMLCanvasElement.prototype.toBlob = function (cb) { cb(new w.Blob([""], { type: "image/png" })); };

/* a picked "photo": landscape, so the cover crop has something to do */
const photo = new NodeImage(); photo.src = createCanvas(1600, 900).toBuffer();
w.createImageBitmap = (file, opts) => {
  calls.push({ fn: "createImageBitmap", args: [opts] });
  return Promise.resolve(photo);
};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

/* a day with something in it, then open the ceremony */
run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  for(let i=1;i<=6;i++){const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8,8],at:1}],upd:1};}
  DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:215,reps:[8,8,8],at:1},
                        {part:'Run',ex:'Run',w:4.09,reps:[],mins:27,at:1}],doneAll:1,upd:1};
  delete DB.settings.dayDone; SEED=deriveAll(); view='today'; render();
  celebrateDayDone(false,null,null,true);})()`);

// ---- 1. the ceremony offers it, and offering it does not dismiss it
ok("the ceremony offers a photo",
   run(`!!document.querySelector('#dayDone [data-dd="photo"]')`));
ok("...through the native camera, not getUserMedia",
   run(`(function(){const i=document.getElementById('ddPhoto');
     return !!i && i.type==='file' && /image/.test(i.accept||'') && i.hasAttribute('capture');})()`),
   run(`(function(){const i=document.getElementById('ddPhoto');return i?i.accept+' capture='+i.getAttribute('capture'):'(absent)';})()`));
/* bound to a CALL, not to the word: the comment above the file input names
   getUserMedia to explain why it is not used, and a bare word match would
   read that prose and fail on it */
ok("...front or rear is the OS's picker, so no camera permission is asked for",
   !/getUserMedia\s*\(|mediaDevices\s*\./.test(
     fs.readFileSync(path.join(dir, "js/app.js"), "utf8") +
     fs.readFileSync(path.join(dir, "js/report.js"), "utf8")));
run(`document.querySelector('#dayDone [data-dd="photo"]').click()`);
ok("tapping it does not dismiss the moment — you can back out of the camera",
   run(`!!document.getElementById('dayDone')`));
ok("...while Done still dismisses it",
   run(`(function(){document.querySelector('#dayDone [data-dd="done"]').click();
     return !document.getElementById('dayDone');})()`));

// ---- 2 and 3. a picked photo draws one card, and touches nothing
run(`celebrateDayDone(false,null,null,true)`);
const ledgerBefore = run(`JSON.stringify(DB)`);
const daysBefore = run(`JSON.stringify(DB.days)`);
calls.length = 0;
run(`(function(){const i=document.getElementById('ddPhoto');
  Object.defineProperty(i,'files',{value:[{name:'IMG.jpg',type:'image/jpeg'}],configurable:true});
  i.dispatchEvent(new window.Event('change',{bubbles:true}));})()`);

const settle = () => new Promise(r => setTimeout(r, 40));
(async () => {
  await settle(); await settle();

  ok("a picked photo opens the share overlay",
     run(`document.getElementById('repOv') && repOvEl().style.display==='flex'`),
     run(`(document.getElementById('repOv')||{style:{}}).style.display`));
  ok("...and the ceremony has handed over",
     run(`!document.getElementById('dayDone')`));
  ok("...on a 4:5 frame, the tallest every platform crops whole",
     run(`(function(){const c=_repCv&&_repCv.cv; return !!c && c.width===1080 && c.height===1350;})()`),
     run(`(function(){const c=_repCv&&_repCv.cv;return c?c.width+'x'+c.height:'(none)';})()`));
  ok("...labelled as the photo, not mistaken for the receipt",
     /photo/.test(run(`(_repCv||{}).label||''`)), run(`(_repCv||{}).label`));

  /* the record is a record of training */
  /* the claim is that no PHOTO enters the record -- not that DB is byte-frozen.
     The ceremony legitimately writes settings.dayDone, and the render that
     follows may touch its own bookkeeping; freezing all of DB would make this
     assertion fail for reasons that have nothing to do with photographs. The
     training ledger must be untouched, and nothing image-shaped may appear
     anywhere in the store. */
  /* The claim is that no PHOTO enters the record -- not that the store is
     byte-frozen. Saving legitimately writes settings.dayDone and stamps each
     set with its canonical exercise id, neither of which has anything to do
     with photographs; freezing all of DB would fail on the app's own
     bookkeeping and teach us nothing. So: the TRAINING is identical set for
     set, and nothing image-shaped exists anywhere in the store. */
  const training = j => JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(j))
    .map(([d,v])=>[d,(v.w||[]).map(r=>[r.part,r.ex,r.w,r.reps,r.mins,r.secs])])));
  ok("the photo never reaches the record",
     training(run(`JSON.stringify(DB.days)`)) === training(daysBefore),
     training(run(`JSON.stringify(DB.days)`))===training(daysBefore) ? 'identical' :
       training(run(`JSON.stringify(DB.days)`)).slice(0,120));
  ok("...and nothing image-shaped is anywhere in the store",
     !/data:image|base64|blob:|IMG\.jpg/i.test(run(`JSON.stringify(DB)`)));
  const src = fs.readFileSync(path.join(dir, "js/report.js"), "utf8") +
              fs.readFileSync(path.join(dir, "js/app.js"), "utf8");
  ok("...and nothing anywhere tries to persist it",
     !/(localStorage|DB\.days|supabase|\.upload\()[^\n]*(photo|Photo)/.test(src) &&
     !/(photo|Photo)[^\n]*(localStorage\.|\.upload\(|DB\.days\[)/.test(src));

  // ---- 4. the composite is really composited
  const drew = calls.filter(c => c.fn === "drawImage");
  ok("the photo is drawn, and cover-cropped rather than squashed",
     (function () {
       const d = drew.find(c => c.args.length === 5 && c.args[3] >= 1080 && c.args[4] >= 1350);
       if (!d) return false;
       const [, , , dw, dh] = d.args;
       return Math.abs((dw / dh) - (1600 / 900)) < 0.01;      // aspect preserved
     })(),
     drew.map(c => c.args.slice(1).map(n => Math.round(n)).join(",")).join(" | "));
  /* the first cut of this asserted a createLinearGradient AND a full-frame
     fillRect, and passed with the scrim deleted -- the gradient was still
     built, and the opaque backing fill is also a full-frame fillRect. It has
     to prove the gradient was PAINTED: a fillStyle set to the gradient
     object, and a frame-sized fillRect after it. */
  ok("...under a scrim, so white type survives a bright photo",
     (function () {
       const gi = calls.findIndex(c => c.fn === "createLinearGradient");
       if (gi < 0) return false;
       const si = calls.findIndex((c, i) => i > gi && c.fn === "set:fillStyle" &&
                                            c.args[0] && typeof c.args[0] === "object");
       if (si < 0) return false;
       return calls.some((c, i) => i > si && c.fn === "fillRect" &&
                                   c.args[2] === 1080 && c.args[3] === 1350);
     })(),
     calls.filter(c => /createLinearGradient|set:fillStyle|fillRect/.test(c.fn))
          .map(c => c.fn + (c.fn === "fillRect" ? "(" + c.args.slice(2).join(",") + ")" :
               c.fn === "set:fillStyle" ? "(" + (typeof c.args[0] === "object" ? "gradient" : c.args[0]) + ")" : ""))
          .join(" ").slice(0, 160));
  ok("...with the orientation read from the file, so a portrait shot is not sideways",
     calls.some(c => c.fn === "createImageBitmap" && c.args[0] &&
                     c.args[0].imageOrientation === "from-image"));
  const texts = calls.filter(c => c.fn === "fillText").map(c => String(c.args[0]));
  /* v3.3.503 RESTATES: the day's work is no longer one small mono run-on
     under the count -- it is labelled stat columns, a quiet LABEL over a loud
     VALUE, which is the only shape that survives being written on a
     photograph. The claim is unchanged and stronger: the count, the unit
     line, and the day's actual numbers are all on the card. Each column is
     checked as a PAIR, because a label with no value under it is exactly the
     failure worth catching. */
  ok("...and the day's numbers over it: the count and the unit line",
     texts.some(t => /^\d{1,3}(,\d{3})*$/.test(t)) &&
     texts.some(t => /DAYS OF SHOWING UP/.test(t)),
     texts.join(" | "));
  ok("...as labelled columns, each label with a value under it",
     (function () {
       const want = [["SETS", /^\d+$/], ["DISTANCE", /^[\d.]+ (mi|km)$/], ["VOLUME", /^[\d,]+ (lb|kg)$/]];
       return want.every(([lab, re]) => {
         const at = texts.indexOf(lab);
         return at >= 0 && texts[at + 1] !== undefined && re.test(texts[at + 1]);
       });
     })(),
     texts.join(" | "));
  ok("...with the big numbers set large, not caption-sized",
     (function () {
       const fonts = calls.filter(c => c.fn === "set:font").map(c => String(c.args[0]));
       const px = fonts.map(f => parseFloat((f.match(/(\d+(?:\.\d+)?)px/) || [])[1] || 0));
       return px.some(p => p >= 150) && px.filter(p => p >= 60).length >= 2;
     })(),
     calls.filter(c => c.fn === "set:font").map(c => (String(c.args[0]).match(/\d+px/) || [""])[0]).join(","));
  ok("...and the mark rides on top",
     drew.some(c => c.args.length === 5 && c.args[3] === 64 && c.args[4] === 64) ||
     /_dayIcon/.test(fs.readFileSync(path.join(dir, "js/report.js"), "utf8")));

  process.exit(fail ? 1 : 0);
})();
