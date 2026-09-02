#!/usr/bin/env bash
# deploy_fn.sh — ship the session writer's Edge Function. The ONLY server piece.
# Needs the Supabase CLI (npx works) and, once, the secrets. Run from the repo root.
#   SUPABASE_ACCESS_TOKEN=sbp_... ./tools/deploy_fn.sh
#   ./tools/deploy_fn.sh secrets ANTHROPIC_API_KEY=sk-ant-... [ANTHROPIC_WORKSPACE_ID=wrkspc_...]
set -eu
REF="${SUPABASE_PROJECT_REF:-anmmqhgnsuutufladfik}"
if [ "${1:-}" = "secrets" ]; then shift; npx --yes supabase secrets set "$@" --project-ref "$REF"; exit; fi
npx --yes supabase functions deploy write-session --project-ref "$REF"
echo "deployed write-session to $REF"
