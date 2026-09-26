// apple-link — keeps Apple's refresh token for a Sign in with Apple account (v4.6.145).
//
// Why: Apple requires revoking a user's Apple tokens when they delete their
// account (delete-account does it). Revoking needs a refresh token, which only
// exists after exchanging the one-time authorization code the app receives at
// sign-in. The app sends that code here right after signing in.
//
// Rules: the caller must be a signed-in user (their own token, asked of
// Supabase Auth; the anon key is not a user); the row is keyed by THAT user,
// never by anything in the body; the token is stored in public.apple_tokens,
// which has row-level security and no policies, so only the service role can
// read it; it cascades away with the account. Without the Apple secrets
// (_shared/apple.ts) it stores nothing and says so.

import { appleConfig, appleClientSecret, appleForm } from "../_shared/apple.ts";

const ORIGINS = ["https://tahros.github.io", "capacitor://localhost",
  "http://localhost:8898", "http://localhost:8899", "http://localhost:8080"];
const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.some(o => origin.startsWith(o)) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
});

export async function handle(req, env = (k) => Deno.env.get(k), net = fetch, now = Date.now()) {
  const h = cors(req.headers.get("origin"));
  const out = (status, body) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out(405, { error: "method" });
  const url = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY"), service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return out(500, { error: "not-configured" });

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token === anon) return out(401, { error: "not-a-user" });
  let body = null;
  try { body = await req.json(); } catch (_e) { /* below */ }
  const code = typeof body?.code === "string" && /^[A-Za-z0-9._-]{10,1000}$/.test(body.code) ? body.code : null;
  if (!code) return out(400, { error: "code" });

  let uid = null;
  try {
    const r = await net(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (r.ok) { const u = await r.json(); uid = typeof u?.id === "string" && /^[0-9a-f-]{36}$/i.test(u.id) ? u.id : null; }
  } catch (_e) { return out(502, { error: "auth-unreachable" }); }
  if (!uid) return out(401, { error: "not-a-user" });

  const cfg = appleConfig(env);
  if (!cfg) return out(200, { stored: false, reason: "not-configured" });

  let refresh = null;
  try {
    const r = await appleForm(net, "https://appleid.apple.com/auth/token", {
      client_id: cfg.client, client_secret: await appleClientSecret(cfg, now), code, grant_type: "authorization_code",
    });
    const j = r.ok ? await r.json() : null;
    refresh = typeof j?.refresh_token === "string" ? j.refresh_token : null;
    if (!refresh) { console.log("apple-link: exchange refused", r.status); return out(502, { stored: false, error: "exchange" }); }
  } catch (_e) { return out(502, { stored: false, error: "apple-unreachable" }); }

  try {
    const r = await net(`${url}/rest/v1/apple_tokens`, {
      method: "POST",
      headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: uid, refresh_token: refresh, updated_at: new Date(now).toISOString() }),
    });
    if (!r.ok) return out(502, { stored: false, error: "store" });
  } catch (_e) { return out(502, { stored: false, error: "store" }); }
  return out(200, { stored: true });
}

if (typeof Deno !== "undefined" && Deno.serve) Deno.serve((req) => handle(req));
