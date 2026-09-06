# Simphony Mock Lab

**Creado:** 06/09/2026 13:23 CEST  
**Última actualización:** 06/09/2026 13:43 CEST

Servicio FastAPI independiente para desarrollar el primer adaptador TPV de
POMA sin disponer aún de una instalación Oracle Simphony. Implementa un
subconjunto de las rutas descritas en la
[guía vigente de STSG2](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/index.html);
no pretende sustituir un sandbox ni certificar compatibilidad con un TPV real.

## Ejecutar

```bash
cp .env.example .env
uv sync
uv run uvicorn simphony_mock.main:app --host 127.0.0.1 --port 9100
```

La dependencia y sus versiones transitivas están fijadas en `uv.lock`. El
token es obligatorio y se lee de `SIMPHONY_MOCK_TOKEN`; el código fuente no
contiene ninguna credencial.

## Contrato cubierto

| Método | Ruta |
| --- | --- |
| `GET` | `/api/v1/organizations` |
| `GET` | `/api/v1/organizations/{orgShortName}/locations` |
| `GET` | `/api/v1/organizations/{orgShortName}/locations/{locRef}/revenueCenters` |
| `GET` | `/api/v1/menus/summary` |
| `GET` | `/api/v1/menus/{menuId}` |
| `HEAD` | `/api/v1/checks/connectionStatus` |
| `POST` | `/api/v1/checks/calculator` |
| `POST` | `/api/v1/checks` |
| `GET` | `/api/v1/checks/{checkRef}` |

Los recursos deterministas son `POMALAB`, `barcelona01`, revenue center `1` y
menú `100`. Los checks se guardan solo en memoria. Si se envía
`Simphony-Features: detect-duplicate-request`, repetir un
`idempotencyId` devuelve el mismo `checkRef` y marca `isCachedResponse`, como
describe Oracle en
[Detecting Duplicate Requests](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/detect_dup_requests.html).

Ejemplo:

```bash
curl -I http://localhost:9100/api/v1/checks/connectionStatus \
  -H 'Authorization: Bearer local-development-token' \
  -H 'Simphony-OrgShortName: POMALAB' \
  -H 'Simphony-LocRef: barcelona01' \
  -H 'Simphony-RvcRef: 1'
```

## Controles exclusivos del laboratorio

Estas cabeceras no forman parte del contrato de POMA ni del de Oracle:

- `X-POMA-Lab-Connection: disconnected|connected` cambia el estado del TPV.
- `X-POMA-Lab-Failure: http-500` fuerza un error de servidor.
- `X-POMA-Lab-Failure: timeout` aplica la latencia configurada.

## Fidelidad y límites

- Se preservan rutas, cabeceras y nombres de los DTO necesarios que documenta
  Oracle para organizaciones, localizaciones, menús y checks.
- Las colecciones usan `items`, conforme a los ejemplos actuales de Oracle;
  algunas descripciones del esquema publicado aún nombran propiedades
  históricas como `location` o `revenueCenter`.
- No se emulan condimentos, combos, descuentos, impuestos configurables,
  tenders, notificaciones, impresión ni estados KDS completos.
- El laboratorio utiliza bearer estático. Un sandbox o despliegue real deberá
  implementar el flujo OIDC actual de
  [autenticación de clientes STSG2](https://docs.oracle.com/en/industries/food-beverage/simphony/simsg/transaction_services_generation_2_client_authentication.htm).

## Pruebas

```bash
uv run ruff check .
uv run pytest
```
