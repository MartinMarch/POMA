# POMA

Plataforma de pedidos y pagos para bares y restaurantes. El cliente accede a la
carta mediante el QR de su mesa, realiza y paga el pedido, y el establecimiento
recibe la comanda para prepararla y servirla.

## Estado

Proyecto inicializado. La aplicación todavía no contiene funcionalidad de
negocio.

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
npm run db:start
```

Al arrancar, Supabase muestra las credenciales locales. Copia la clave
publicable en `apps/web/.env.local` y después inicia React:

```bash
npm run dev
```

La web queda disponible normalmente en `http://localhost:5173` y Supabase
Studio en `http://localhost:54323`.

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
├── apps/
│   └── web/          # React, TypeScript y Vite
├── context/          # Contexto y diario técnico del proyecto
├── Seguimiento/      # Registro de sesiones y dedicación
└── supabase/         # Configuración, migraciones y semillas locales
```

La visión, las decisiones y la hoja de ruta están en
[`context/`](./context/README.md). El tiempo invertido se registra en
[`Seguimiento/`](./Seguimiento/README.md).
