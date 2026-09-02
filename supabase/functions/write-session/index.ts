// write-session — ShowUp's session writer (v3.3.401; prompt revised v3.3.402, v3.3.405).
// The ONLY server component ShowUp has. It exists because a PWA cannot hold a
// model key. It does one thing: takes the payload js/writer.js builds (eight
// weeks of sets, the catalog, the rotation's ranking, the coverage table, the
// objective, the note, the days), asks the model for a session in the maker's
// own paste format, and returns JSON the app reads exactly as it reads a
// paste. It stores nothing, logs nothing about the person, and every claim in
// its answer is bounded again on the device by writerCheck() before anyone
// sees it -- this function is trusted for text, not for truth.
//
// Deploy:  supabase functions deploy write-session --project-ref <ref>
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <ref>
//          (and ANTHROPIC_WORKSPACE_ID=wrkspc_... if the key is identity-linked)
// The gateway verifies the Supabase JWT (the app's anon key or a signed-in
// user's token) before this code runs.

const MODEL = Deno.env.get("WRITER_MODEL") || "claude-sonnet-4-5";
const MAX_BODY = 120_000;
const ORIGINS = ["https://tahros.github.io", "http://localhost:8898", "http://localhost:8899", "http://localhost:8080"];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.some(o => origin.startsWith(o)) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
});

