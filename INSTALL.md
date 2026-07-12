# ShowUp v2.0 — Installation Guide

Total time: about 40 minutes, once. You will never have to do it again.
You need: a laptop, your GitHub account, and a Google account.

---

## Part 0 — What you are actually building (read this first, it makes everything else obvious)

An app that syncs across your phone and laptop needs exactly three things. Not more.

**1. A place that stores the files.**
Your app is one HTML file plus an icon or two. Someone has to hand those files to your
phone when you type a URL. That's all "hosting" means. **GitHub Pages** does it free.

**2. A place that stores the data.**
Your phone can't be the source of truth — if it were, your laptop would never see the
sets you logged at the gym. So the data has to live somewhere both devices can reach: a
**database on the internet**. We use **Supabase**, which is a hosted Postgres database
with a web API in front of it, free at your scale.

**3. A way to prove who you are.**
The database will hold data for you. Maybe one day for other paying users too. So when
your phone says "give me my workouts," the database must know it's *you* asking. That's
**authentication**. Rather than invent passwords, we let **Google** vouch for you: you
click "Continue with Google," Google confirms your identity, and hands your phone a
signed ticket (a token). Your phone shows that ticket to the database on every request.

That's it. Files, data, identity. Everything below is just plumbing those three together.

**The one security idea you should understand:** the app carries a key called the *anon
key*, and it's visible to anyone who views your page. That sounds alarming and isn't. The
anon key only says "this request came from the ShowUp app." It does **not** say who you
are. What protects your data is a rule *inside the database* called **Row Level
Security**: "a user may only read or write the row whose user_id equals their own
verified identity." So even with the anon key, a stranger asking for your workouts gets
nothing back — because their Google ticket isn't yours. You'll install that rule in Step
2 by pasting one SQL file. Do not skip it.

---

## Part 1 — Put the app on the internet (10 min)

1. Go to **github.com** → **New repository**.
   - Name: `showup`
   - **Public** (Pages is free on public repos)
   - Create.

2. On the new repo page click **"uploading an existing file"**.
   Drag in **everything from the `webapp` folder**:
   `index.html`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`,
   `apple-touch-icon.png`, `supabase-setup.sql`, and the two `.md` files.
   Commit.

3. Repo → **Settings** → **Pages** (left sidebar).
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)** → **Save**.

4. Wait ~60 seconds, then open:
   **`https://YOUR-USERNAME.github.io/showup/`**

The app should load with all 918 of your sessions already in it. **It works right now** —
data saves to that device only. The next parts add the shared database.

> ⚠️ One honest warning: your four years of workout history is baked into `index.html`,
> and a public repo means anyone with the URL could read it. It's sets and reps, not your
> bank details — but if you'd rather it not be public, use **netlify.com/drop** instead
> (drag the folder onto the page, get a private-source URL in 30 seconds) and skip to
> Part 2. Everything else works identically.

---

## Part 2 — Create the database (10 min)

1. Go to **supabase.com** → **Start your project** → sign in **with GitHub**.

