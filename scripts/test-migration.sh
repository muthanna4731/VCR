#!/usr/bin/env bash
# Runs the material-log migration + SQL assertions against a throwaway local
# Postgres (port 54329). Never touches Supabase. Usage: bash scripts/test-migration.sh
set -euo pipefail

PGBIN="${PGBIN:-/opt/homebrew/bin}"
PORT=54329
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA="$(mktemp -d "${TMPDIR:-/tmp}/vcr-pgtest.XXXXXX")"
MIGRATION=supabase/migrations/20261113120000_material_log.sql

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

# ── pre-flight: a profiles_role_check without 'buyer' must stop the migration up front
echo "== pre-flight (role check lacks 'buyer')"
"${PSQL[@]}" -d postgres -c 'create database vcrtest_preflight' >/dev/null
PF=("${PSQL[@]}" -d vcrtest_preflight)
"${PF[@]}" -f supabase/tests/auth_stub.sql
"${PF[@]}" -c "alter table public.profiles drop constraint profiles_role_check; alter table public.profiles add constraint profiles_role_check check (role in ('owner','manager','admin','agent'))"
if OUT="$("${PF[@]}" -f "$MIGRATION" 2>&1)"; then
  echo "TEST FAILED: migration ran although profiles_role_check lacks 'buyer'"; exit 1
fi
case "$OUT" in
  *"profiles_role_check must allow 'buyer'"*) echo "ok: migration refused with the clear message" ;;
  *) echo "TEST FAILED: wrong error: $OUT"; exit 1 ;;
esac
[ "$("${PF[@]}" -Atc "select to_regclass('public.material_entries') is null")" = t ] \
  || { echo "TEST FAILED: tables were created despite the pre-flight failure"; exit 1; }
# no constraint at all: nothing can reject 'buyer', so the migration proceeds
"${PF[@]}" -c "alter table public.profiles drop constraint profiles_role_check"
"${PF[@]}" -f "$MIGRATION" >/dev/null 2>&1
[ "$("${PF[@]}" -Atc "select to_regclass('public.material_entries') is not null")" = t ] \
  || { echo "TEST FAILED: migration did not run when the constraint is absent"; exit 1; }
echo "ok: migration runs when profiles_role_check is absent"
# Roles are cluster-wide and the stub creates them: clear them for the main run.
"${PSQL[@]}" -d postgres -c 'drop database vcrtest_preflight' -c 'drop role anon, authenticated, service_role' >/dev/null

# ── main run: stub, migration, assertions (which also re-run the migration)
"${PSQL[@]}" -d postgres -c 'create database vcrtest' >/dev/null
PSQL+=(-d vcrtest)

echo "== auth stub"
"${PSQL[@]}" -f supabase/tests/auth_stub.sql
echo "== migration"
"${PSQL[@]}" -f "$MIGRATION"
echo "== tests"
"${PSQL[@]}" -f supabase/tests/material_log_test.sql
