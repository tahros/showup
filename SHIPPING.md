# ShowUp — how to ship from a fresh conversation

For an assistant session that has a Linux container and needs to get a release
onto `main`. Written after a session that could read the repo all day and could
not write a byte, and worked out why.

**There are three ways to write, and the first one that works is the one to
use.** Check them in this order — §1 tells you which you have in about twenty
seconds.

---

## 1. Find out what kind of session you are in

Run these three, separately, and read them:

```bash
# A. the GitHub REST API (what tools/deploy.py uses)
curl -s --max-time 20 -H "Authorization: Bearer $(cat /home/claude/.ghtok)" \
  https://api.github.com/repos/tahros/showup/git/ref/heads/main | head -c 200; echo

# B. git push (dry run, writes nothing)
git ls-remote origin main && git push --dry-run origin HEAD:main 2>&1 | tail -2

# C. is there a computer attached?
#    (a device_bash / remote-devices tool in the tool list means yes)
```

Three outcomes:

| What A says | What you have | Go to |
|---|---|---|
| a JSON object with `"object": {"sha": ...}` | full API write | §3 — the normal path |
| `"GitHub access to this repository is not enabled for this session"` | a proxy-gated session | §4 |
| `401` | the token is dead — mint a new PAT, redo §2 | §2 |

**About the proxy-gated case.** Cloud sessions run behind an egress proxy that
holds git credentials *outside* the sandbox and authenticates on the session's
behalf — but only for repositories in that session's *authorized repository
set*, which is fixed when the session is created from the repository you
picked. A session started without a repository (for example from Cowork on the
desktop, or a general chat) has an empty set. Then:

- **reads work** — the repo is public, so cloning and `git ls-remote` need no
  credential at all. This is why the failure is confusing: everything looks
  fine until the write.
- **your own PAT does not help.** The proxy terminates the connection and
  manages auth itself; a PAT in the remote URL is ignored, and `deploy.py`'s
  API calls are refused the same way. Do not spend an hour on this — it is not
  the token.
- the refusal text names an `add_repo` tool. If that tool is in your tool list,
  call it with `access:"push"` and you are done. If it is not, you are in a
  session that cannot be granted the repo after the fact.

**The fix for next time, worth telling the user:** start the task with the
repository attached — from claude.ai/code picking `tahros/showup`, or
`claude --cloud "..."` run from inside a local checkout. Then §3 works and
none of §4 is needed.

---

## 2. Put the token in the container

The filesystem resets between sessions, so this is always step one. Have the
user paste the PAT and write it **without echoing it**:

```bash
install -m 600 /dev/stdin /home/claude/.ghtok <<'EOF'
<paste the PAT on this line>
EOF
```

Confirm it authenticates — this prints no secret:

```bash
curl -s -o /dev/null -D- -H "Authorization: Bearer $(cat /home/claude/.ghtok)" \
  https://api.github.com/user | grep -i -E "^(HTTP|x-oauth-scopes)"
```

Expect `200`. A **fine-grained** PAT reports an *empty* `x-oauth-scopes` — that
is normal and says nothing about its permissions; a classic token lists `repo`.
Either way, §1A is the test that matters, because it is the one the proxy sees.

The PAT has no `pages` scope. Pages builds are commit-triggered only; they
cannot be invoked directly. That is expected, not a fault.

Never `cat` the token, never write it into the working tree, never name it in a
`deploy.py` file list.

---

## 3. Get a tree, then ship — the normal path

The repo is publicly readable, so the tree needs no auth:

```bash
mkdir -p /home/claude/work && cd /home/claude/work
curl -sL https://codeload.github.com/tahros/showup/tar.gz/refs/heads/main -o s.tgz
mkdir -p stage && tar xzf s.tgz -C stage --strip-components=1
cd stage && ls tools/
```

The jsdom suites need two node packages; `canvas` is required by the share-card
and poster tests specifically:

```bash
cd /home/claude && npm install jsdom canvas
```

Then ship. **Separate steps. Never `&&`-chain them** — chaining hides which
gate failed.

