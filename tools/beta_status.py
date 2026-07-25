#!/usr/bin/env python3
"""beta_status.py — who is actually using ShowUp, from data you already have.

NO APP CHANGES. NO TRACKING CODE. This reads two things that already exist:

  auth.users            created_at, last_sign_in_at   (Supabase Admin API)
  public.app_state      doc (the whole archive), updated_at

Everything below is derived. The app never learns it is being measured, and
no telemetry, event, or beacon was added to ship this.

THE ONE METRIC THAT MATTERS FOR A MIGRANT
-----------------------------------------
An imported archive can be 900 days long and mean nothing. What matters is
days logged AFTER the account existed \u2014 you cannot import a day that had not
happened yet, so any day dated on/after signup was logged by the person, in
the app, on purpose. That number is activation and retention in one.

  archive 928 / since-signup 0   \u2192 they looked at their history and left
  archive 928 / since-signup 11  \u2192 the product replaced their old habit

USAGE
  export SHOWUP_SUPABASE_URL="https://xxxx.supabase.co"
  export SHOWUP_SERVICE_KEY="<service_role key \u2014 NOT the anon key>"
  python3 beta_status.py
  python3 beta_status.py --json          # machine-readable
  python3 beta_status.py --fixture f.json  # offline, for tests

The service_role key bypasses row-level security by design. Keep it out of
the repo, out of the app, and out of chat logs.

DISCLOSURE
  These are people you recruited by hand. Tell them plainly: "I can see when
  your app last synced and how many days you've logged \u2014 not what you lifted,
  because I won't look." Then don't look. This tool prints aggregates only;
  it never prints an exercise, a weight, or a rep.
"""
import json, os, sys, argparse, datetime, urllib.request

def _get(url, key):
    rq = urllib.request.Request(url, headers={
        "apikey": key, "Authorization": "Bearer " + key, "Accept": "application/json"})
    with urllib.request.urlopen(rq, timeout=30) as r:
        return json.load(r)

def fetch_live(base, key):
    users = _get(base.rstrip("/") + "/auth/v1/admin/users?per_page=200", key)
    users = users.get("users", users) if isinstance(users, dict) else users
    rows = _get(base.rstrip("/") + "/rest/v1/app_state?select=user_id,doc,updated_at", key)
    return {"users": users, "app_state": rows}

def iso_date(s):
    return (s or "")[:10]

def analyse(users, rows, today=None):
    today = today or datetime.date.today().isoformat()
    by_id = {r.get("user_id"): r for r in rows}
    t = datetime.date.fromisoformat(today)
    d7, d14, d30 = (t - datetime.timedelta(days=n) for n in (7, 14, 30))
    out = []
    for u in users:
        uid = u.get("id") or u.get("user_id")
        row = by_id.get(uid) or {}
        doc = row.get("doc") or {}
        days = doc.get("days") or {}
        signup = iso_date(u.get("created_at"))
        # a day counts as TRAINED if it has at least one set; rest flags and
        # weigh-ins are day data but they are not showing up
        trained = sorted(k for k, v in days.items()
                         if isinstance(v, dict) and (v.get("w") or []))
        since = [k for k in trained if signup and k >= signup]
        rest_declared = sum(1 for v in days.values()
                            if isinstance(v, dict) and v.get("rest"))
        last7 = [k for k in since if k >= d7.isoformat()]
        last14 = [k for k in since if k >= d14.isoformat()]
        last30 = [k for k in since if k >= d30.isoformat()]
        # week-two gate: days logged in the 8th\u201314th day after signup
        w2 = []
        if signup:
            s = datetime.date.fromisoformat(signup)
            lo, hi = (s + datetime.timedelta(days=7)).isoformat(), (s + datetime.timedelta(days=14)).isoformat()
            w2 = [k for k in since if lo <= k <= hi]
        age = (t - datetime.date.fromisoformat(signup)).days if signup else None
        if not since:
            verdict = "NEVER LOGGED"
        elif last7:
            verdict = "ACTIVE"
        elif last14:
            verdict = "FADING"
        elif last30:
            verdict = "QUIET"
        else:
            verdict = "LOST"
        out.append({
            "email": u.get("email") or "(no email)",
            "signup": signup, "age_days": age,
            "last_sign_in": iso_date(u.get("last_sign_in_at")),
            "last_sync": iso_date(row.get("updated_at")),
            "archive_days": len(trained),
            "archive_first": trained[0] if trained else None,
            "since_signup": len(since),
            "last7": len(last7), "last14": len(last14), "last30": len(last30),
            "week2": len(w2),
            "rest_declared": rest_declared,
            "imported": bool(trained) and bool(signup) and trained[0] < signup,
            "verdict": verdict,
        })
    out.sort(key=lambda r: (r["verdict"] != "ACTIVE", -(r["since_signup"] or 0)))
    return out

def render(rows, today):
    if not rows:
        print("No users yet. Nobody has signed in.")
        return
    print(f"ShowUp \u2014 beta cohort as of {today}\n")
    hdr = f"{'who':<26}{'age':>4}{'arch':>6}{'own':>5}{'7d':>4}{'14d':>5}{'wk2':>5}  {'last sync':<11}verdict"
    print(hdr); print("-" * len(hdr))
    for r in rows:
        who = r["email"]
        who = who if len(who) <= 25 else who[:24] + "\u2026"
        arch = f"{r['archive_days']}{'*' if r['imported'] else ''}"
        print(f"{who:<26}{(r['age_days'] if r['age_days'] is not None else '-'):>4}"
              f"{arch:>6}{r['since_signup']:>5}{r['last7']:>4}{r['last14']:>5}{r['week2']:>5}  "
              f"{(r['last_sync'] or '-'):<11}{r['verdict']}")
    n = len(rows)
    act = sum(1 for r in rows if r["verdict"] == "ACTIVE")
    never = sum(1 for r in rows if r["verdict"] == "NEVER LOGGED")
    w2ok = sum(1 for r in rows if r["week2"] > 0)
    eligible = sum(1 for r in rows if (r["age_days"] or 0) >= 14)
    print(f"\n{n} user(s) \u00b7 {act} active this week \u00b7 {never} never logged a day")
    print(f"week-two gate: {w2ok}/{eligible} of those old enough logged in days 8\u201314")
    print("\n* = archive predates signup, i.e. history was imported."
          "\n'own' = days logged on/after signup \u2014 the only number that proves use."
          "\nNo exercise, weight, or rep is read by this tool.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixture", help="offline JSON {users:[],app_state:[]}")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--today", help="override today (tests)")
    a = ap.parse_args()
    if a.fixture:
        blob = json.load(open(a.fixture))
    else:
        base, key = os.environ.get("SHOWUP_SUPABASE_URL"), os.environ.get("SHOWUP_SERVICE_KEY")
        if not base or not key:
            sys.exit("Set SHOWUP_SUPABASE_URL and SHOWUP_SERVICE_KEY (service_role).")
        blob = fetch_live(base, key)
    today = a.today or datetime.date.today().isoformat()
    rows = analyse(blob.get("users", []), blob.get("app_state", []), today)
    if a.json:
        print(json.dumps({"as_of": today, "cohort": rows}, indent=1))
    else:
        render(rows, today)

if __name__ == "__main__":
    main()
