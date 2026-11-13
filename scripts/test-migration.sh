#!/usr/bin/env bash
# Runs the material-log migration + SQL assertions against a throwaway local
# Postgres (port 54329). Never touches Supabase. Usage: bash scripts/test-migration.sh
set -euo pipefail

PGBIN="${PGBIN:-/opt/homebrew/bin}"
PORT=54329
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="$(mktemp -d "${TMPDIR:-/tmp}/vcr-pgtest.XXXXXX")"

cleanup() {
  "$PGBIN/pg_ctl" -D "$DATA/db" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$DATA"
}
trap cleanup EXIT

cd "$ROOT"
"$PGBIN/initdb" -D "$DATA/db" -U postgres --auth=trust -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$DATA/db" -o "-p $PORT -k $DATA -c listen_addresses=''" \
  -l "$DATA/server.log" -w start >/dev/null

PSQL=("$PGBIN/psql" -h "$DATA" -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -d postgres -c 'create database vcrtest' >/dev/null
PSQL+=(-d vcrtest)

echo "== auth stub"
"${PSQL[@]}" -f supabase/tests/auth_stub.sql
echo "== migration"
"${PSQL[@]}" -f supabase/migrations/20261113120000_material_log.sql
echo "== tests"
"${PSQL[@]}" -f supabase/tests/material_log_test.sql
