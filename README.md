# POMA

Plataforma de pedidos y pagos para bares y restaurantes. El cliente accede a la
carta mediante el QR de su mesa, realiza y paga el pedido, y el establecimiento
recibe la comanda para prepararla y servirla.

## Estado

La primera versión incluye una herramienta de acceso y configuración,
autenticación de propietarios, alta de restaurantes y una consola global de
superadministración. La experiencia DEMO para clientes se mantiene separada y
solo se distribuye mediante el QR de una mesa. La persistencia de pedidos, el
pago real y el conector TPV son las siguientes verticales.

## Recorridos disponibles

| Ruta | Uso |
| --- | --- |
| `/` | Acceso a la herramienta de monitorización y configuración |
| `/r/:slug` | Plantilla dinámica de carta; no se enlaza la DEMO desde la herramienta |
| `/registro` | Mapa del alta guiada de un restaurante |
| `/acceso` | Inicio de sesión y creación de cuentas |
| `/panel` | Panel de propietario o consola global, según el rol |
| `/alta-restaurante` | Registro protegido de un nuevo restaurante |
| `/admin/:slug` | Estado protegido del futuro panel operativo y TPV |

## Requisitos

- Node.js 22.12 o superior (el repositorio fija la LTS recomendada en `.nvmrc`).
- npm 10 o superior.
- Docker o un runtime compatible para ejecutar Supabase en local.

## Puesta en marcha

```bash
nvm install
nvm use
npm install
cp apps/web/.env.example apps/web/.env.local
```

Configura en `apps/web/.env.local` la URL y la clave publicable del proyecto
remoto. Esta copia de trabajo ya las tiene configuradas en ese archivo, que Git
ignora. Después inicia React:

```bash
npm run dev
```

La web queda disponible normalmente en `http://localhost:5173`.

## Demo por QR

La presentación del restaurante `DEMO` se abre exclusivamente con el QR de la
Mesa 01. Los archivos para pantalla e impresión están en
[`assets/qr/`](./assets/qr/README.md). La ruta abre únicamente cuando incluye
el token de mesa esperado; `/demo` ya no existe y la vista se marca como
`noindex`.

## GitHub Pages

El workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
valida lint y tipos, compila React con la ruta base proporcionada por Pages,
añade el fallback `404.html` necesario para las rutas SPA y publica el artefacto
en cada `push` a `main`.

La herramienta está publicada en
[`https://martinmarch.github.io/POMA/`](https://martinmarch.github.io/POMA/).

La URL y la clave publicable de Supabase se leen desde las variables de GitHub
Actions `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Son parámetros
de cliente; ninguna clave `service_role` ni contraseña se guarda en Git.

Para desarrollar contra Supabase local en lugar del proyecto remoto, ejecuta
`npm run db:start` y sustituye temporalmente los valores de `.env.local` por la
URL y la clave publicable que muestra el comando. Supabase Studio queda entonces
disponible en `http://localhost:54323`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia el frontend en desarrollo |
| `npm run build` | Compila el frontend |
| `npm run lint` | Ejecuta el linter |
| `npm run typecheck` | Comprueba los tipos TypeScript |
| `npm run db:start` | Inicia Supabase local |
| `npm run db:stop` | Detiene Supabase local |
| `npm run db:reset` | Recrea la base de datos desde migraciones y semillas |
| `npm run db:link -- --project-ref <id>` | Enlaza un proyecto remoto |
| `npm run db:types` | Regenera los tipos TypeScript de la base de datos local |

## Estructura

```text
POMA/
├── .github/          # Automatización de integración y despliegue
├── apps/
│   └── web/          # Herramienta interna, cartas y panel con React
├── assets/           # Material operativo, incluidos los QR de mesas
├── context/          # Contexto y diario técnico del proyecto
├── Seguimiento/      # Registro de sesiones y dedicación
└── supabase/         # Configuración, migraciones y semillas locales
```

La visión, las decisiones y la hoja de ruta están en
[`context/`](./context/README.md). El tiempo invertido se registra en
[`Seguimiento/`](./Seguimiento/README.md).

La arquitectura de la demo y el esquema actual están documentados en
[`context/2026-09-05_23-40_demo-vertical-001-catalogo-multitenant.md`](./context/2026-09-05_23-40_demo-vertical-001-catalogo-multitenant.md).

El modelo de identidad, la activación de administradores y las garantías de
seguridad están en
[`context/2026-09-06_00-21_identidad-onboarding-y-superadministracion.md`](./context/2026-09-06_00-21_identidad-onboarding-y-superadministracion.md).
