// track — receives ShowUp's anonymous usage counts (v4.6.142, runbook 9.5).
//
// What arrives: a batch of at most 50 events from one device,
//   {device_id, platform, app_version, ref, events:[{name, at, day_n?}]}
// What is stored (public.events, see supabase-setup.sql): exactly those fields,
// plus the account id when the caller's token belongs to a signed-in user.
// Nothing else survives clean(): a field this function does not name is never
// written, so no weight, rep, exercise, plan or email can reach the table even
// if a client sent one.
//
// Rules:
//   - names outside CLIENT_NAMES are dropped (subscribed/cancelled are written
//     by the payment webhook, never by a client);
//   - a malformed device id, platform or version rejects the whole batch (400);
//   - at most LIMIT_PER_HOUR events per device per hour; the rest are dropped
//     and the reply is 429 once the device is at the limit;
//   - the account id comes from the caller's own token (asked of Supabase
//     Auth), never from the body. The anon key is not a user.
//
// Deployed by .github/workflows/deploy-fn.yml. No secrets of its own.

const ORIGINS = ["https://tahros.github.io", "capacitor://localhost",
  "http://localhost:8898", "http://localhost:8899", "http://localhost:8080"];

export const CLIENT_NAMES = ["open", "first_set", "day_logged", "paywall_seen", "export", "plan_written"];
export const REFS = ["hn", "gn", "dq", "li", "ig", "tt", "yt", "ph", "rd", "th", "as"];
export const LIMIT_PER_HOUR = 60, MAX_BATCH = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.some(o => origin.startsWith(o)) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
});

/* The whole trust boundary. Pure, so the tests drive it directly. */
export function clean(body, now = Date.now()) {
  if (!body || typeof body !== "object") return { error: "body" };
  const device_id = typeof body.device_id === "string" && UUID.test(body.device_id) ? body.device_id.toLowerCase() : null;
  if (!device_id) return { error: "device" };
  const platform = body.platform === "ios" || body.platform === "web" ? body.platform : null;
  if (!platform) return { error: "platform" };
  const v = typeof body.app_version === "string" ? body.app_version.replace(/^v/, "") : "";
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,4}$/.test(v)) return { error: "version" };
  const ref = REFS.includes(body.ref) ? body.ref : null;
  const list = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
  let dropped = (Array.isArray(body.events) ? body.events.length : 0) - list.length;
  const rows = [];
  for (const e of list) {
    if (!e || !CLIENT_NAMES.includes(e.name)) { dropped++; continue; }
    let at = Number(e.at);
    if (!Number.isFinite(at) || at > now + 5 * 60e3 || at < now - 7 * 864e5) at = now;   // a wrong clock is not a reason to lose the count
    const n = Number(e.day_n);
    const day_n = e.name === "day_logged" && Number.isInteger(n) && n >= 1 && n <= 100000 ? n : null;
    if (e.name === "day_logged" && day_n === null) { dropped++; continue; }
    rows.push({ device_id, name: e.name, day_n, ref, platform, app_version: v, at: new Date(at).toISOString() });
  }
  return { rows, dropped };
}

export async function handle(req, env = (k) => Deno.env.get(k), net = fetch, now = Date.now()) {
  const h = cors(req.headers.get("origin"));
  const out = (status, body) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out(405, { error: "method" });

  const url = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY"), service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return out(500, { error: "not-configured" });

  let body = null;
  try { body = await req.json(); } catch (_e) { /* handled by clean */ }
  const c = clean(body, now);
  if (c.error) return out(400, { error: c.error });
  if (!c.rows.length) return out(200, { accepted: 0, dropped: c.dropped });

  // who, if anyone: from the caller's own token
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  let uid = null;
  if (token && token !== anon) {
    try {
      const r = await net(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
      if (r.ok) { const u = await r.json(); uid = typeof u?.id === "string" && UUID.test(u.id) ? u.id : null; }
    } catch (_e) { /* counted anonymously */ }
  }

  const admin = { apikey: service, Authorization: `Bearer ${service}` };
  const device = c.rows[0].device_id;

  // the hourly limit, per device
  let used = 0;
  try {
    const since = new Date(now - 3600e3).toISOString();
    const r = await net(`${url}/rest/v1/events?device_id=eq.${device}&at=gte.${encodeURIComponent(since)}&select=id`,
      { headers: { ...admin, Prefer: "count=exact", Range: "0-0" } });
    const m = /\/(\d+)$/.exec(r.headers?.get?.("content-range") || "");
    used = m ? +m[1] : 0;
  } catch (_e) { return out(502, { error: "db-unreachable" }); }
  const room = Math.max(0, LIMIT_PER_HOUR - used);
  if (!room) return out(429, { accepted: 0, dropped: c.rows.length + c.dropped });
  const rows = c.rows.slice(0, room).map(r => ({ ...r, user_id: uid }));

  try {
    const r = await net(`${url}/rest/v1/events`, {
      method: "POST", headers: { ...admin, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(rows),
    });
    if (!r.ok) { console.log("track: insert failed", r.status); return out(502, { error: "insert-failed" }); }
  } catch (_e) { return out(502, { error: "insert-failed" }); }
  return out(200, { accepted: rows.length, dropped: c.dropped + (c.rows.length - rows.length) });
}

if (typeof Deno !== "undefined" && Deno.serve) Deno.serve((req) => handle(req));