```bash
cd /home/claude/work/stage

python3 tools/bump.py . 3.3.OLD 3.3.NEW

bash tools/runsuite.sh .        # every suite; trust the EXIT CODE, never grep for FAIL
python3 tools/buildcheck.py .   # its own step

# re-read HEAD immediately before deploying: Codex pushes to this repo too
curl -s -H "Authorization: Bearer $(cat /home/claude/.ghtok)" \
  https://api.github.com/repos/tahros/showup/git/ref/heads/main \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['object']['sha'][:7])"

python3 tools/deploy.py . "$(cat /home/claude/work/msg.txt)" \
  CHANGELOG.md index.html js/core.js sw.js <other changed files>

python3 tools/verifyship.py "js/core.js=v3\.3\.NEW" "js/foo.js=someNewSymbol"
```

`deploy.py` writes through the API — blob → tree → commit → ref PATCH — in one
commit, which triggers one Pages build. Then poll Pages to a terminal state;
**do not declare success before this**:

```bash
for i in $(seq 1 12); do
  curl -s -H "Authorization: Bearer $(cat /home/claude/.ghtok)" \
    https://api.github.com/repos/tahros/showup/pages/builds/latest \
    | python3 -c "import sys,json;b=json.load(sys.stdin);print(b['status'],b['commit'][:7])"
  sleep 15
done
```

---

## 4. Ship from the user's own computer

When §1A is refused and a `device_bash` tool is present, the user's machine is
the way out: it reaches `api.github.com` and `github.com` normally, and it has
git, python3 and node. **Build and test in the container as always** — that is
where the harness lives — then move the finished commits across and push from
there. The user does not have to type anything.

Once per session, set up a clone in the device's scratch space (outside the
mounted folders, so nothing appears in the user's files):

```bash
umask 077; mkdir -p "$HOME/.ship"
install -m 600 /dev/stdin "$HOME/.ship/tok" <<'EOF'
<the PAT>
EOF
cd "$HOME/.ship"
git clone -q "https://x-access-token:$(cat "$HOME/.ship/tok")@github.com/tahros/showup.git" showup
cd showup && git config user.name "Sungjee Yoo" && git config user.email "sungjee.u@gmail.com"
```

Then, per release: commit in the container, bundle the new commits, hand the
bundle to the device, fetch and push.

```bash
# in the container, after the gates pass and the commit exists
cd /home/claude/work/stage
git bundle create /home/claude/work/showup-deploy.bundle origin/main..HEAD
# deliver it with the file tools to a fixed name, overwritten each time
```

```bash
# on the device
cd "$HOME/.ship/showup"
git fetch -q origin main && git reset -q --hard origin/main
git fetch "$HOME/mnt/<folder>/showup-deploy.bundle" HEAD
git merge --ff-only FETCH_HEAD
git push origin HEAD:main
git log --oneline -1
```

Verification also runs from the device, since the API works there:

```bash
cd "$HOME/.ship/showup"
git show HEAD:js/core.js | grep -c "v3\.3\.NEW"     # verifyship, by hand
curl -s -H "Authorization: Bearer $(cat "$HOME/.ship/tok")" \
  https://api.github.com/repos/tahros/showup/pages/builds/latest \
  | python3 -c "import sys,json;b=json.load(sys.stdin);print(b['status'],b['commit'][:7])"
```

Use one bundle filename and overwrite it; do not accumulate files in the
user's folders. A bundle carries the exact commits you built and tested,
messages and all, which a copy-paste of file contents does not.

If there is no device either, the last resort is to hand the user the bundle
and three commands (`git fetch <bundle> HEAD`, `git merge --ff-only
FETCH_HEAD`, `git push origin main`). It works, but it puts a human in the
loop on every release, so treat it as the fallback it is.

---

## 5. The Edge Function deploys itself

