// test-chartsize.js DIR — v3.3.129: taller plots, hints outside the plot,
// and label stacks that cannot collide.
//
// The bug this locks down: on Weekdays the % label's y depended on whether
// the bar was today AND whether it was the strongest, while the caret sat at
// a fixed offset. A day that was BOTH (Tuesday, in the field report) drew the
// two 4 units apart — on top of each other. So the interesting case here is
// not "does it render", it's "force today == strongest and measure the gap".
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){}, addListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.performance = w.performance || { now: () => Date.now() };
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({ measureText: () => ({ width: 10 }) },
  { get: (o,k) => k in o ? o[k] : () => ({}), set: () => true }); };
w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};

for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

/* Seed several years so the consistency chart actually has four lines whose
   end-labels can crowd each other, and so every weekday has a rate. */
/* today's weekday is trained EVERY time, so today is also the strongest —
   the exact collision case from the field report. */
run(`(function(){DB.days={}; const y=+todayISO.slice(0,4);
  const todayDow=new Date(todayISO+'T00:00').getDay();
  for(let yr=y-4; yr<=y; yr++){
    for(let d=1; d<=366; d++){
      const dt=new Date(yr,0,d); const iso=dt.toLocaleDateString('en-CA');
      if(dt.getFullYear()!==yr || iso>todayISO) break;
      const train = dt.getDay()===todayDow ? true : (d%3!==0);
      if(train) DB.days[iso]={w:[{part:'Back',ex:'Pull Up',w:70,reps:[8]},
                                 {part:'Run',ex:'Run',w:3.4,mins:28,secs:0}],upd:1};
    }
  }
})()`);

run(`renderStats()`);
const $ = sel => run(`document.querySelector(${JSON.stringify(sel)})`);
const cards = () => run(`[...document.querySelectorAll('#view .card')].length`);

// ---- 1. the plots are taller -----------------------------------------------
const vbs = run(`[...document.querySelectorAll('#view svg')].map(s=>s.getAttribute('viewBox'))`);
ok("the same-date consistency race has its dedicated plot", vbs.includes("0 0 340 215"), vbs.find(v=>/340/.test(v)));
ok("Monthly pace has its padded 12-bar plot", vbs.includes("0 0 330 160"), vbs.find(v=>v==="0 0 330 160"));
/* v3.3.129 was scoped to FOUR charts: consistency, days-by-month, weekdays,
   distance. Weight and Pace were deliberately left at 118 — they were not in
   the request, and a chart is not made better by being taller on principle.
   So this asserts the scope held, not that 118 was eradicated. */
ok("only the optional weight chart may keep the compact plot", vbs.filter(v=>v==="0 0 330 118").length <= 1,
   vbs.filter(v=>v==="0 0 330 118").length + " compact plots");

// ---- 2. the hint sits OUTSIDE the plot -------------------------------------
const hintsInside = run(`document.querySelectorAll('.zoom .zoomhint').length`);
const hintsTotal  = run(`document.querySelectorAll('.zoomhint').length`);
ok("no hint is rendered inside a .zoom box", hintsInside === 0, hintsInside + " inside");
ok("the visible race date replaces every zoom hint", hintsTotal === 0, hintsTotal + " hints");
ok("the hint precedes its chart in the DOM", run(`(function(){
    const hs=[...document.querySelectorAll('.zoomhint')];
    return hs.every(h=>{ const z=h.parentElement.querySelector('.zoom');
      return z && (h.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING); });
  })()`));
ok("the race uses its visible date header instead of adding another hint", run(`(function(){
    const z=document.querySelector('.conrace .zoom[data-zoom]');
    return !!z && !z.parentElement.querySelector('.zoomhint') && !!z.parentElement.querySelector('[data-con-date]');
  })()`));
ok("the hint is no longer absolutely positioned over the plot",
   !/\.zoomhint\{[^}]*position:absolute/.test(run(`document.querySelector('style')?document.querySelector('style').textContent:''`) ||
     fs.readFileSync(path.join(dir,"css/app.css"),"utf8")),
   "position:absolute gone");

// ---- 3. The new day-level view is compact and structurally clear -----------
/* v3.3.307 RESTATES: weekdays are now ROWS of a year heatmap rather than a
   labelled header over a month. Seven of them either way, and exactly one
   today either way. */
