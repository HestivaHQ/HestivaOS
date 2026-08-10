#!/usr/bin/env bash
set -euo pipefail

mode="${1:?usage: test_postgres_migrations.sh <clean|staged> <database-url>}"
database_url="${2:?usage: test_postgres_migrations.sh <clean|staged> <database-url>}"

if [[ "$mode" != "clean" && "$mode" != "staged" ]]; then
  echo "mode must be clean or staged" >&2
  exit 2
fi
if [[ "$database_url" != *"hestiva_migration_"* ]]; then
  echo "refusing to run against a database not named hestiva_migration_*" >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
schema="$root/apps/api/prisma/schema.prisma"

if [[ "$mode" == "staged" ]]; then
  temporary="$(mktemp -d)"
  trap 'rm -rf "$temporary"' EXIT
  cp "$schema" "$temporary/schema.prisma"
  mkdir "$temporary/migrations"
  cp "$root/apps/api/prisma/migrations/migration_lock.toml" "$temporary/migrations/"
  while IFS= read -r migration; do
    cp -R "$migration" "$temporary/migrations/"
  done < <(find "$root/apps/api/prisma/migrations" -mindepth 1 -maxdepth 1 -type d \
    -name '20*' ! -name '20260810233000*' ! -name '20260810233100*' | sort | \
    awk '$0 !~ /20260811010000|20260811150000|20260812120000/')
  DATABASE_URL="$database_url" npx prisma migrate deploy --schema "$temporary/schema.prisma"
fi

DATABASE_URL="$database_url" npx prisma migrate deploy --schema "$schema"

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ServiceType' AND e.enumlabel = 'BOTH'
  ) THEN RAISE EXCEPTION 'ServiceType.BOTH is missing'; END IF;
  IF (SELECT count(*) FROM services WHERE normalized_name IN ('interior window cleaning', 'laundry folding') AND type = 'BOTH') <> 2
  THEN RAISE EXCEPTION 'dual-context services were not reconciled'; END IF;
  IF (SELECT count(*) FROM services WHERE id IN (
    '5d000001-0000-4000-8000-000000000019', '5d000001-0000-4000-8000-000000000020',
    '5d000001-0000-4000-8000-000000000021', '5d000001-0000-4000-8000-000000000022',
    '5d000001-0000-4000-8000-000000000023', '5d000001-0000-4000-8000-000000000024'
  )) <> 6 THEN RAISE EXCEPTION 'canonical add-ons are missing'; END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties'
      AND column_name IN ('floor_size', 'outdoor_area', 'estate_classification', 'unit_floor')) <> 4
  THEN RAISE EXCEPTION 'property quote columns are missing'; END IF;
  IF EXISTS (SELECT 1 FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL)
  THEN RAISE EXCEPTION 'unresolved migration found'; END IF;
END $$;
SQL
