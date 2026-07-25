#!/usr/bin/env python3
"""convert_hevy.py — Hevy app CSV → ShowUp Backup JSON.

Hevy's export header is documented and stable:
  title,start_time,end_time,description,exercise_title,superset_id,
  exercise_notes,set_index,set_type,weight_kg,reps,distance_km,
  duration_seconds,rpe

Known realities handled:
- start_time arrives as '22 Dec 2025, 08:00' in some exports and ISO in
  others. Both parse.
- weight is weight_kg; some exports also carry weight_lbs. kg wins; lbs
  converts only when kg is absent.
- set_type: 'normal' / 'warmup' / etc. Warm-ups are sets (days>volume).
- distance_km/duration_seconds with zero reps → Run entries.
- superset_id and rpe are read and dropped, REPORTED as dropped — ShowUp
  stores neither, and pretending to import them would be a lie.

Usage:
  python3 convert_hevy.py export.csv [-m mapping.json] [-o backup.json] [--report]
"""
import csv, io, json, re, sys, argparse, datetime
from importlib_showup import Builder, map_part, KG_PER_LB, bail_unmapped, emit

def parse_dt(s):
    s = (s or "").strip().strip('"')
    for fmt in ("%d %b %Y, %H:%M", "%d %b %Y %H:%M", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try: return datetime.datetime.strptime(s, fmt)
        except ValueError: pass
    s2 = re.sub(r"([+-]\d{2}):?(\d{2})$|Z$", "", s)
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
        try: return datetime.datetime.strptime(s2, fmt)
        except ValueError: pass
    raise ValueError(f"unparseable start_time: {s!r}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csvfile")
    ap.add_argument("-m", "--mapping")
    ap.add_argument("-o", "--output", default="-")
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()

    user_map = {}
    if a.mapping:
        user_map = {k.strip().lower(): v for k, v in json.load(open(a.mapping)).items() if v}

    rows = list(csv.DictReader(io.StringIO(open(a.csvfile, encoding="utf-8-sig").read())))
    b = Builder("hevy")
    dropped_rpe = dropped_ss = 0

    for i, row in enumerate(rows, start=2):
        b.report["rows"] += 1
        g = lambda k: (row.get(k) or "").strip()
        ex = g("exercise_title")
        if not ex or not g("start_time"):
            b.skip(i, "no exercise_title or start_time"); continue
        try: dt = parse_dt(g("start_time"))
        except ValueError as e: b.skip(i, str(e)); continue
        iso = dt.strftime("%Y-%m-%d"); at = int(dt.timestamp() * 1000)

        if g("rpe"): dropped_rpe += 1
        if g("superset_id"): dropped_ss += 1

        reps = int(float(g("reps"))) if g("reps") not in ("", "0") else 0
        dist = float(g("distance_km")) if g("distance_km") else 0.0
        secs = int(float(g("duration_seconds"))) if g("duration_seconds") else 0
        kg_s = g("weight_kg"); lb_s = g("weight_lbs")
        kg = round(float(kg_s), 2) if kg_s else (round(float(lb_s) * KG_PER_LB, 2) if lb_s else 0.0)

        part, how = map_part(ex, user_map)
        if part is None:
            b.note_mapping(ex, None, "unmapped"); continue
        b.note_mapping(ex, part, how)

        if part == "Run" or (reps == 0 and (dist > 0 or secs > 60)):
            if dist <= 0 and secs <= 0:
                b.skip(i, f"{ex}: cardio row with no distance or time"); continue
            b.add_run(iso, dist, secs // 60, secs % 60, at); continue
        if reps <= 0:
            b.skip(i, f"{ex}: no reps and no distance \u2014 would be a marker row"); continue
        if kg > 500:
            b.skip(i, f"{ex}: {kg}kg is not a weight a human lifted"); continue
        b.add_set(iso, ex, part, kg, reps, at, warmup=g("set_type") == "warmup")

    if bail_unmapped(b): sys.exit(2)
    payload = b.finish()
    if a.report and (dropped_rpe or dropped_ss):
        sys.stderr.write(f"dropped fields (ShowUp stores neither): "
                         f"rpe on {dropped_rpe} rows, superset_id on {dropped_ss} rows\n")
    emit(payload, a.output, b.report, a.report)

if __name__ == "__main__":
    main()