`supabase/functions/write-session` is the app's one server component. It is
**not** deployed from a session: `.github/workflows/deploy-fn.yml` deploys it on
every push that touches `supabase/functions/**`, and can be run by hand from the
Actions tab. It reads three repository secrets — `SUPABASE_ACCESS_TOKEN`,
`ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID`.

This exists because Supabase's API is unreachable from Anthropic-hosted
containers *and* from the device VM under the org's egress policy, so no
session can run `supabase functions deploy` directly. Don't try; push instead.

Two things learned the hard way, both live:

- the Anthropic key is **identity-linked**, so the function must send
  `anthropic-workspace-id`. Without it the API answers 400 with exactly that
  complaint.
- the function is invoked about once a day by one person, so its isolate is
  nearly always evicted. Warm it answers in ~6 s; **cold it takes ~13 s**.
  Client timeouts must clear a cold start, and a timeout must not claim the
  user has no signal.

---

## 6. What a release must contain

- A version bump via `tools/bump.py` (it stamps `js/core.js`, `index.html` and
  `sw.js` together — hand-editing one desynchronises the cache).
- A `CHANGELOG.md` entry written **for the user**: what changed and why it
  matters, in plain language, no version-control vocabulary.
- A commit message written **for the repo**: the fault, its root cause, what
  was rejected and why. These are long on purpose; they are the project's
  memory.
- Every behavioural change pinned by an assertion in `tools/test-*.js`.

---

## 7. Probe every assertion

A test that passes proves nothing until you have watched it fail. After adding
one: copy the stage, revert the mechanism, confirm the suite goes red.

```bash
cd /home/claude/work && rm -rf probe && cp -r stage probe && cd probe
# ...revert exactly the mechanism under test...
node tools/test-whatever.js . ; echo "rc=$?"      # expect rc=1
cd .. && rm -rf probe
```

If it still passes, the assertion is hollow — fix the assertion, not the code.
Two live examples: a regex that matched a `header.live` variant, so deleting the
base rule stayed green; and a check that tested the expression behind a feature
instead of the rendered result.

**Watch the escapes when writing probes in shell.** Emoji and backslashes in
one-liners frequently fail to match the file's bytes, producing a probe that
"passes" because it changed nothing. Use a Python heredoc with an
`assert s.count(old)==1` before replacing.

---

## 8. When it fails

| Symptom | Cause | Fix |
|---|---|---|
| API says "access to this repository is not enabled for this session" | proxy-gated session, repo not in its authorized set | §4; and start the next task with the repo attached |
| `401` from the API | token dead | mint a new PAT, redo §2 |
| `403`, or `404` on a write | token lacks write permission on the repo | new token with repo write |
| `409` / `422` on the ref PATCH | HEAD moved since the tree was based | re-read HEAD, re-run `deploy.py` |
| every `verifyship` check "actually absent" | verified against a stale SHA | use `.lastship`; suspect the SHA before the code |
| Pages stuck `building` >150s | build throttle (~10/hour) | timestamp nudge to `.nojekyll` |
| suite red on the 1st, green mid-month | date-fragile fixture | fix the fixture, not the app — four of these existed |
| `test-poster.js` crashes on `width` of null | `canvas` not installed | `npm install canvas` in `/home/claude` |
| app on device looks unchanged | service worker cache | check Settings' footer version; close the app fully and reopen twice |

---

## 9. Facts worth having

- Repo `tahros/showup`, branch `main`, served at `tahros.github.io/showup`.
- Vanilla JS, Supabase backend, no framework. IBM Plex Sans/Mono.
- Gates: `bash tools/runsuite.sh .` **and** `python3 tools/buildcheck.py .`.
  Buildcheck enforces product rules, not just syntax — WCAG contrast floors,
  the `--sq` square geometry, the prohibition on scoring a plan or a week, and
  the icon credits.
- `runsuite.sh` exists because four suites were once crashing silently while a
  `grep FAIL` reported green. Trust exit codes.
- A collaborator (Codex) pushes to this repo independently, sometimes
  mid-session. Re-check HEAD before every deploy.
- `cp -r stageN stageN+1` silently *nests* if the destination already exists.
