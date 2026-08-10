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
  boundary="20260810233000_service_availability_and_addon_reconciliation"
  temporary="$(mktemp -d)"
  trap 'rm -rf "$temporary"' EXIT
  cp "$schema" "$temporary/schema.prisma"
  mkdir "$temporary/migrations"
  while IFS= read -r migration; do
    migration_name="$(basename "$migration")"
    if [[ "$migration_name" < "$boundary" ]]; then
      cp -R "$migration" "$temporary/migrations/"
    fi
  done < <(find "$root/apps/api/prisma/migrations" -mindepth 1 -maxdepth 1 -type d -name '20*' | sort)
  DATABASE_URL="$database_url" npx prisma migrate deploy --schema "$temporary/schema.prisma"

  expected_pre_5k="$(find "$temporary/migrations" -mindepth 1 -maxdepth 1 -type d -name '20*' | wc -l)"
  actual_pre_5k="$(psql "$database_url" -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL')"
  if [[ "$actual_pre_5k" -ne "$expected_pre_5k" ]]; then
    echo "pre-5K replay finished $actual_pre_5k migrations; expected $expected_pre_5k" >&2
    exit 1
  fi
  if psql "$database_url" -v ON_ERROR_STOP=1 -Atc "SELECT migration_name FROM _prisma_migrations WHERE migration_name >= '$boundary' LIMIT 1" | grep -q .; then
    echo "staged replay unexpectedly applied a migration at or after $boundary" >&2
    exit 1
  fi
fi

DATABASE_URL="$database_url" npx prisma migrate deploy --schema "$schema"

expected_migrations="$(find "$root/apps/api/prisma/migrations" -mindepth 1 -maxdepth 1 -type d -name '20*' | wc -l)"
psql "$database_url" -v ON_ERROR_STOP=1 -v expected_migrations="$expected_migrations" <<'SQL'
SELECT set_config('hestiva.expected_migrations', :'expected_migrations', false);
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
      AND column_name IN ('bedrooms', 'bathrooms', 'living_areas', 'storeys', 'floor_size', 'outdoor_area', 'estate_classification', 'unit_floor')) <> 8
  THEN RAISE EXCEPTION 'property vocabulary columns are missing'; END IF;
  IF (SELECT count(*) FROM pg_type WHERE typname IN (
      'BedroomCount', 'BathroomCount', 'LivingAreaCount', 'StoreyCount',
      'FloorSize', 'OutdoorArea', 'EstateClassification', 'UnitFloor'
  )) <> 8 THEN RAISE EXCEPTION 'property vocabulary types are missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'BedroomCount' AND e.enumlabel = 'OTHER')
  THEN RAISE EXCEPTION 'BedroomCount.OTHER is missing'; END IF;
  IF (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'StoreyCount' AND e.enumlabel IN ('THREE', 'FOUR_PLUS', 'UNKNOWN')) <> 3
  THEN RAISE EXCEPTION 'StoreyCount compatibility values are missing'; END IF;
  IF EXISTS (SELECT 1 FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL)
  THEN RAISE EXCEPTION 'unresolved migration found'; END IF;
  IF (SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL) <> current_setting('hestiva.expected_migrations')::integer
  THEN RAISE EXCEPTION 'not every migration finished'; END IF;
END $$;
SQL
