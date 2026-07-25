#!/usr/bin/env python3
"""convert_strong.py — Strong app CSV → ShowUp Backup JSON.

Strong's CSV is the de-facto interchange format: Hevy imports it, and other
tools convert INTO it, so this one converter accepts a whole ecosystem.

Known quirks handled here (each one is documented reality, not caution):
- Delimiter: comma OR semicolon. Sniffed from the header line.
- Weight column may be 'Weight', 'Weight (kg)' or 'Weight (lbs)' — the unit
  can live in the HEADER. Header wins; else --unit; else kg.
- One row = one set. 'Set Order' may carry 'W' markers for warm-ups.
- Cardio rows carry Distance/Seconds with blank Reps → Run entries.
- Strong cannot re-import its own export; we can. Say so at launch.

Usage:
  python3 convert_strong.py export.csv [-m mapping.json] [-u kg|lb]
                            [-o backup.json] [--report]
"""
import csv, io, json, re, sys, argparse, datetime
from importlib_showup import Builder, map_part, to_kg, bail_unmapped, emit

def parse_dt(s):
    s = s.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try: return datetime.datetime.strptime(s, fmt)
        except ValueError: pass
    m = re.match(r"(\d{4}-\d{2}-\d{2})", s)
    if m: return datetime.datetime.strptime(m.group(1), "%Y-%m-%d")
    raise ValueError(f"unparseable date: {s!r}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csvfile")
    ap.add_argument("-m", "--mapping", help="user exercise→part JSON")
    ap.add_argument("-u", "--unit", choices=["kg", "lb"], help="weight unit if header doesn't say")
    ap.add_argument("-o", "--output", default="-")
    ap.add_argument("--report", action="store_true")
    a = ap.parse_args()

    user_map = {}
    if a.mapping:
        user_map = {k.strip().lower(): v for k, v in json.load(open(a.mapping)).items() if v}

    raw = open(a.csvfile, encoding="utf-8-sig").read()
    header_line = raw.splitlines()[0] if raw else ""
    delim = ";" if header_line.count(";") > header_line.count(",") else ","
    rows = list(csv.DictReader(io.StringIO(raw), delimiter=delim))

    # resolve columns case-insensitively; find the unit in the weight header
    def col(row, *names):
        for k in row:
            kk = k.strip().lower()
            for n in names:
                if kk == n or kk.startswith(n + " ("):
                    return row[k], k
        return None, None

    unit = a.unit or "kg"
    if rows:
        _, wkey = col(rows[0], "weight")
        if wkey and "lb" in wkey.lower(): unit = "lb"
        elif wkey and "kg" in wkey.lower(): unit = "kg"

    b = Builder("strong", unit)
    for i, row in enumerate(rows, start=2):
        b.report["rows"] += 1
        date_s, _ = col(row, "date")
        ex, _     = col(row, "exercise name")
        w_s, _    = col(row, "weight")
        reps_s, _ = col(row, "reps")
        dist_s, _ = col(row, "distance")
        secs_s, _ = col(row, "seconds")
        order_s, _= col(row, "set order")
        if not date_s or not (ex or "").strip():
            b.skip(i, "no date or exercise name"); continue
        try: dt = parse_dt(date_s)
        except ValueError as e: b.skip(i, str(e)); continue
        iso = dt.strftime("%Y-%m-%d"); at = int(dt.timestamp() * 1000)
        ex = ex.strip()
        reps = int(float(reps_s)) if (reps_s or "").strip() not in ("", "0") else 0
        dist = float(dist_s) if (dist_s or "").strip() else 0.0
        secs = int(float(secs_s)) if (secs_s or "").strip() else 0

        part, how = map_part(ex, user_map)
        if part is None:
            b.note_mapping(ex, None, "unmapped"); continue
        b.note_mapping(ex, part, how)

        if part == "Run" or (reps == 0 and (dist > 0 or secs > 0)):
            if dist <= 0 and secs <= 0:
                b.skip(i, f"{ex}: cardio row with no distance or time"); continue
            b.add_run(iso, dist, secs // 60, secs % 60, at); continue
        if reps <= 0:
            b.skip(i, f"{ex}: no reps and no distance \u2014 would be a marker row"); continue
        kg = to_kg(w_s, unit)
        if kg > 500: b.skip(i, f"{ex}: {kg}kg is not a weight a human lifted"); continue
        warm = "w" in (order_s or "").strip().lower()
        b.add_set(iso, ex, part, kg, reps, at, warmup=warm)

    if bail_unmapped(b): sys.exit(2)
    emit(b.finish(), a.output, b.report, a.report)

if __name__ == "__main__":
    main()