/* v3.3.335 RESTATES the UNIT, not the count. Seven rows is the property and
   it is untouched; 1fr is not. A 1fr row takes its height from the cells,
   which take theirs from the column width via aspect-ratio -- so on a screen
   wide enough to stretch the columns, the rows grew too, and a STATIC weekday
   rail beside the grid cannot stretch with them. Rows are now the same
   --hcell token the columns and the rail read, so the three cannot drift. */
ok("the attendance grid keeps seven weekday rows",
   /\.heatgrid\{[^}]*grid-template-rows:repeat\(7,var\(--hcell\)\)/.test(
     fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "")));
ok("...and contains exactly one today", run(`document.querySelectorAll('.heatgrid .tod').length`) === 1);
/* v3.3.308: two reported bugs, both about things LOOKING joined that are not.
   (1) Month labels collided — DEC at column 0 and JAN at column 1 printed on
   top of each other, because the rule fired on the first column AND on any
   Monday in a month's first week. (2) The grid used one gap for both axes,
   so two cells side by side — a WEEK apart — sat as close as two stacked
   consecutive days, and a row of Mondays read as a continuous run directly
   under the words "streak 1". */
{
  const cols = run(`[...document.querySelectorAll('.heatticks span')].map(s=>+s.style.getPropertyValue('--c'))`);
  const labels = run(`[...document.querySelectorAll('.heatticks span')].map(s=>s.textContent)`);
  let closest = 99;
  for (let i = 1; i < cols.length; i++) closest = Math.min(closest, cols[i] - cols[i-1]);
  ok("month labels never sit on top of each other", cols.length < 2 || closest >= 4,
     "closest " + closest + " columns");
  /* v3.3.337 RESTATES v3.3.308. That release fixed DEC and JAN colliding one
     column apart, and pinned it as "no month is printed twice" -- true of a
     35-week window, where a repeated label could only mean the same month
     labelled twice. The grid now spans five years and each label is one
     letter, so J appears every January, June and July BY DESIGN: the row is a
     ruler, not a list. The real property is unchanged and is the line above --
     labels never collide. What replaces the duplicate check: no month may be
     labelled twice IN THE SAME YEAR, which is the bug v3.3.308 actually
     caught, expressed so it survives a multi-year grid. */
  {
    const cells = run(`[...document.querySelectorAll('.heatgrid .hc')].map(e=>e.getAttribute('aria-label').slice(0,7))`);
    const stamped = cols.map(c => cells[c*7]);            // YYYY-MM per label
    ok("...and no month is labelled twice within a year",
       new Set(stamped).size === stamped.length, stamped.join(" "));
  }
  const cssG = fs.readFileSync(path.join(dir, "css/app.css"), "utf8").replace(/\r?\n\s*/g, "");
  const colGap = +(cssG.match(/\.heatgrid\{[^}]*column-gap:(\d+)px/) || [0,0])[1];
  /* v3.3.314: with the join gone the gap lives back on the track, so read it
     from there again — the property (weeks further apart than the days
     inside them) never changed, only where the number is written. */
  const rowGap = +(cssG.match(/\.heatgrid\{[^}]*row-gap:(\d+)px/) || [0,0])[1];
/* v3.3.310: the join must not MOVE anything. Negative margins closed the
   row-gap, but rows are repeat(7,1fr) on a grid with no explicit height —
   1fr resolved from the items, the tracks shrank by the margin, and cells
   went on painting at their aspect-ratio height, overflowing ~4px each and
   bleeding into their neighbours until a run read as one solid block. The
   gap is now PAINTED: row-gap 0, 1px of transparent padding per cell,
   background clipped to the content box, and a joined edge drops its
   padding. */
{
  const cssJ = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
  const heat = cssJ.slice(cssJ.indexOf(".heatgrid{"), cssJ.indexOf(".heatticks{")).replace(/\r?\n\s*/g, "");
  /* v3.3.314 RESTATES the v3.3.310 block. Those assertions defended the
     MECHANISM that joined consecutive days — painted padding, dropped edges,
     a zero row track. The maker compared both on device and chose the plain
     grid, so the join is gone and its machinery with it. What survives is the
     lesson underneath: nothing may be pulled out of its track, because that
     is what made cells overflow and bleed into each other. */
  ok("no cell is pulled out of its track", !/margin-(top|bottom):\s*-/.test(heat));
  ok("...every day is its own square, none joined to another",
     !/\.hc\.ju/.test(heat) && !/\.hc\.jd/.test(heat));
  ok("...and the grid keeps the gap on the track, where it cannot displace anything",
     /row-gap:2px/.test(heat) && !/\.heatgrid \.hc\{[^}]*padding/.test(heat));
}
/* the streak line must name its unit — days is the only thing this app
   counts, and it is the whole point of the section */
ok("the streak line says what it is counting",
   /streak \d+ days?/.test(run(`document.querySelector('.crstreak').textContent`)),
   run(`document.querySelector('.crstreak').textContent`));
  ok("weeks are pushed further apart than the days within them",
     colGap > rowGap && rowGap > 0, `column ${colGap}px vs row ${rowGap}px`);
  ok("...so only a real run can look like one",
     !/\.heatgrid\{[^}]*gap:\d+px/.test(cssG.replace(/column-gap|row-gap/g, "x")));
}
ok("...with every day of the window present, none blank",
   run(`document.querySelectorAll('.heatgrid .hc').length`) === 35*7,
   run(`document.querySelectorAll('.heatgrid .hc').length`) + " cells");
