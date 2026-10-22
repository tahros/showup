// revenuecat-webhook — RevenueCat tells ShowUppp what happened to a membership
// (v4.6.385, runbook 9.8, spec 3.1 / 3.3 / 4.2).
//
// RevenueCat is the source of truth for who is a member; the app reads it from
// RevenueCat directly. This function keeps two things on our side, for the
// owner's dashboard:
//   - public.entitlements: one row per ShowUppp account that bought, with its
//     status, plan and period end (only when RevenueCat's app user id IS an
//     account id -- the app logs in with it; anonymous buyers have no row until
//     they sign in and RevenueCat sends the next event under the account);
//   - public.events: subscribed (a first purchase) and cancelled (auto-renew
//     turned off), the two events track refuses from clients. The device id is
//     the anonymous one metrics.js already sends (subscriber attribute
//     showup_device), so a purchase joins the funnel of the device that made it.
// Sandbox (TestFlight) purchases update entitlements with sandbox = true and
// never reach events: test buys must not count as members.
//
// Trust: RevenueCat sends the Authorization header configured in its dashboard
// (Integrations -> Webhooks). It must equal REVENUECAT_WEBHOOK_AUTH, a secret
// pushed by deploy-fn.yml from the repo's secrets. No secret, no writes (503).
// Replies 200 for anything handled or deliberately ignored (RevenueCat retries
// anything else), 401 for a wrong header, 5xx only when the database failed.
//
// Deployed by .github/workflows/deploy-fn.yml. Server-to-server: no browser
// calls it, but the CORS list matches the others so a stray preflight answers.

const ORIGINS = ["https://tahros.github.io", "capacitor://localhost"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PRODUCTS = {
  "co.yooooooooo.showup.member.yearly": "yearly",
  "co.yooooooooo.showup.member.monthly": "monthly",
};
export const STATUS = {
  INITIAL_PURCHASE: "active", RENEWAL: "active", UNCANCELLATION: "active",
  PRODUCT_CHANGE: "active", SUBSCRIPTION_EXTENDED: "active", TEMPORARY_ENTITLEMENT_GRANT: "active",
  CANCELLATION: "cancelled", BILLING_ISSUE: "grace", EXPIRATION: "expired",
};
const EVENT = { INITIAL_PURCHASE: "subscribed", CANCELLATION: "cancelled" };

const headers = (origin) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.some(o => origin.startsWith(o)) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
});

/* equal strings, compared without stopping at the first difference */
export function same(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !b) return false;
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

/* a stable uuid for a purchase that arrived without a device id */
async function uuidFrom(text) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  h[6] = (h[6] & 0x0f) | 0x40; h[8] = (h[8] & 0x3f) | 0x80;
  const x = [...h.slice(0, 16)].map(b => b.toString(16).padStart(2, "0")).join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

/* The whole reading of RevenueCat's event. Pure, so the tests drive it directly. */
export function read(body) {
  const e = body && typeof body === "object" ? body.event : null;
  if (!e || typeof e.type !== "string") return { error: "body" };
  const status = STATUS[e.type] || null;
  const ids = [e.app_user_id, e.original_app_user_id, ...(Array.isArray(e.aliases) ? e.aliases : [])]
    .filter(x => typeof x === "string" && UUID.test(x)).map(x => x.toLowerCase());
  const user_id = ids[0] || null;
  const plan = PRODUCTS[e.product_id] || null;
  const end = Number(e.expiration_at_ms);
  const attr = e.subscriber_attributes || {};
  const dev = attr.showup_device?.value;
  const ver = String(attr.showup_version?.value || "").replace(/^v/, "");
  return {
    type: e.type, status, user_id, plan,
    current_period_end: Number.isFinite(end) && end > 0 ? new Date(end).toISOString() : null,
    sandbox: e.environment === "SANDBOX",
    external_id: typeof e.original_app_user_id === "string" ? e.original_app_user_id.slice(0, 200) : null,
    event: EVENT[e.type] || null,
    device_id: typeof dev === "string" && UUID.test(dev) ? dev.toLowerCase() : null,
    app_version: /^\d{1,3}\.\d{1,3}\.\d{1,4}$/.test(ver) ? ver : "0.0.0",
    at: Number.isFinite(Number(e.event_timestamp_ms)) ? new Date(Number(e.event_timestamp_ms)).toISOString() : new Date().toISOString(),
    key: String(e.transaction_id || e.original_transaction_id || e.id || ""),
  };
}

export async function handle(req, env = (k) => Deno.env.get(k), net = fetch) {
  const h = headers(req.headers.get("origin"));
  const out = (status, body) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out(405, { error: "method" });

  const secret = env("REVENUECAT_WEBHOOK_AUTH");
  const url = env("SUPABASE_URL"), service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !url || !service) return out(503, { error: "not-configured" });
  const auth = req.headers.get("authorization") || "";
  if (!same(auth, secret) && !same(auth, `Bearer ${secret}`)) return out(401, { error: "auth" });

  let body = null;
  try { body = await req.json(); } catch (_e) { /* handled by read */ }
  const r = read(body);
  if (r.error) return out(400, { error: r.error });
  if (!r.status && !r.event) return out(200, { ignored: r.type });

  const admin = { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
  const did = [];

  if (r.status && r.user_id) {
    const row = { user_id: r.user_id, status: r.status, source: "apple", plan: r.plan,
      current_period_end: r.current_period_end, external_id: r.external_id, sandbox: r.sandbox,
      updated_at: new Date().toISOString() };
    try {
      const res = await net(`${url}/rest/v1/entitlements?on_conflict=user_id`, {
        method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(row) });
      if (res.ok) did.push("entitlement");
      else if (res.status === 409 || res.status === 400) did.push("no-account");   // an id that is not (or no longer) an account
      else return out(502, { error: "entitlement-failed" });
    } catch (_e) { return out(502, { error: "entitlement-failed" }); }
  }

  if (r.event && !r.sandbox) {
    const device_id = r.device_id || await uuidFrom("rc:" + (r.external_id || r.key || r.at));
    const ev = { device_id, user_id: r.user_id, name: r.event, day_n: null, ref: null, platform: "ios",
      app_version: r.app_version, at: r.at };
    try {
      const res = await net(`${url}/rest/v1/events`, {
        method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(ev) });
      if (res.ok) did.push(r.event);
      else if (res.status === 409 || res.status === 400) { ev.user_id = null;   // the account went away; keep the count
        const again = await net(`${url}/rest/v1/events`, { method: "POST", headers: { ...admin, Prefer: "return=minimal" }, body: JSON.stringify(ev) });
        if (!again.ok) return out(502, { error: "event-failed" }); did.push(r.event); }
      else return out(502, { error: "event-failed" });
    } catch (_e) { return out(502, { error: "event-failed" }); }
  }
  return out(200, { type: r.type, did });
}

if (typeof Deno !== "undefined" && Deno.serve) Deno.serve((req) => handle(req));
