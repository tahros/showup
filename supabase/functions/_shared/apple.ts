// _shared/apple.ts — Sign in with Apple, server side (v4.6.145).
// Apple requires an app that offers Sign in with Apple to revoke the user's
// Apple tokens when they delete their account. Revoking needs a refresh token,
// and getting one needs a "client secret": a short-lived ES256 JWT signed with
// the key Apple issues to the developer account. Both functions that talk to
// Apple (apple-link, delete-account) build it here.
//
// Secrets (Supabase function secrets, pushed by deploy-fn.yml from the repo's
// GitHub secrets once they exist): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
// (the .p8 file's text) and optionally APPLE_CLIENT_ID (defaults to the bundle id).
// Until they exist, appleConfig() is null and both callers skip Apple quietly.

export const APPLE_CLIENT_ID = "co.yooooooooo.showup";

export function appleConfig(env) {
  const team = env("APPLE_TEAM_ID"), kid = env("APPLE_KEY_ID"), key = env("APPLE_PRIVATE_KEY");
  return team && kid && key ? { team, kid, key, client: env("APPLE_CLIENT_ID") || APPLE_CLIENT_ID } : null;
}

const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uText = (s) => b64u(new TextEncoder().encode(s));

export async function appleClientSecret(cfg, now = Date.now(), subtle = crypto.subtle) {
  const pem = cfg.key.replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const k = await subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const iat = Math.floor(now / 1000);
  const head = b64uText(JSON.stringify({ alg: "ES256", kid: cfg.kid, typ: "JWT" }));
  const body = b64uText(JSON.stringify({ iss: cfg.team, iat, exp: iat + 300, aud: "https://appleid.apple.com", sub: cfg.client }));
  const sig = new Uint8Array(await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, new TextEncoder().encode(head + "." + body)));
  return head + "." + body + "." + b64u(sig);
}

export function appleForm(net, url, fields) {
  return net(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
}
