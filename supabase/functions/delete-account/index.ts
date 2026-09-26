// delete-account — erases a ShowUp account and everything synced under it (v4.6.113).
//
// Why it exists: App Store guideline 5.1.1(v) requires any app that creates
// accounts to let the person delete the account, and its data, from inside
// the app. Signing out is not deletion. The browser's key cannot delete a
// user (only the service role can), so this is necessarily server code.
//
// What it does, in order:
//   1. Asks Supabase Auth who the caller is, using the caller's OWN access
//      token. The user id to delete comes from that answer and nowhere else --
//      never from the request body -- so a caller can only ever delete itself.
//      The anon key alone passes the gateway's JWT check, but it is not a
//      user, so it is refused here.
//   2. Requires {"confirm":"DELETE"} in the body, so a stray call cannot do it.
//   3. Deletes the auth user with the service role. app_state and profiles
//      reference auth.users ON DELETE CASCADE (supabase-setup.sql), so the
//      rows go in the same database transaction: either everything is gone or
//      nothing is. There is no half-deleted state to report.
//   4. Checks that no app_state row is left, and deletes it outright if one
//      somehow is (a table created without the cascade, say).
// It stores nothing and logs no personal data: only the outcome and status.
//
// Deploy:  supabase functions deploy delete-account --project-ref <ref>
// No secrets to set: SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provided to every function by Supabase.

import { appleConfig, appleClientSecret, appleForm } from "../_shared/apple.ts";

const ORIGINS = ["https://tahros.github.io", "capacitor://localhost",
  "http://localhost:8898", "http://localhost:8899", "http://localhost:8080"];

const cors = (origin) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.some(o => origin.startsWith(o)) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
});

export async function handle(req, env = (k) => Deno.env.get(k), net = fetch) {
  const h = cors(req.headers.get("origin"));
  const out = (status, body) => new Response(JSON.stringify(body), { status, headers: h });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return out(405, { error: "method" });

  const url = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY"), service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return out(500, { error: "not-configured" });

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return out(401, { error: "no-token" });

  let body = null;
  try { body = await req.json(); } catch (_e) { /* handled below */ }
  if (!body || body.confirm !== "DELETE") return out(400, { error: "not-confirmed" });

  // 1. who is calling -- from their own token
  let uid = null;
  try {
    const r = await net(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
    if (r.ok) { const u = await r.json(); uid = typeof u?.id === "string" ? u.id : null; }
  } catch (_e) { return out(502, { error: "auth-unreachable" }); }
  if (!uid || !/^[0-9a-f-]{36}$/i.test(uid)) return out(401, { error: "not-a-user" });

  const admin = { apikey: service, Authorization: `Bearer ${service}` };

  // 2b. (v4.6.145) Sign in with Apple: Apple requires its tokens be revoked when
  //     the account is deleted. Only when the Apple secrets exist; a failure here
  //     does not stop the deletion (the account is what the person asked to erase).
  const apple = appleConfig(env);
  if (apple) {
    try {
      const r = await net(`${url}/rest/v1/apple_tokens?user_id=eq.${uid}&select=refresh_token`, { headers: admin });
      const rows = r.ok ? await r.json() : [];
      const rt = Array.isArray(rows) && typeof rows[0]?.refresh_token === "string" ? rows[0].refresh_token : null;
      if (rt) {
        const v = await appleForm(net, "https://appleid.apple.com/auth/revoke", {
          client_id: apple.client, client_secret: await appleClientSecret(apple), token: rt, token_type_hint: "refresh_token" });
        console.log("delete-account: apple revoke", v.status);
      }
    } catch (_e) { console.log("delete-account: apple revoke failed"); }
  }

  // 3. the account, and by cascade its rows, in one transaction
  try {
    const r = await net(`${url}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    if (!r.ok && r.status !== 404) { console.log("delete-account: auth delete failed", r.status); return out(502, { error: "delete-failed" }); }
  } catch (_e) { return out(502, { error: "delete-failed" }); }

  // 4. belt and braces: nothing of theirs may remain in app_state
  try {
    const q = `${url}/rest/v1/app_state?user_id=eq.${uid}`;
    const left = await net(q + "&select=user_id", { headers: admin });
    const rows = left.ok ? await left.json() : [];
    if (Array.isArray(rows) && rows.length) await net(q, { method: "DELETE", headers: admin });
  } catch (_e) { /* the account itself is gone; the cascade is the primary guarantee */ }

  console.log("delete-account: ok");
  return out(200, { deleted: true });
}

if (typeof Deno !== "undefined" && Deno.serve) Deno.serve((req) => handle(req));
