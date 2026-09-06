# Registro 004 — Demo, vertical 001: catálogo multitenant

**Creado:** 05/09/2026 23:40 CEST
**Última actualización:** 06/09/2026 13:43 CEST
**Estado:** primera vertical completada; API/TPV de laboratorio continuados el
06/09/2026 13:23 CEST; pedidos y pagos reales pendientes

> **Actualización 06/09/2026 13:23 CEST:** la sección que presenta `apps/api`
> como «siguiente vertical» queda obsoleta. La primera API central, el límite
> neutral `TPVAdapter` y el laboratorio Oracle Simphony están documentados en
> [API central y laboratorio Oracle Simphony](./2026-09-06_13-23_api-y-laboratorio-simphony.md).
> El esquema previsto de pedidos continúa siendo una propuesta, no una
> migración aprobada.

## Objetivo de la demo completa

Cerrar un ciclo real en el restaurante `DEMO`:

1. El cliente escanea el QR de su mesa.
2. Consulta la carta, prepara una comanda y paga con Apple Pay.
3. La comanda pagada aparece en el panel del restaurante y en cocina.
4. El pedido se entrega al TPV del piloto de forma idempotente.
5. El proveedor de pagos liquida el importe en la cuenta asociada al
   restaurante.

La misma plataforma debe permitir registrar nuevos restaurantes y publicar su
experiencia sin crear o desplegar una aplicación diferente para cada uno.

## Alcance construido en esta vertical

- Web corporativa inicial de POMA en `/`.
- ~~Recorrido directo de demostración en `/demo`.~~ **Obsoleto desde
  06/09/2026 00:36 CEST:** la demo se distribuye únicamente mediante el QR de
  la Mesa 01; la ruta corta y sus enlaces se han eliminado.
- Plantilla móvil de restaurante en `/r/:slug`.
- Catálogo real de Supabase para `DEMO`, con tres categorías y nueve productos.
- Carrito local con altas, bajas, cantidades y total formateado en la divisa y
  locale del restaurante.
- Hoja de comanda con el futuro punto de entrada de Apple Pay claramente
  deshabilitado hasta que exista un cobro real.
- Mapa del alta de restaurantes en `/registro`.
- Esqueleto honesto del panel operativo en `/admin/:slug`.
- Esquema, semilla, tipos TypeScript, permisos e índices reproducibles mediante
  migraciones.
- Despliegue de esas migraciones al proyecto remoto de Supabase de POMA.

No se simula un pago, un pedido persistido ni una integración TPV. Esos tres
eventos tienen consecuencias económicas u operativas y solo se marcarán como
funcionales cuando el ciclo sea real.

## Decisión de publicación multitenant

Cada carta no será un proyecto frontend independiente. Una única aplicación
resuelve el `slug` de la URL, carga la configuración del restaurante y aplica
su identidad visual. Por ejemplo:

```text
/r/demo
/r/bar-la-plaza
/r/restaurante-norte
```

Dar de alta una nueva carta consistirá en crear los datos y publicarlos; no
requerirá clonar código ni ejecutar otro despliegue. Más adelante, un dominio
personalizado podrá resolverse al mismo `slug`. La separación real no depende
de React: PostgreSQL la impone mediante `restaurant_id`, claves foráneas
compuestas y Row Level Security.

## Esquema implementado

| Tabla | Responsabilidad | Exposición pública |
| --- | --- | --- |
| `restaurants` | Identidad, slug, locale, divisa, tema y publicación | Solo restaurantes publicados |
| `restaurant_members` | Relación entre Supabase Auth, restaurante y rol | Solo la membresía propia |
| `dining_tables` | Mesas y token QR opaco y revocable | Ninguna |
| `menus` | Cartas del restaurante y versión activa | Solo la carta activa publicada |
| `menu_categories` | Secciones ordenadas de una carta | Solo categorías activas publicadas |
| `menu_items` | Productos, precios en céntimos, alérgenos y disponibilidad | Solo productos disponibles publicados |

El dinero se representa como enteros en la unidad menor (`price_cents`) y no
como números decimales de JavaScript. El token de mesa es un UUID no enumerable;
en la siguiente vertical deberá validarse dentro de la operación transaccional
que crea el pedido.

## Esquema previsto para cerrar el pedido

La siguiente migración de negocio deberá cubrir, como mínimo:

- `table_sessions`: sesión corta y revocable abierta desde una mesa.
- `orders`: restaurante, mesa, estado, moneda, importes e idempotency key.
- `order_items`: instantánea de nombre, precio, impuestos y cantidad; no solo
  una referencia mutable al catálogo.
- `order_status_events`: historial inmutable de las transiciones.
- `payment_attempts`: proveedor, referencias externas, estado y cantidades,
  sin datos de tarjeta.
