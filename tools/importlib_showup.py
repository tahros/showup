#!/usr/bin/env python3
"""importlib_showup.py — shared machinery for ShowUp import converters.

The canonical import format is the app's own Backup JSON:
  {app:'showup', v:..., exported:ISO, doc:{days:{...}, settings:{...}}}
Restore already accepts it, stamps every day so the restore wins LWW, and
keeps a pre-restore safety copy. Converters therefore never invent a second
format — they translate INTO the one the app already round-trips.

Policy decisions (made once, here, so both converters agree):
- One source row = one ShowUp set entry {part, ex, w(kg), reps:[r], at}.
  foldSets() groups at render time; storage stays per-set.
- Weights are stored in kg to 2dp. lb inputs convert at 0.45359237.
- Cardio rows (distance/duration, zero reps) become Run entries:
  {part:'Run', ex:'Run', w:km, reps:[], mins, secs, at}.
- Warm-up sets are sets. days>volume: a day you showed up is a day.
- Rows that carry neither reps nor distance are SKIPPED and REPORTED —
  never silently, and never as reps:[] marker rows (the sheet-import scar
  this app spent v3.3.61–63 paying down).
- Every day gets upd (restore re-stamps anyway; a standalone file must
  still be valid on its own).
- Unknown exercise names STOP the conversion and write mapping_todo.json.
  A guessed body part is a corrupted archive; the operator confirms, the
  file becomes the next user's head start.
"""
import json, re, sys, datetime

KG_PER_LB = 0.45359237

# Exercise -> part. Seeded from ShowUp's own catalog vocabulary (Chest,
# Back, Shoulder, Legs, Biceps, Triceps, Sixpack, Run) plus the common
# names in Strong/Hevy exports. Substring rules run AFTER exact rules.
EXACT = {
  # chest
  "bench press":"Chest","bench press (barbell)":"Chest","bench press (dumbbell)":"Chest",
  "incline bench press":"Chest","incline bench press (barbell)":"Chest",
  "incline bench press (dumbbell)":"Chest","chest press":"Chest","chest press (machine)":"Chest",
  "chest fly":"Chest","pec deck":"Chest","cable crossover":"Chest","push up":"Chest","push-up":"Chest",
  "dip":"Chest","chest dip":"Chest","incline barbell bench press":"Chest","pectoral fly":"Chest",
  # back
  "deadlift":"Back","deadlift (barbell)":"Back","romanian deadlift":"Back","rdl":"Back",
  "pull up":"Back","pull-up":"Back","pull up (assisted)":"Back","chin up":"Back","chin-up":"Back",
  "lat pulldown":"Back","lat pulldown (cable)":"Back","seated row":"Back","seated row (cable)":"Back",
  "bent over row":"Back","bent over row (barbell)":"Back","barbell row":"Back","row":"Back",
  "t-bar row":"Back","dumbbell row":"Back","face pull":"Back","back extension":"Back",
  # shoulder
  "overhead press":"Shoulder","overhead press (barbell)":"Shoulder","ohp":"Shoulder",
  "shoulder press":"Shoulder","shoulder press (dumbbell)":"Shoulder","arnold press":"Shoulder",
  "lateral raise":"Shoulder","lateral raise (dumbbell)":"Shoulder","side raise":"Shoulder",
  "front raise":"Shoulder","rear delt fly":"Shoulder","upright row":"Shoulder","shrug":"Shoulder",
  "dumbbell press":"Shoulder","dumbbell side raise":"Shoulder","dumbbell front raise":"Shoulder",
  "dumbbell combination":"Shoulder",
  # legs
  "squat":"Legs","squat (barbell)":"Legs","front squat":"Legs","goblet squat":"Legs",
  "leg press":"Legs","leg press (machine)":"Legs","leg extension":"Legs","leg curl":"Legs",
  "lying leg curl":"Legs","seated leg curl":"Legs","lunge":"Legs","walking lunge":"Legs",
  "calf raise":"Legs","standing calf raise":"Legs","hip thrust":"Legs","bulgarian split squat":"Legs",
  "hack squat":"Legs",
  # arms
  "bicep curl":"Biceps","biceps curl":"Biceps","bicep curl (dumbbell)":"Biceps",
  "bicep curl (barbell)":"Biceps","hammer curl":"Biceps","preacher curl":"Biceps",
  "concentration curl":"Biceps","ez bar curl":"Biceps","cable curl":"Biceps",
  "tricep extension":"Triceps","triceps extension":"Triceps","tricep pushdown":"Triceps",
  "triceps pushdown":"Triceps","skullcrusher":"Triceps","skull crusher":"Triceps",
  "close grip bench press":"Triceps","overhead tricep extension":"Triceps","tricep dip":"Triceps",
  # core
  "crunch":"Sixpack","crunch (weighted)":"Sixpack","sit up":"Sixpack","sit-up":"Sixpack",
  "plank":"Sixpack","leg raise":"Sixpack","hanging leg raise":"Sixpack","russian twist":"Sixpack",
  "ab wheel":"Sixpack","cable crunch":"Sixpack",
  # cardio names that arrive as "exercises"
  "running":"Run","run":"Run","treadmill":"Run","running (treadmill)":"Run","jogging":"Run",
}
SUBSTR = [
  ("curl","Biceps"),("tricep","Triceps"),("pushdown","Triceps"),
  ("bench","Chest"),("chest","Chest"),("fly","Chest"),("pec","Chest"),("push up","Chest"),
  ("row","Back"),("pulldown","Back"),("pull up","Back"),("pull-up","Back"),
  ("deadlift","Back"),("lat ","Back"),("shrug","Shoulder"),
  ("shoulder","Shoulder"),("delt","Shoulder"),("raise","Shoulder"),("press","Shoulder"),
  ("squat","Legs"),("leg","Legs"),("lunge","Legs"),("calf","Legs"),("hip","Legs"),
  ("glute","Legs"),("hamstring","Legs"),
  ("crunch","Sixpack"),("plank","Sixpack"),("ab ","Sixpack"),("core","Sixpack"),("sit up","Sixpack"),
  ("run","Run"),("treadmill","Run"),
]

