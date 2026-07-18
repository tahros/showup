# ShowUp — install

## The short version (for friends)

You don't install anything.

1. Open **https://tahros.github.io/showup** on your phone
2. **Sign in with Google** — your log is yours, private, synced
3. Answer three screens (what you train, your units) — 30 seconds
4. Add to Home Screen (Share → *Add to Home Screen* on iPhone,
   menu → *Install app* on Android)
5. Log one set. That's day one.

Not sure yet? Tap **"Explore with sample data"** on the first screen —
you get 70 days of demo training to poke at. Nothing syncs, one tap clears it.

## Self-hosting (own your stack end to end)

ShowUp is one HTML file + a service worker. No build step, no framework,
no server of yours to run. You need: a GitHub account and a free Supabase project.

1. **Fork** this repo → Settings → Pages → deploy from `main`.
   Your app is now at `https://<you>.github.io/showup`.
2. **Supabase**: create a project at supabase.com (free tier is plenty —
   your entire training history is a single row).
3. In the Supabase **SQL editor**, run the contents of `supabase-setup.sql`
   (creates the `app_state` table with row-level security: every user can
   read and write only their own row).
4. **Auth → Providers → Google**: enable it, and add
   `https://<you>.github.io/showup/` to the redirect allow-list
   (also under Auth → URL configuration → Site URL).
5. Open your deployed app → **Settings → Sync** → paste your project URL
   (`https://xxxx.supabase.co`) and anon key. Sign in. Done.

No code edits required — the app reads your Supabase config from Settings.

## Your data

- Everything lives in `doc.days` — one JSON document per user, in *your*
  Supabase row, plus a local copy on-device (works fully offline).
- Daily local backups are kept automatically; sync is per-day last-write-wins
  across devices.
- Leaving is easy by design: your data is one `select doc from app_state` away.
