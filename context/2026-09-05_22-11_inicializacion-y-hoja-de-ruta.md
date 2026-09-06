# Registro 001 — Inicialización y hoja de ruta

**Creado:** 05/09/2026 22:11 CEST  
**Última actualización:** 06/09/2026 13:43 CEST
**Estado:** fases 1–2 completadas; fase 3 iniciada con laboratorio TPV;
integración real y fase 4 pendientes

> **Actualización 06/09/2026 13:23 CEST:** la fase 3 ya dispone de FastAPI,
> contrato neutral de TPV, adaptador Oracle Simphony STSG2 y laboratorio local.
> El detalle y los límites están en
> [API central y laboratorio Oracle Simphony](./2026-09-06_13-23_api-y-laboratorio-simphony.md).

## Visión del producto

POMA será una plataforma transversal para bares y restaurantes. Cada mesa
tendrá un QR que abrirá la web del establecimiento. Desde ella, el cliente podrá
consultar la carta, añadir comida o bebida al carrito, confirmar el pedido y
pagarlo sin esperar a que un camarero tome nota.

La comanda pagada llegará al flujo operativo del bar de forma similar a un
pedido de una plataforma de reparto: se mostrará donde el personal pueda
gestionarla, se enviará a cocina y quedará registrada para la contabilidad.

## Propuesta de valor

- Reducir la necesidad de personal dedicado a tomar nota y cobrar. El personal
  de sala puede concentrarse en llevar los productos a la mesa correcta.
- Permitir que ese trabajo requiera menos experiencia y formación específica.
- Aumentar la agilidad desde la elección hasta la preparación del pedido.
- Evitar errores humanos de transcripción, mesa, productos o cobro.
- Ofrecer una implantación basada únicamente en software y códigos QR, sin
  imponer hardware adicional al establecimiento.

## Experiencia objetivo

### Cliente

1. Escanea el QR asociado a su mesa.
2. Consulta la carta disponible y sus traducciones.
3. Añade productos, cantidades y opciones al carrito.
4. Confirma y paga desde la misma web.
5. Sigue el estado del pedido hasta que se sirve.

### Establecimiento

1. Da de alta el bar o restaurante, sus usuarios y sus mesas.
2. Importa o mantiene la carta.
3. Recibe las comandas pagadas en el ordenador del local y en cocina.
4. Gestiona el estado del pedido y conserva el registro económico.

## Principios iniciales

- **Software primero:** el único elemento físico específico será el QR impreso.
- **Integración sencilla:** el alta debe ser viable para cualquier bar sin un
  proyecto técnico a medida.
- **Multi-tenant:** datos y permisos de cada establecimiento completamente
  aislados de los demás.
- **Móvil primero:** la experiencia principal del cliente comienza en su móvil.
- **Trazabilidad:** pedidos, pagos, estados e integraciones deben ser auditables.
- **Configurabilidad:** impuestos, idiomas, carta y operativa variarán según el
  establecimiento.

## Arquitectura y fases

### 1. Inicialización — completada (05/09/2026 22:24 CEST)

- Monorepo administrado inicialmente con npm workspaces.
- Node.js 24 LTS como runtime de desarrollo; el mínimo compatible es 22.12.
- Frontend vacío y listo para desarrollo con React, TypeScript y Vite en
  `apps/web`.
- Backend gestionado con Supabase: PostgreSQL, autenticación, almacenamiento y
  tiempo real cuando sean necesarios.
- Configuración local reproducible de Supabase en `supabase/`.
- Diario de contexto en `context/` y dedicación en `Seguimiento/`.

### 2. DevOps — pendiente (05/09/2026 22:11 CEST)

- Workflow de GitHub ejecutado sobre `main`.
- Despliegue automático del frontend en GitHub Pages.
- Despliegue de cambios de base de datos solamente cuando existan migraciones.
- Estrategia amplia de tests, incluyendo pruebas de navegador. Se valorará
  Selenium frente a alternativas actuales antes de elegir.
- Lint sencillo y automatizado.
- Revisión automática de pull requests para errores y oportunidades de
  optimización.
- Investigar la integración oficial disponible con una cuenta ChatGPT Pro. No
  se asume todavía que la suscripción personal incluya consumo de API o un
  revisor de GitHub.

### 3. API e integración con TPV — pendiente y crítica (05/09/2026 22:11 CEST)

- Incorporar una API con FastAPI entre el frontend, Supabase y las integraciones
  operativas.
- Diseñar adaptadores para comunicar pedidos y estados con el TPV del local.
- Mantener interfaces desacopladas porque cada fabricante puede ofrecer
  protocolos y capacidades diferentes.
- **TODO crítico:** validar la integración de extremo a extremo durante un
  piloto en un bar o restaurante real. No se considera completada hasta superar
  esa prueba.

### 4. Escáner de cartas e IA — pendiente (05/09/2026 22:11 CEST)

- Recibir fotografías o documentos de una carta.
- Extraer categorías, productos, descripciones, precios y opciones mediante
  visión por computador.
- Presentar una revisión humana antes de publicar el catálogo.
- Traducir la carta a los idiomas configurados.
- Integrar una API empresarial de OpenAI mediante secretos de servidor; la
  clave nunca se expondrá en React ni se guardará en Git.

## Estructura de datos prevista

El modelo definitivo se diseñará antes de implementar negocio. Como mínimo
deberá representar:

- organizaciones/establecimientos, sedes, usuarios administradores, membresías
  y roles;
- clientes identificados o invitados, respetando minimización de datos;
- zonas, mesas y códigos QR revocables;
- cartas, versiones, categorías, productos, variantes, modificadores,
  disponibilidad, alérgenos, impuestos, precios, divisas e idiomas;
- sesiones de mesa, carritos, pedidos, líneas y transiciones de estado;
- pagos, reembolsos y referencias del proveedor de pagos, sin almacenar datos
  de tarjeta;
- destinos de preparación, comandas de cocina y eventos de entrega;
- integraciones TPV, intentos de sincronización, errores e idempotencia;
- archivos de cartas importadas, trabajos de extracción, confianza y revisión;
- auditoría de cambios relevantes.

Supabase Auth será la fuente de identidad. PostgreSQL y sus políticas de Row
Level Security deberán imponer el aislamiento entre establecimientos; no se
confiará únicamente en filtros del frontend.

## Decisiones pendientes

- Proveedor de pagos, reparto de fondos, comisiones y tratamiento de propinas.
- País inicial, fiscalidad, facturación y requisitos legales aplicables.
- Si el cliente debe crear cuenta o puede completar todo como invitado.
- Formato y ciclo de vida de los QR y de las sesiones de mesa.
- Primer TPV objetivo y capacidades de integración disponibles.
- Pantalla de cocina, impresión y gestión cuando se pierde la conexión.
- Política de privacidad, retención de datos, alérgenos y accesibilidad.
- Modelo de precios de POMA y estrategia de soporte al establecimiento.

## Historial

- **05/09/2026 22:11 CEST:** se registra la visión inicial, se separan las cuatro
  fases y se identifican el modelo multi-tenant y la integración TPV como
  decisiones arquitectónicas críticas.
- **05/09/2026 22:24 CEST:** finaliza la fase de inicialización. Se validan lint,
  tipos y build del frontend, así como arranque, migración inicial, semilla,
  generación de tipos y parada limpia de Supabase local.