def map_part(name, user_map):
    n = re.sub(r"\s+", " ", name.strip().lower())
    if n in user_map:  return user_map[n], "user"
    if n in EXACT:     return EXACT[n], "exact"
    for frag, part in SUBSTR:
        if frag in n:  return part, f"substr:{frag}"
    return None, "unmapped"

def to_kg(v, unit):
    if v in (None, ""): return 0.0
    v = float(v)
    return round(v * KG_PER_LB, 2) if unit == "lb" else round(v, 2)

class Builder:
    """Accumulates per-set rows into ShowUp days and writes the envelope."""
    def __init__(self, source, unit_default="kg"):
        self.days, self.source = {}, source
        self.unit_default = unit_default
        self.report = {"source": source, "rows": 0, "sets": 0, "runs": 0,
                       "skipped": [], "warmups": 0, "mappings": {}, "unmapped": {},
                       "days": 0, "first": None, "last": None}

    def add_set(self, iso, ex, part, kg, reps, at_ms, warmup=False):
        d = self.days.setdefault(iso, {"w": []})
        d["w"].append({"part": part, "ex": ex, "w": kg, "reps": [int(reps)], "at": at_ms})
        self.report["sets"] += 1
        if warmup: self.report["warmups"] += 1

    def add_run(self, iso, km, mins, secs, at_ms):
        d = self.days.setdefault(iso, {"w": []})
        d["w"].append({"part": "Run", "ex": "Run", "w": round(km, 2), "reps": [],
                       "mins": int(mins), "secs": int(secs), "at": at_ms})
        self.report["runs"] += 1

    def skip(self, lineno, why):
        self.report["skipped"].append({"line": lineno, "why": why})

    def note_mapping(self, ex, part, how):
        key = ex.strip()
        if how == "unmapped":
            self.report["unmapped"][key] = self.report["unmapped"].get(key, 0) + 1
        else:
            self.report["mappings"][key] = {"part": part, "how": how}

    def finish(self, settings=None):
        now = int(datetime.datetime.now().timestamp() * 1000)
        for d in self.days.values():
            d["upd"] = now
        ds = sorted(self.days)
        self.report["days"] = len(ds)
        if ds: self.report["first"], self.report["last"] = ds[0], ds[-1]
        doc = {"days": self.days, "settings": settings or {"unit": "kg"}}
        return {"app": "showup", "v": f"import-{self.source}",
                "exported": datetime.datetime.now().isoformat(), "doc": doc}

def bail_unmapped(builder, todo_path="mapping_todo.json"):
    """Unknown names stop the run. Guessing a body part corrupts an archive."""
    if not builder.report["unmapped"]:
        return False
    todo = {re.sub(r"\s+", " ", k.strip().lower()): "" for k in builder.report["unmapped"]}
    with open(todo_path, "w") as f:
        json.dump(todo, f, indent=2, sort_keys=True)
    sys.stderr.write(
        f"UNMAPPED: {len(todo)} exercise name(s) have no body part.\n"
        f"Wrote {todo_path} — fill each value with one of Chest/Back/Shoulder/"
        f"Legs/Biceps/Triceps/Sixpack/Run and re-run with -m {todo_path}\n")
    for k, n in sorted(builder.report["unmapped"].items()):
        sys.stderr.write(f"  {k}  ({n} rows)\n")
    return True

def emit(payload, out_path, report, show_report):
    text = json.dumps(payload, indent=1)
    if out_path in (None, "-"):
        sys.stdout.write(text)
    else:
        with open(out_path, "w") as f:
            f.write(text)
    if show_report:
        r = report
        sys.stderr.write(
            f"--- Conversion report ({r['source']}) ---\n"
            f"rows: {r['rows']}  sets: {r['sets']} (warmups {r['warmups']})  "
            f"runs: {r['runs']}  days: {r['days']}  span: {r['first']} \u2192 {r['last']}\n"
            f"skipped: {len(r['skipped'])}\n")
        for s in r["skipped"][:20]:
            sys.stderr.write(f"  line {s['line']}: {s['why']}\n")
        if len(r["skipped"]) > 20:
            sys.stderr.write(f"  ... {len(r['skipped'])-20} more\n")
