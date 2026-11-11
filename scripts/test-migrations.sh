#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Disposable local database only. Uses a cached image locally; CI can override it.
runtime="${CONTAINER_RUNTIME:-}"
if [[ -z "$runtime" ]]; then
  if command -v podman >/dev/null; then runtime=podman; else runtime=docker; fi
fi
image="${POSTGRES_TEST_IMAGE:-public.ecr.aws/supabase/postgres:17.6.1.159}"
container="aetherius-migrations-${RANDOM}-$$"
database_user="${POSTGRES_TEST_USER:-supabase_admin}"
cleanup() { "$runtime" rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
"$runtime" run --pull=never --detach --name "$container" --env POSTGRES_PASSWORD=aetherius-local-test "$image" >/dev/null
ready=false
for _ in {1..45}; do
  if "$runtime" exec "$container" sh -c 'case "$(cat /proc/1/comm)" in *postgres*) pg_isready -U postgres ;; *) exit 1 ;; esac' >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then "$runtime" logs "$container"; exit 1; fi
sql() { "$runtime" exec -i "$container" psql -X -U "$database_user" -v ON_ERROR_STOP=1 -d postgres; }
sql < supabase/tests/bootstrap.sql
for migration in supabase/migrations/*.sql; do sql < "$migration"; done
sql < supabase/tests/permissions.sql
printf 'Migration and authenticated-role checks passed.\n'