ok("the retired Weekdays plot is gone", run(`document.querySelectorAll('.wd-col').length`) === 0);

// ---- 4. Consistency: verdict plus graph ------------------------------------
ok("Consistency leads with two exact day totals", run(`document.querySelectorAll('.conrace:not(.runrace) .conscore>span b').length`) === 2);
ok("Consistency draws the filled difference field", run(`document.querySelectorAll('.conrace:not(.runrace) polygon').length`) === 1);
ok("Consistency draws one line for each self", run(`document.querySelectorAll('.conrace:not(.runrace) polyline').length`) === 2);
ok("Distance uses the same two-self score language",run(`document.querySelectorAll('.runrace .conscore>span b').length`)===2);

// ---- 5. nothing escapes the taller viewBox --------------------------------
ok("nothing is drawn below the bottom of any stats plot", run(`(function(){
    const bad=[];
    for(const s of document.querySelectorAll('#view svg')){
      const h=+s.getAttribute('viewBox').split(/\\s+/)[3];
      for(const t of s.querySelectorAll('text')) if(+t.getAttribute('y')>h) bad.push(t.textContent);
      for(const r of s.querySelectorAll('rect')){
        const y=+r.getAttribute('y')||0, rh=+r.getAttribute('height')||0;
        if(y+rh>h+0.5) bad.push('rect');
      }
    }
    return bad.length===0;
  })()`));

// ---- 6. the scrub anchors match the geometry they describe -----------------
/* If sy0/syh drift from the drawn baseline the legend silently reports wrong
   numbers while scrubbing — no crash, just lies. */
ok("scrub anchors track both race baselines", run(`(function(){
    const c=document.querySelector('.conrace:not(.runrace) [data-scrub]'),d=document.querySelector('.runrace [data-scrub]');
    return c&&d&&c.dataset.sy0==='182'&&c.dataset.syh==='150'&&d.dataset.sy0==='180'&&d.dataset.syh==='145';
  })()`), run(`[...document.querySelectorAll('[data-scrub]')].map(s=>s.getAttribute('data-sy0')+'/'+s.getAttribute('data-syh')).join(' ')`));

// the distance chart comes in via runStatsHTML(), appended by renderStats
const distVb = run(`(function(){
  const s=document.querySelector('.runrace [data-scrub="race"]');
  return s?s.getAttribute('viewBox'):'none';
})()`);
ok("the distance race uses its own compact plot", distVb === "0 0 340 205", distVb);
ok("the distance race uses its visible date instead of a hint", run(`(function(){
    const s=document.querySelector('.runrace [data-scrub="race"]');
    if(!s) return false;
    const z=s.closest('.zoom');
    return !z.querySelector('.zoomhint') && !!z.parentElement.querySelector('[data-con-date]');
  })()`));

console.log(fail ? "\n" + fail + " FAILED" : "\nALL PASS");
process.exit(fail ? 1 : 0);