2. **New project.**
   - Name: `showup`
   - Database password: click generate, and **save it in your password manager**.
     (You won't need it for this app, but losing it is annoying later.)
   - Region: pick the one nearest you (Seoul/Tokyo if you're in Korea).
   - Create. It takes ~2 minutes to provision.

3. When it's ready: left sidebar → **SQL Editor** → **New query**.
   Open `supabase-setup.sql`, copy **all** of it, paste it in, click **Run**.

   *What you just did:* created a table called `app_state` — one row per user, holding
   your entire app state as a JSON document — and turned on Row Level Security with three
   rules (you may read / insert / update **only your own row**). You also created an empty
   `profiles` table with a `plan` column, sitting ready for the paid tier later.

4. Left sidebar → **Project Settings** (gear) → **API**. Copy two values into a scratch
   note — you'll paste them in Part 4:
   - **Project URL** → looks like `https://abcdwxyz.supabase.co`
     ⚠️ Just that. The page also shows a **RESTful endpoint** ending in `/rest/v1` right
     beside it — that is **not** the one. (If you grab it by mistake, the app trims it
     for you now, but paste the plain project URL.)
   - **anon public** key → a long string starting `eyJ...`

---

## Part 3 — Turn on "Continue with Google" (15 min)

This is the fiddliest part, because two companies have to be introduced to each other.
Google needs to know your app exists; Supabase needs Google's credentials.

**3a — Create the Google credentials**

1. Go to **console.cloud.google.com** → create a new project (name it `ShowUp`).
2. **APIs & Services** → **OAuth consent screen**:
   - User type: **External** → Create
   - App name: `ShowUp`, support email: yours, developer email: yours
   - Save and continue through the remaining screens (no scopes needed) → Back to dashboard.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `ShowUp web`
   - Under **Authorized redirect URIs** → **Add URI**, paste your Supabase URL with
     `/auth/v1/callback` on the end:
     ```
     https://abcdwxyz.supabase.co/auth/v1/callback
     ```
     *(This is Google asking: "after I verify someone, where do I send them back to?"
     The answer is Supabase, not your app — Supabase does the verifying, then forwards
     to you.)*
   - Create. Copy the **Client ID** and **Client secret**.

**3b — Give them to Supabase**

4. Supabase → **Authentication** → **Sign In / Providers** → **Google** → enable.
   Paste the Client ID and Client secret → **Save**.

5. Supabase → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://YOUR-USERNAME.github.io/showup/`
   - **Redirect URLs** → add the same: `https://YOUR-USERNAME.github.io/showup/`
   - Save.
   *(This is Supabase asking: "after I verify someone, which apps am I allowed to send
   them back to?" Without this, sign-in completes and then refuses to return to you.)*

---

## Part 4 — Connect the app and sign in (2 min)

1. Open your live app: `https://YOUR-USERNAME.github.io/showup/`
2. Tap the **⚙ gear** in the top-right corner of the app.
   *(It's also at the bottom of the **Stats** tab, under a "Settings" heading — either
   route opens the same screen.)*
3. Under **Account & cloud sync**, paste:
   - **Supabase project URL** (from Part 2, step 4)
   - **Anon public key** (same place)
   - → **Test** to check the connection (it will tell you if the key is wrong, the URL is
     unreachable, or the Google provider isn't switched on), then **Save & enable cloud**
4. The **Continue with Google** button appears. Click it, pick your Google account.
5. You'll bounce to Google and back. The screen should say you're signed in with your
   email, and it immediately pushes your local data up to the database.

**Test it properly:** open the same URL on your phone, sign in with the same Google
account, and you should see the sets you logged on the laptop. That round trip is the
whole point of Parts 2–4.

---

## Part 5 — Put it on your phone's home screen (1 min)

- **iPhone:** open the URL in **Safari** → Share button → **Add to Home Screen**.
- **Android:** open in Chrome → ⋮ menu → **Install app** / **Add to Home screen**.

It now opens full-screen with no browser chrome, works offline (the service worker caches
it), and syncs whenever you have signal.

---

## Optional — bake the keys in so you never paste them again

If you'd rather the app arrive pre-connected (useful when other people start using it):

1. Open `index.html` in a text editor, find these two lines near the top of the `<script>`:
   ```js
   const CLOUD_URL  = '';
   const CLOUD_ANON = '';
   ```
2. Fill them in:
   ```js
   const CLOUD_URL  = 'https://abcdwxyz.supabase.co';
   const CLOUD_ANON = 'eyJhbGciOi...';
   ```
3. Re-upload `index.html` to GitHub. Now the app skips the setup fields and shows
   "Continue with Google" immediately. (Safe to publish — see Part 0.)

---

## How to update the app later

1. Get the new `index.html` (edit it yourself, or ask Claude for the next version).
2. In `sw.js`, change the cache name — `const CACHE = 'showup-v2.01';` — to anything new.
   *Why: your phone deliberately caches the old app so it works offline. Changing this
   string is how you tell it "throw the old one away."* (My build script does this
   automatically, keeping it in step with the version number.)
3. GitHub repo → click `index.html` → pencil icon → paste → **Commit**. Same for `sw.js`.
4. Pages redeploys in ~60 seconds. Your phone picks it up the next time you open the app.

**Your data is never touched by an update** — it lives in the database, not in the file.

---

## When you're ready to charge money (v2.1)

The groundwork is already in your database:
- `profiles` table with `plan` — currently `'free'` for everyone.
- Create a **Stripe Payment Link** (no code), and a small **Supabase Edge Function** that
  Stripe calls on a successful payment; it flips that user's `plan` to `'pro'`.
- In the app, read the profile after sign-in and gate features on `plan === 'pro'`.

My suggestion on the split, based on how you actually use this: **logging stays free
forever** (that's the habit), and **Stats depth + multi-device sync** goes behind Pro.
People pay to *see their history*, not to write it.

---

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| Sign-in loops back with an error | The app URL isn't in Supabase's Redirect URLs | Part 3, step 5 — must match exactly, trailing slash included |
| "redirect_uri_mismatch" from Google | The callback URI in Google Cloud is wrong | Part 3a, step 3 — it must be your **Supabase** URL + `/auth/v1/callback`, not your app's URL |
| Signed in, but nothing syncs | The SQL didn't run | Part 2, step 3 — re-run `supabase-setup.sql`; check Table Editor shows `app_state` |
| `{"message":"No API key found in request"}` | App version older than v2.02 | Re-upload the latest `index.html` |
| `PGRST125 · Invalid path specified in request URL` | The Project URL had `/rest/v1` on the end, so sign-in hit the database instead of auth | Fixed in v2.03 (the app trims it); re-upload `index.html`, then re-paste the plain project URL and hit **Test** |
| Phone still shows the old version | Service worker cache | Bump `CACHE` in `sw.js`, or delete the app from your home screen and re-add |
| App loads but Settings shows setup fields again | Browser storage cleared | Just paste the URL/key again, or bake them in (Optional section) |