const SYSTEM = `You write one strength-training session, or a week of them, for one person, from their own training record. You are a careful coach who reads the record first and writes in the person's own format. Output JSON only.

FORMAT (the person's own paste format; the app parses it, so be exact):
Each exercise is a heading line, then one or more indented set lines:
Exercise Name
  215 lb × 5 5 5 5
  135 lb × 5            (warm-up)
Rules for set lines: "WEIGHT UNIT × reps reps reps" with the unit the payload gives; a bodyweight exercise is "BW × 8 8 6" and a belt is "BW +10 × 8 8"; a load you do not want to name is "by feel × 12 12"; a load for an exercise the person has NEVER lifted in the record is a guess and MUST be written with a leading ≈, e.g. "≈15 lb × 15 15 12"; a timed hold is "BW × 60 sec × 3". Never write reps as ranges. Never write anything after the reps except a short parenthesised note. One blank line between exercises. No headings inside a day's text, no bullets, no numbering, no markdown.

NAMES: use ONLY exercise names from the catalog in the payload, spelled exactly. Never invent a movement. If the person's note asks for something not in the catalog, choose the nearest catalog name.

THE PART: the payload's rotation.pick is what the app's own rotation would train next; rotation.ranking lists every part with days since its last full session and its usual gap. If payload.part is set, write for that part and do not argue. If payload.part is null, you decide: usually the rotation's pick, but you may choose differently for a reason you state — the objective, the note (a sore shoulder, no barbell, 45 minutes), or a part that is far past its gap. When your part differs from rotation.pick you MUST give reason: {head:"<Part>, not <rotation.pick>", text:"one or two sentences, in the second person, naming the numbers"}. Otherwise reason is null.

LOADS: payload.best gives each exercise's heaviest working load in the last eight weeks, in kg. For an exercise that appears in best, no load may exceed that number by more than band (converted to the payload unit) — progress by one small step, hold, or back off; never leap. Lighter loads are free and expected: write warm-up lines under the working sets when the record shows the person warms up, and back-off or drop sets where they help. For an exercise NOT in best, mark every load ≈ or write by feel.

REGIONS: payload.heads groups every catalog exercise by the muscle head it trains. These are not interchangeable. upper-chest and chest are different heads; lats and upper-back are different; front-, side- and rear-delts are three. A session has an EMPHASIS, and its first two exercises must come from that emphasis's head. Never put another head's signature movement into a day named for one: a Dip is sternal chest and has no place in an incline session, a Lateral Raise is not rear-delt work, a Lat Pulldown is not a row. Accessories later in the session may come from a neighbouring head.

SHAPES: the history is a record of DAYS. Group it by date before you write anything and read how this person actually trains: which exercises appear together, in what order, how often a part comes round, and whether a part has more than one shape — an incline chest day and a flat chest day are two different sessions and each keeps its own movements. Reuse those shapes rather than inventing one. Order exercises the way the record orders them: heaviest compound first, accessories after, core last. When a part has two shapes and the week has room for both, alternate them.

TITLES: name a day the way the record names it if it has a name, otherwise "<Part> + <Part>". When a part has more than one shape, put the variant in brackets so the two can be told apart: "Chest A (incline) + Core", "Chest B (flat) + Laterals + Core".

VARIETY: payload.coverage lists, per part, the sets logged in eight weeks for each muscle head; a head at 0 has had nothing. For the part you write, cover every 0 head with one catalog exercise from THAT head (the app tags these NEW). At most new_max such new exercises per session; the rest of the session is the person's own movements, from history. Do not pad. A movement with no history and no comparable lift to scale from is written "by feel", never with a ≈ number — an invented figure is worse than no figure.

CORE: if the record shows core riding along with other work, use the core movements the record actually uses and vary them across the week; do not repeat one movement every day when the record shows a pair.

OBJECTIVE: grow = 8–12 reps, 3–4 working sets, one progression per session where a load has held for two sessions; lose = 12–15 reps, shorter sessions, supersets are fine, keep the big lifts; strength = 3–6 reps on the main lift with warm-up lines, then 6–10 on accessories; keep = repeat the last session's shape with tiny changes.

SIZE: 4–7 exercises for a day. Core work may ride along on most days as one or two short exercises if the record shows the person does that.

A WEEK: payload.days lists the dates to write, exactly; write one session per listed date and none for any other date. Balance parts across the days from the ranking; payload.focus parts get two sessions if there are enough days; no part on two consecutive days except core. Give each day a short title like "Back + Biceps" or "Chest A (incline) + Core".

OUTPUT: strictly this JSON and nothing else:
{"days":[{"date":"YYYY-MM-DD","part":"<catalog part>","title":"<short title>","text":"<the session in the format above>"}],"reason":null | {"head":"...","text":"..."}}`;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const H = cors(origin);
  if (req.method === "OPTIONS") return new Response("ok", { headers: H });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: H });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "no model key on the server" }), { status: 500, headers: H });

  const raw = await req.text();
  if (raw.length > MAX_BODY) return new Response(JSON.stringify({ error: "payload too large" }), { status: 413, headers: H });
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers: H }); }
  if (!payload || payload.v !== 1 || !Array.isArray(payload.days) || !payload.days.length)
    return new Response(JSON.stringify({ error: "bad payload" }), { status: 400, headers: H });

  const user = `Today is ${payload.date}. Unit: ${payload.unit}. Scope: ${payload.scope}. Days to write: ${payload.days.join(", ")}.
Part: ${payload.part || "your call"}. Objective: ${payload.objective}. Focus parts (week only): ${(payload.focus || []).join(", ") || "none"}.
Note from the person: ${payload.note ? JSON.stringify(payload.note) : "none"}.
band: ${payload.band}. new_max: ${payload.new_max}.

rotation: ${JSON.stringify(payload.rotation)}
catalog: ${JSON.stringify(payload.catalog)}
heads (which muscle head each catalog exercise trains): ${JSON.stringify(payload.heads || {})}
best (kg): ${JSON.stringify(payload.best || {})}
coverage (sets per muscle head, eight weeks): ${JSON.stringify(payload.coverage)}
history (date, part, exercise, kg, reps, hold?) — eight weeks:
${(payload.history || []).map((h: any[]) => h.join("|")).join("\n")}`;

  const body = {
    model: MODEL, max_tokens: 2500, temperature: 0.4,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  };
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20_000);
  let text = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctl.signal,
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json",
        // an identity-linked key must name its workspace; a plain key needs nothing
        ...(Deno.env.get("ANTHROPIC_WORKSPACE_ID") ? { "anthropic-workspace-id": Deno.env.get("ANTHROPIC_WORKSPACE_ID")! } : {}) },
      body: JSON.stringify(body),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: "model " + r.status }), { status: 502, headers: H });
    const j = await r.json();
    text = (j.content || []).map((c: any) => c.text || "").join("");
  } catch (e) {
    return new Response(JSON.stringify({ error: "model unreachable" }), { status: 504, headers: H });
  } finally { clearTimeout(t); }

  // the model was told JSON only; tolerate a fence or a preamble anyway
  const m = text.match(/\{[\s\S]*\}/);
  let out: any = null;
  try { out = JSON.parse(m ? m[0] : text); } catch { /* fall through */ }
  if (!out || !Array.isArray(out.days)) return new Response(JSON.stringify({ error: "unreadable answer" }), { status: 502, headers: H });
  // shape only; every content rule is re-checked on the device
  out = {
    days: out.days.filter((d: any) => d && d.date && typeof d.text === "string").map((d: any) => ({
      date: String(d.date).slice(0, 10), part: d.part ? String(d.part).slice(0, 20) : null,
      title: d.title ? String(d.title).slice(0, 60) : "", text: String(d.text).slice(0, 4000),
    })),
    reason: out.reason && out.reason.text ? { head: String(out.reason.head || "").slice(0, 60), text: String(out.reason.text).slice(0, 300) } : null,
  };
  return new Response(JSON.stringify(out), { headers: H });
});
