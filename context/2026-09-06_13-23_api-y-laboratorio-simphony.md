# API central y laboratorio Oracle Simphony

**Creado:** 06/09/2026 13:23 CEST  
**Última actualización:** 06/09/2026 13:53 CEST  
**Estado:** completada la primera vertical técnica de TPV; validación con
hardware y sandbox real pendiente

## Objetivo de esta iteración

Introducir el límite de backend que faltaba entre la web, Supabase y futuros
TPV sin anticipar el modelo todavía inestable de pedidos y pagos. Para poder
desarrollarlo antes del piloto se ha creado un laboratorio reproducible de un
subconjunto vigente de Oracle Simphony Transaction Services Generation 2.

> Esta versión está pensada específicamente para no depender todavía de un
> sandbox real de Oracle. El mock valida nuestra arquitectura y los contratos
> internos, pero no constituye una certificación de compatibilidad Simphony.

## Resultado

```text
React (5173/4173)
   │ catálogo público + token de mesa
   ▼
POMA API (8000)
   ├── Supabase Data API/RPC ──> catálogo y validación QR
   └── TPVAdapter
       └── OracleSimphonyAdapter
           └── STSG2 Mock (9100) ──> checks solo en memoria
```

- `apps/api` es un servicio FastAPI Docker independiente y modular.
- `labs/simphony-mock` reproduce las rutas necesarias para descubrimiento,
  menú, conectividad, cálculo, creación e inspección de checks.
- `compose.yaml` conecta ambos en la red `poma-private`; React continúa fuera
  de Docker para conservar el ciclo rápido de Vite.
- Los dos proyectos Python fijan dependencias directas y transitivas con
  `pyproject.toml` y `uv.lock`.
- Los accesos HTTP se registran sin query strings, cabeceras ni cuerpos para
  que el token de mesa, los bearer y las claves no aparezcan en logs.

## Decisiones de diseño

### Contrato neutral de TPV

`TPVAdapter` define `healthcheck`, `get_catalog`, `calculate_order`,
`create_order` y `get_order`. Sus modelos usan identificadores externos
neutros y dinero en céntimos. Los DTO Oracle quedan confinados bajo
`integrations/tpv/simphony`; por tanto, otro proveedor no obliga a cambiar el
contrato HTTP ni el dominio POMA.

### Fidelidad STSG2

Se verificaron en la documentación oficial actual las rutas y DTO usados:

- [lista oficial de endpoints STSG2](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/rest-endpoints.html);
- [menú completo](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/op-api-v1-menus-menuid-get.html);
- [estado de conexión](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/op-api-v1-checks-connectionstatus-head.html);
- [cálculo](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/op-api-v1-checks-calculator-post.html),
  [creación](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/op-api-v1-checks-post.html)
  y [consulta](https://docs.oracle.com/en/industries/food-beverage/simphony/omsstsg2api/op-api-v1-checks-checkref-get.html)
  de checks.

Oracle exige un `idempotencyId` de 32 caracteres hexadecimales, además de
empleado y tipo de pedido. La detección de duplicados se activa mediante
`Simphony-Features: detect-duplicate-request`. El mock mantiene el check
original y devuelve el mismo `checkRef` al repetirlo.

Los importes y cantidades STSG2 se conservan como `Decimal` internamente y se
serializan como números JSON, tal como declara el esquema Oracle. Al cruzar el
límite hacia el dominio POMA, los importes se transforman en céntimos enteros.

La autenticación estática existe exclusivamente para el laboratorio. El
sandbox/TPV real requiere implementar el flujo OIDC documentado por Oracle.

### Validación de QR en backend

La carta ya no se consulta desde React. `GET
/api/v1/restaurants/{slug}/catalog?table=<uuid>` usa exclusivamente la clave
publicable y respeta RLS.

La migración `20260906112125_add_public_table_context_rpc.sql` añade
`restaurants.requires_table_token`, activado para `demo`, y un RPC controlado:

- implementación `private.resolve_table_context`, `security definer` y
  `search_path=''`;
- wrapper `public.resolve_table_context`, `security invoker`;
- permisos `EXECUTE` explícitos y retorno mínimo de restaurante, mesa y nombre;
- validación conjunta de restaurante publicado, pertenencia, token y mesa
  activa;
- ningún acceso `service_role` y ninguna exposición del esquema `private` en
  la Data API.

La exigencia del token queda en datos y no existe ninguna condición especial
para el slug `demo` en React o FastAPI.

### Alcance deliberadamente excluido

No se han creado tablas de pedidos, pagos, eventos, idempotencia ni mapeos TPV.
Tampoco se han añadido webhooks, outbox, workers, `tpv-bridge`, Redis, Celery u
otros fabricantes. Los endpoints de comandas son un laboratorio de
conectividad, no el contrato comercial definitivo.

## Pruebas y verificaciones

- 9 pruebas del mock: jerarquía, menú, bearer, conexión, cálculo, creación,
  lectura, duplicados, desconexión, error y timeout.
- 11 pruebas de la API: salud, catálogo, QR, aislamiento de rutas lab,
  repositorio Supabase, traducción de DTO y errores de proveedor.
- 6 aserciones pgTAP sobre columna, funciones, token válido, token desconocido
  y mesa desactivada.
- 12 pruebas Playwright completas pasando por FastAPI y Supabase local.
- Build Docker y smoke real de salud, catálogo, cálculo, creación,
  idempotencia y lectura del check.
- El smoke queda repetible mediante `npm run test:integration`.
- La migración está aplicada en el proyecto remoto con versión
  `20260906112125`; los advisors no detectan problemas nuevos. Permanece una
  advertencia previa de protección de contraseñas filtradas y avisos
  informativos de índices aún no usados.

## Pendiente para el piloto

1. Conseguir acceso a un sandbox o TPV Simphony real y confirmar versión,
   licencia STSG2, conectividad de workstation y OIDC.
2. Sustituir fixtures por la configuración real del local y validar mesas,
   empleados, tipos de pedido, impuestos, condimentos y KDS.
3. Diseñar en otra vertical la persistencia transaccional de pedido y pago,
   después de elegir el proveedor de pago y el mecanismo de confirmación.
4. Definir dónde residirá la API pública en producción y configurar
   `VITE_API_URL` en GitHub Pages; Pages solo aloja el frontend estático.
