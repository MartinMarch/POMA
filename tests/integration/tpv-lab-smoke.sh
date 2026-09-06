#!/usr/bin/env bash

set -euo pipefail

api_url="${POMA_API_URL:-http://127.0.0.1:8000}"
demo_table_token="${POMA_DEMO_TABLE_TOKEN:-c0ffee00-0000-4000-8000-000000000001}"

for executable in curl jq; do
  if ! command -v "$executable" >/dev/null 2>&1; then
    echo "Falta la dependencia de smoke test: $executable" >&2
    exit 1
  fi
done

health_json="$(curl --fail --silent --show-error "$api_url/api/v1/health")"
catalog_json="$(
  curl --fail --silent --show-error \
    "$api_url/api/v1/restaurants/demo/catalog?table=$demo_table_token"
)"
status_json="$(curl --fail --silent --show-error "$api_url/api/v1/lab/tpv/status")"
tpv_catalog_json="$(curl --fail --silent --show-error "$api_url/api/v1/lab/tpv/catalog")"

order_payload='{
  "idempotency_id":"fedcba9876543210fedcba9876543210",
  "table_name":"Mesa 1",
  "guest_count":2,
  "items":[{"external_item_id":"1001","quantity":2}]
}'

calculate_json="$(
  curl --fail --silent --show-error \
    -H 'Content-Type: application/json' \
    --data "$order_payload" \
    "$api_url/api/v1/lab/tpv/orders/calculate"
)"
create_json="$(
  curl --fail --silent --show-error \
    -H 'Content-Type: application/json' \
    --data "$order_payload" \
    "$api_url/api/v1/lab/tpv/orders"
)"
duplicate_json="$(
  curl --fail --silent --show-error \
    -H 'Content-Type: application/json' \
    --data "$order_payload" \
    "$api_url/api/v1/lab/tpv/orders"
)"
external_order_id="$(jq -er '.external_order_id' <<<"$create_json")"
retrieved_json="$(
  curl --fail --silent --show-error \
    "$api_url/api/v1/lab/tpv/orders/$external_order_id"
)"

jq -e '.status == "ok" and .supabase.status == "ok" and .tpv.status == "ok"' \
  >/dev/null <<<"$health_json"
jq -e '.restaurant.slug == "demo" and .table.name == "Mesa 1"' \
  >/dev/null <<<"$catalog_json"
jq -e '.connected == true' >/dev/null <<<"$status_json"
jq -e '.external_menu_id == "100" and (.items | length) > 0' \
  >/dev/null <<<"$tpv_catalog_json"
jq -e '.totals.total_due_cents > 0 and .totals.currency_code == "EUR"' \
  >/dev/null <<<"$calculate_json"
jq -e --arg check_ref "$external_order_id" \
  '.external_order_id == $check_ref and .cached_response == true' \
  >/dev/null <<<"$duplicate_json"
jq -e --arg check_ref "$external_order_id" '.external_order_id == $check_ref' \
  >/dev/null <<<"$retrieved_json"

jq -n \
  --argjson health "$health_json" \
  --argjson catalog "$catalog_json" \
  --argjson calculate "$calculate_json" \
  --argjson create "$create_json" \
  --argjson duplicate "$duplicate_json" \
  --argjson retrieved "$retrieved_json" \
  '{
    result:"PASS",
    health:$health.status,
    catalog:{
      restaurant:$catalog.restaurant.slug,
      table:$catalog.table.name,
      categories:($catalog.categories | length),
      items:([$catalog.categories[].items[]] | length)
    },
    calculate:{
      total_due_cents:$calculate.totals.total_due_cents,
      currency:$calculate.totals.currency_code
    },
    create:{external_order_id:$create.external_order_id},
    duplicate:{
      external_order_id:$duplicate.external_order_id,
      cached_response:$duplicate.cached_response
    },
    retrieved:{external_order_id:$retrieved.external_order_id,status:$retrieved.status}
  }'
