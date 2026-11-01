#!/usr/bin/env bash
# Applies every migration in supabase/migrations/ to a fresh local PostgreSQL (with scripts/db/supabase-stubs.sql
# standing in for Supabase's auth schema and roles), applies the Command Center migration a second time (it must be
# re-runnable), then runs scripts/db/command-center.test.sql as real signed-in users. Needs PostgreSQL 15+ binaries.
#   bash scripts/db/test-command-center.sh [path/to/postgres/bin]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="${1:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
WORK="$(mktemp -d)"
chmod 755 "$WORK"
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown postgres "$WORK"; RUNAS=(su postgres -c); fi
run() { if [ ${#RUNAS[@]} -gt 0 ]; then "${RUNAS[@]}" "$*"; else bash -c "$*"; fi; }
cleanup() { run "$BIN/pg_ctl -D $WORK/data stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
run "$BIN/initdb -D $WORK/data -A trust -U postgres" >/dev/null
run "$BIN/pg_ctl -D $WORK/data -o '-p 54399 -k $WORK -c listen_addresses=' -l $WORK/log start" >/dev/null
sleep 2
PSQL=(psql -h "$WORK" -p 54399 -U postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -d postgres -c "create database cctest" >/dev/null
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/supabase-stubs.sql" >/dev/null 2>&1
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -d cctest -f "$f" >/dev/null 2>"$WORK/err" || { echo "Migration failed: $f"; cat "$WORK/err"; exit 1; }; done
for m in 20261031100000_command_center.sql 20261101100000_autopilot.sql 20261102100000_client_os_identity.sql 20261102110000_client_os_delivery.sql 20261102120000_client_os_commercial.sql 20261103100000_client_os_ai.sql; do
  "${PSQL[@]}" -d cctest -f "$ROOT/supabase/migrations/$m" >/dev/null 2>"$WORK/err" || { echo "Re-running $m failed"; cat "$WORK/err"; exit 1; }
done
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/command-center.test.sql"
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/autopilot.test.sql"
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/client-os.test.sql"
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/client-os-ai.test.sql"
# The rollback removes only the Command Center, keeps existing data, and the migration applies again afterwards.
before="$("${PSQL[@]}" -d cctest -tAc "select (select count(*) from public.brands) || '/' || (select count(*) from public.brand_admins) || '/' || (select count(*) from public.audit_logs)")"
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/client-os-ai-rollback.sql" >/dev/null
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/client-os-rollback.sql" >/dev/null
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/autopilot-rollback.sql" >/dev/null
"${PSQL[@]}" -d cctest -f "$ROOT/scripts/db/command-center-rollback.sql" >/dev/null
left="$("${PSQL[@]}" -d cctest -tAc "select (select count(*) from pg_tables where schemaname = 'public' and tablename in ('contacts','contact_brands','leads','lead_events','interactions','projects','project_members','milestones','tasks','invoices','payments','expenses','automations','automation_runs','ops_alerts','user_notifications','portal_memberships','proposals','deliverables','cos_files')) + (select count(*) from pg_proc where proname like 'ap\_%' or proname like 'cos\_%' or proname like 'portal\_%' or proname like 'cai\_%')")"
after="$("${PSQL[@]}" -d cctest -tAc "select (select count(*) from public.brands) || '/' || (select count(*) from public.brand_admins) || '/' || (select count(*) from public.audit_logs)")"
[ "$left" = "0" ] || { echo "ROLLBACK left $left Command Center tables"; exit 1; }
[ "$before" = "$after" ] || { echo "ROLLBACK changed existing data ($before -> $after)"; exit 1; }
for m in 20261031100000_command_center.sql 20261101100000_autopilot.sql 20261102100000_client_os_identity.sql 20261102110000_client_os_delivery.sql 20261102120000_client_os_commercial.sql 20261103100000_client_os_ai.sql; do
  "${PSQL[@]}" -d cctest -f "$ROOT/supabase/migrations/$m" >/dev/null 2>"$WORK/err" || { echo "Re-applying $m after rollback failed"; cat "$WORK/err"; exit 1; }
done
echo "ROLLBACK AND RE-APPLY PASSED (brands/brand_admins/audit_logs kept: $after)"