- `payment_webhook_events`: recepción idempotente y auditable de webhooks.
- `preparation_tickets`: destino de cocina/bar y su estado.
- `integration_outbox`: eventos confirmados en la misma transacción que el
  pedido y pendientes de entregar a sistemas externos.
- `tpv_connections` y `tpv_delivery_attempts`: configuración cifrada,
  reintentos, respuesta del TPV y claves de idempotencia.

El precio, restaurante y mesa se validarán en el servidor. El cliente nunca
será la fuente de verdad de los importes.

## Mapa de servicios propuesto

Para la demo se mantiene un monolito modular con procesos separados, evitando
microservicios prematuros y transacciones distribuidas:

```text
React web
   │
   ├── lecturas públicas protegidas por RLS ──> Supabase
   │
   └── operaciones sensibles ──> FastAPI
                                  ├── PostgreSQL / Auth / Storage
                                  ├── proveedor de pagos
                                  └── outbox / cola ──> worker
                                                        ├── TPV bridge
                                                        └── OCR y traducción
```

- **`apps/web`:** web corporativa, cartas y panel del restaurante.
- **`apps/api` (siguiente vertical):** FastAPI para sesiones de mesa, precios,
  checkout, webhooks y comandos operativos.
- **`apps/worker` (cuando exista el primer trabajo asíncrono):** reintentos de
  TPV, procesamiento de cartas e integraciones.
- **`apps/tpv-bridge` (piloto):** agente instalado en el ordenador del local.
  Hará conexiones salientes y adaptará el protocolo concreto del TPV, sin
  abrir el equipo del restaurante a conexiones públicas entrantes.

Redis y Celery no se añaden todavía. Para el primer ciclo conviene usar una
outbox transaccional en PostgreSQL y evaluar Supabase Queues (`pgmq`) para
trabajos duraderos. Redis se reservará para datos efímeros, rate limiting o
caché si las mediciones lo justifican; Celery se incorporará si el worker Python
de OCR, traducción o integración necesita su modelo de ejecución y reintentos.

Para las comandas del panel se priorizará Realtime Broadcast. Los eventos de
negocio seguirán persistidos en PostgreSQL: el tiempo real mejora la interfaz,
pero no reemplaza la cola ni el historial auditable.

## Pagos y liquidación

Apple Pay será un método presentado por un proveedor de servicios de pago, no
el mecanismo que por sí solo envía dinero al banco del restaurante. Antes de
elegir proveedor se deben validar:

- disponibilidad de Apple Pay web en España y dominios verificados;
- cuentas conectadas o marketplace para liquidar a cada restaurante;
- comisiones de POMA, reembolsos, propinas e impuestos;
- proceso KYC/KYB y titularidad de la cuenta bancaria;
- webhooks, idempotencia, conciliación y entorno sandbox;
- responsabilidades PSD2 y contractuales.

La decisión de proveedor permanece pendiente; no se almacenarán números de
tarjeta ni secretos de pago en React.

## Verificación de la vertical

- TypeScript, lint y build de producción correctos con Node 24.20.0.
- Base local recreada desde cero con todas las migraciones.
- Asesores locales sin incidencias de nivel warning o error.
- Asesor remoto de seguridad sin incidencias.
- Índices de todas las claves foráneas presentes. Los avisos informativos de
  índices todavía no usados son esperables con una base recién creada.
- Lectura anónima remota: 9 productos visibles y 0 mesas visibles.
- Prueba real de navegador en formato móvil: añadir producto, mostrar una línea
  en el carrito, calcular 6,90 € y abrir la hoja de comanda.
- Revisión visual de la portada en escritorio y de la carta en formato móvil.

## Próxima vertical recomendada

Persistencia segura de la comanda, antes de integrar pagos:

1. sesión de mesa validada por token;
2. tablas de pedidos y eventos;
3. función transaccional o endpoint FastAPI que recalcula precios;
4. panel de comandas en tiempo real;
5. pruebas de RLS, idempotencia y concurrencia.

Con esa base se podrá añadir el proveedor de pagos sin mezclar dinero real con
un modelo de pedidos todavía inestable.

## Historial

- **05/09/2026 23:40 CEST:** se completa la primera vertical de la demo, se
  publica el catálogo multitenant en Supabase y se fija la arquitectura de los
  siguientes pasos.
- **05/09/2026 23:42 CEST:** finalizan las pruebas de navegador, la validación
  integral local y la comprobación de que las migraciones locales y remotas
  están sincronizadas.
- **06/09/2026 00:36 CEST:** la ruta `/demo` queda obsoleta y se separa la
  presentación para clientes de la herramienta de operación interna.
