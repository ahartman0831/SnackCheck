#!/usr/bin/env bash
set -euo pipefail

container_name="supabase_db_lhnbxjvqllohlbtdncyg"
marker_id="10101010-1010-4010-8010-101010101010"
backup_file="$(mktemp -t snackcheck-backup.XXXXXX.sql)"
trap 'rm -f "$backup_file"' EXIT

docker exec "$container_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "insert into public.analytics_events (id, anonymous_key_hash, event_name, properties) values ('$marker_id', repeat('a', 64), 'backup_restore_fixture', '{}'::jsonb);"

docker exec "$container_name" pg_dump -U postgres -d postgres \
  --data-only --column-inserts --table=public.analytics_events >"$backup_file"

docker exec "$container_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  "truncate table public.analytics_events;"

docker exec -i "$container_name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  <"$backup_file"

restored_count="$(docker exec "$container_name" psql -U postgres -d postgres -Atc \
  "select count(*) from public.analytics_events where id = '$marker_id';")"

if [[ "$restored_count" != "1" ]]; then
  echo "Disposable backup/restore rehearsal failed."
  exit 1
fi

echo "Disposable backup/restore rehearsal passed."
