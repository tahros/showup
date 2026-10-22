// v4.6.390 -- two additions to the session writer, kept in plain JavaScript so the node
// suite can import and drive them (tools/test-ai-analyze.js):
//
// 1. READING A ROUTINE. A person brings their routine to setup, pasted from their notes
//    or as an import (eight weeks summarised on the phone: dates, exercises, top sets).
//    The model reads it into days the app can plan from. Like the writer, this is trusted
//    for text, not truth: the phone keeps only catalog names, at most seven days and ten
//    exercises a day, and falls back to its own quick read if anything here fails.
//
// 2. THE DAILY AI ALLOWANCE. Every model call -- a written plan or a reading -- counts
//    against AI_DAILY per account (the token's user id), else per device (x-device, the
//    app's anonymous metrics id), else per network address, per New York day, each stored
//    only as a SHA-256 of itself. The count
//    lives in public.ai_usage through public.ai_use() (supabase-setup.sql, v4.6.390). If
//    that function is missing or the database does not answer, the call goes through:
//    the allowance protects the bill, it never locks everyone out.

export const AI_DAILY = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* who is asking: the signed-in user, else the device, else the address */
export function capKey(req) {
  const auth = req.headers.get("authorization") || "";
  const tok = auth.replace(/^Bearer\s+/i, "");
  try {
    const part = tok.split(".")[1];
    if (part) {
      const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4)));
      if (json && json.role === "authenticated" && typeof json.sub === "string" && UUID.test(json.sub)) return "u:" + json.sub;
    }
  } catch (_e) { /* not a user token */ }
  const dev = (req.headers.get("x-device") || "").trim();
  if (UUID.test(dev)) return "d:" + dev.toLowerCase();
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 64);
  return ip ? "ip:" + ip : null;
}

/* one use of today's allowance: {left, limit}, {over:true, limit}, or null (not counted) */
/* the key is stored scrambled (SHA-256): the count never holds a raw id or address */
export async function hashKey(key) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("showup-ai:" + key));
  return key.split(":")[0] + ":" + [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
export async function useAllowance(req, env, net, limit = AI_DAILY) {
  const raw = capKey(req), url = env("SUPABASE_URL"), service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!raw || !url || !service) return null;
  try {
    const key = await hashKey(raw);
    const r = await net(`${url}/rest/v1/rpc/ai_use`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: key, p_limit: limit }),
    });
    if (!r.ok) return null;
    const left = Number(await r.json());
    if (!Number.isFinite(left)) return null;
    return left < 0 ? { over: true, limit } : { left, limit };
  } catch (_e) { return null; }
}

export const ANALYZE_SYSTEM = `You read one person's strength-training routine so a training app can plan from it. You are careful and literal: you keep what the person does, in the order they do it, and you invent nothing.

INPUT is either PASTE (the routine as the person keeps it in their notes: day headings, exercises, sets, rest days, sometimes messy lines) or IMPORT (eight weeks of their logged workouts, one line per workout: the date, then each exercise with its top set).

OUTPUT strictly this JSON and nothing else:
{"sessions":[{"name":"<short day name or empty>","rest":false,"exercises":[{"ex":"<catalog name>","sets":"<set line>"}]}],"days_per_week":<2-7>,"notes":["<anything you could not place>"]}

NAMES: every "ex" must be spelled exactly as a name in the catalog. Match the person's words to the nearest catalog exercise (Bench, BB bench, flat bench -> the barbell bench press in the catalog). If nothing in the catalog fits, leave it out and put the person's words in notes.

SET LINES: "WEIGHT UNIT × reps reps reps" in the unit given (185 lb × 5 5 5), "BW × 8 8 8" for bodyweight, "by feel × 10 10 10" when no weight was given. "3x12" means 3 sets of 12; "4 sets of 10" means 4 sets of 10.

PASTE: keep the person's days in their order, one session per day they wrote. A day called Rest, Off or Recovery is {"rest":true,"exercises":[]} in its place. "name" is the person's own day name when it says what the day is (Push, Pull, Legs, Upper, Arms); leave it empty for Day 1, Monday and the like. A line like "did some calves" belongs to the day it was written under. days_per_week is the number of training days they wrote.

IMPORT: find the split they actually follow: which body parts they train together, and in what order. List each distinct session once, in order, starting with the session that comes next after their most recent workout. For each session give the exercises they do most often in it (at most six), in their usual order, each with the top set from the most recent time they did it. days_per_week is how many days a week they typically trained over the eight weeks. Never more than seven sessions; never more than ten exercises a session.`;

/* the person's input, as the model reads it */
export function analyzeUser(payload) {
  const head = `Unit: ${payload.unit === "lb" ? "lb" : "kg"}. Goal: ${String(payload.objective || "grow").slice(0, 20)}. Today: ${String(payload.today || "").slice(0, 10)}.\ncatalog: ${JSON.stringify(payload.catalog || {}).slice(0, 20000)}\n`;
  if (payload.source === "paste") return head + "PASTE:\n" + String(payload.text || "").slice(0, 8000);
  const lines = (Array.isArray(payload.workouts) ? payload.workouts : []).slice(-60).map((w) =>
    String(w && w.d || "").slice(0, 10) + " | " + (Array.isArray(w && w.ex) ? w.ex : []).slice(0, 14)
      .map((e) => `${String(e[0]).slice(0, 60)} @ ${Number(e[1]) || 0} × ${Number(e[2]) || 0}`).join("; "));
  return head + "IMPORT:\n" + lines.join("\n");
}

export function analyzeOk(payload) {
  if (!payload || payload.action !== "analyze" || payload.v !== 1) return false;
  if (payload.source === "paste") return typeof payload.text === "string" && payload.text.trim().length > 0 && payload.text.length <= 8000;
  if (payload.source === "import") return Array.isArray(payload.workouts) && payload.workouts.length > 0 && payload.workouts.length <= 60;
  return false;
}

/* the model's answer, shape only (the phone checks the content again) */
export function readAnalysis(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  let out = null;
  try { out = JSON.parse(m ? m[0] : text); } catch (_e) { return null; }
  if (!out || !Array.isArray(out.sessions)) return null;
  const sessions = out.sessions.slice(0, 7).map((s) => s && s.rest ? { rest: true, exercises: [] } : {
    name: String(s && s.name || "").slice(0, 24), rest: false,
    exercises: (Array.isArray(s && s.exercises) ? s.exercises : []).slice(0, 10)
      .filter((e) => e && typeof e.ex === "string" && e.ex.trim())
      .map((e) => ({ ex: e.ex.trim().slice(0, 60), sets: String(e.sets || "").slice(0, 60) })),
  });
  if (!sessions.some((s) => !s.rest && s.exercises.length)) return null;
  const d = Math.round(Number(out.days_per_week) || 0);
  return { sessions, days_per_week: d >= 2 && d <= 7 ? d : null,
    notes: (Array.isArray(out.notes) ? out.notes : []).slice(0, 8).map((n) => String(n).slice(0, 120)) };
}
