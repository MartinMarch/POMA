# POMA API

**Creado:** 06/09/2026 13:23 CEST  
**Última actualización:** 06/09/2026 13:43 CEST

API central FastAPI. En esta vertical publica el catálogo validado por QR y
expone, solo en modo laboratorio, el adaptador neutral de TPV conectado al mock
de Oracle Simphony.

## Límites arquitectónicos

```text
HTTP /api/v1
├── dominio POMA (modelos sin campos Oracle)
├── repositorio Supabase (Data API + RPC, RLS activo)
└── TPVAdapter
    └── OracleSimphonyAdapter
        └── cliente y DTO STSG2
```

Los módulos de `integrations/tpv/simphony` son la única zona que conoce
`checkRef`, `menuItemId` y el resto de nombres del proveedor. No se usa
`service_role`. El repositorio de catálogo solo recibe `SUPABASE_URL` y una
clave publicable, y está preparado para reenviar en el futuro un bearer de
usuario sin cambiar todavía Auth ni los dashboards React.

## Ejecutar

```bash
cp .env.example .env
uv sync
uv run uvicorn poma_api.main:app --host 127.0.0.1 --port 8000
```

Para levantar la API junto al TPV simulado es más sencillo usar el
`compose.yaml` de la raíz.

## Endpoints

| Método | Ruta | Disponibilidad |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Siempre |
| `GET` | `/api/v1/restaurants/{slug}/catalog?table=<uuid>` | Siempre |
| `GET` | `/api/v1/lab/tpv/status` | Solo `ENABLE_LAB_ENDPOINTS=true` |
| `GET` | `/api/v1/lab/tpv/catalog` | Solo laboratorio |
| `POST` | `/api/v1/lab/tpv/orders/calculate` | Solo laboratorio |
| `POST` | `/api/v1/lab/tpv/orders` | Solo laboratorio |
| `GET` | `/api/v1/lab/tpv/orders/{external_order_id}` | Solo laboratorio |

## Comanda completa con `curl`

Con Supabase local y `docker compose` levantados, el siguiente recorrido usa
solo IDs externos del fixture Simphony:

```bash
export POMA_LAB_API=http://localhost:8000

curl "$POMA_LAB_API/api/v1/health"
curl "$POMA_LAB_API/api/v1/lab/tpv/status"
curl "$POMA_LAB_API/api/v1/lab/tpv/catalog"

curl -X POST "$POMA_LAB_API/api/v1/lab/tpv/orders/calculate" \
  -H 'Content-Type: application/json' \
  --data '{
    "idempotency_id":"0123456789abcdef0123456789abcdef",
    "table_name":"Mesa 1",
    "guest_count":2,
    "items":[{"external_item_id":"1001","quantity":2}]
  }'
```

Para crear la comanda, repite el mismo cuerpo contra
`POST /api/v1/lab/tpv/orders`. Por ejemplo:

```bash
POMA_ORDER='{
  "idempotency_id":"0123456789abcdef0123456789abcdef",
  "table_name":"Mesa 1",
  "guest_count":2,
  "items":[{"external_item_id":"1001","quantity":2}]
}'

created="$(curl -sS -X POST "$POMA_LAB_API/api/v1/lab/tpv/orders" \
  -H 'Content-Type: application/json' --data "$POMA_ORDER")"
external_order_id="$(printf '%s' "$created" | jq -r .external_order_id)"

curl "$POMA_LAB_API/api/v1/lab/tpv/orders/$external_order_id"

# La segunda creación conserva el mismo identificador y devuelve cached_response=true.
curl -X POST "$POMA_LAB_API/api/v1/lab/tpv/orders" \
  -H 'Content-Type: application/json' --data "$POMA_ORDER"
```

Si vuelves a ejecutar el `POST` con el mismo `idempotency_id`, recibirás el
mismo `external_order_id` y `cached_response: true`. El recorrido automatizado
equivalente está en `tests/integration/tpv-lab-smoke.sh` y se ejecuta desde la
raíz con `npm run test:integration`.

Los importes públicos se expresan siempre como enteros en céntimos. La
conversión a los decimales de STSG2 ocurre dentro del adaptador.

## Configuración Simphony

La configuración mínima es `SIMPHONY_BASE_URL`, `SIMPHONY_AUTH_MODE`,
`SIMPHONY_TOKEN`, `SIMPHONY_ORG_SHORT_NAME`, `SIMPHONY_LOC_REF` y
`SIMPHONY_RVC_REF`. También se parametrizan el empleado y el tipo de orden que
Oracle exige al crear un check.

`StaticTokenAuthProvider` permite el laboratorio local. Antes de conectar un
sandbox real habrá que añadir un proveedor OIDC siguiendo la
[documentación oficial de autenticación STSG2](https://docs.oracle.com/en/industries/food-beverage/simphony/simsg/transaction_services_generation_2_client_authentication.htm)
y obtener del establecimiento los identificadores reales de organización,
localización, revenue center, empleado, tipo de pedido, mesas y carta.

## Seguridad y operación

- CORS admite únicamente los orígenes exactos de `CORS_ORIGINS`; no se combina
  wildcard con credenciales.
- Los endpoints `lab` ni siquiera se registran cuando están desactivados.
- Los logs propios son JSON, omiten cabeceras, cuerpos y query strings, y no
  incluyen claves, tokens de mesa ni cabeceras de autorización.
- `httpx.AsyncClient` usa timeouts explícitos y traduce errores de red,
  autenticación, contrato y recursos al dominio POMA.
- Esta vertical no persiste pedidos, no procesa pagos y no incorpora workers,
  webhooks, outbox, bridge local, Redis ni Celery.

## Pruebas

```bash
uv run ruff check .
uv run pytest
```
