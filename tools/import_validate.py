#!/usr/bin/env python3
"""import_validate.py — preflight for any candidate ShowUp Backup JSON.

Run BEFORE handing a file to Restore. Every check below is a landmine this
codebase has already stepped on once, or a shape Restore assumes:

  E marker-rows     reps:[] non-run rows — the sheet-import scar (v3.3.61–63)
  E bad-day-key     day keys must be YYYY-MM-DD
  E future-day      a day after today inflates nothing but trust
  E set-shape       every entry needs part, ex, numeric w
  E run-shape       Run entries need km + mins/secs, empty reps
  E insane-weight   >500kg or negative
  E bad-bw          bodyweight outside 25–300kg
  W no-upd          restore re-stamps, but a standalone file should carry it
  W huge-day        >60 entries in one day usually means duplicated import
  W empty-day       a day object with no sets, no bw, no rest flag

Exit 0 = clean (warnings allowed with --strict off). Exit 1 = errors.
"""
import json, re, sys, argparse, datetime

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jsonfile")
    ap.add_argument("--strict", action="store_true", help="warnings fail too")
    a = ap.parse_args()

    j = json.load(open(a.jsonfile))
    doc = j.get("doc", j)
    errs, warns = [], []
    days = doc.get("days")
    if not isinstance(days, dict):
        print("E: no doc.days object \u2014 Restore will reject this file"); sys.exit(1)

    today = datetime.date.today().isoformat()
    total_sets = total_runs = 0
    for d in sorted(days):
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d):
            errs.append(f"bad-day-key: {d!r}"); continue
        if d > today:
            errs.append(f"future-day: {d}")
        v = days[d]
        w = v.get("w", [])
        if "upd" not in v:
            warns.append(f"no-upd: {d}")
        if not w and not v.get("bw") and not v.get("rest"):
            warns.append(f"empty-day: {d}")
        if len(w) > 60:
            warns.append(f"huge-day: {d} has {len(w)} entries \u2014 duplicated import?")
        for i, s in enumerate(w):
            tag = f"{d}[{i}]"
            if not s.get("part") or not s.get("ex"):
                errs.append(f"set-shape: {tag} missing part/ex"); continue
            if not isinstance(s.get("w"), (int, float)) or s["w"] < 0:
                errs.append(f"set-shape: {tag} weight {s.get('w')!r}"); continue
            if s["w"] > 500:
                errs.append(f"insane-weight: {tag} {s['w']}kg")
            reps = s.get("reps", None)
            if s.get("ex") == "Run" or s.get("part") == "Run":
                total_runs += 1
                if reps != []:
                    errs.append(f"run-shape: {tag} reps must be []")
                if not (s.get("mins", 0) or s.get("secs", 0) or s["w"] > 0):
                    errs.append(f"run-shape: {tag} has no distance and no time")
            else:
                total_sets += 1
                if not isinstance(reps, list) or not reps:
                    errs.append(f"marker-rows: {tag} reps:[] on a non-run \u2014 "
                                f"the v3.3.61 scar; refuse to create these")
                elif not all(isinstance(r, (int, float)) and r > 0 for r in reps):
                    errs.append(f"set-shape: {tag} non-positive rep in {reps}")
        bw = v.get("bw")
        if bw is not None and not (25 <= float(bw) <= 300):
            errs.append(f"bad-bw: {d} bw={bw}")

    ds = [d for d in sorted(days) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", d)]
    print(f"days: {len(ds)}  span: {ds[0] if ds else '-'} \u2192 {ds[-1] if ds else '-'}  "
          f"sets: {total_sets}  runs: {total_runs}")
    for e in errs:  print("E:", e)
    for w in warns: print("W:", w)
    if errs or (a.strict and warns):
        print(f"FAIL  ({len(errs)} errors, {len(warns)} warnings)"); sys.exit(1)
    print(f"OK  ({len(warns)} warnings)")

if __name__ == "__main__":
    main()
