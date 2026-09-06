# Desarrollo local y ejecución de pruebas

**Creado:** 06/09/2026 13:50 CEST  
**Última actualización:** 06/09/2026 13:53 CEST  
**Alcance:** laboratorio local anterior al sandbox real de Oracle

Esta guía permite levantar y verificar la vertical completa disponible hoy:

```text
React
  └── POMA API
      ├── Supabase local
      └── TPVAdapter → OracleSimphonyAdapter → Simphony Mock
```

## Qué simula esta versión

Esta primera versión está diseñada expresamente para trabajar **sin sandbox ni
TPV Oracle real**. `labs/simphony-mock` ofrece fixtures deterministas, acepta un
bearer estático de desarrollo y conserva los checks únicamente en memoria.

No están implementados todavía OIDC de Oracle, pagos, pedidos persistentes,
webhooks, workers ni `tpv-bridge`. Ningún paso de esta guía debe apuntar a una
instalación Oracle real.

## Requisitos

- Linux, macOS o Windows con WSL2.
- Git.
- Docker Engine o Docker Desktop con Docker Compose v2.
- Node.js indicado en `.nvmrc` y npm.
- `uv` para los dos proyectos Python.
- `curl` y `jq` para el smoke test HTTP.

Comprobación rápida:

```bash
docker version
docker compose version
node --version
npm --version
uv --version
```

## 1. Preparación inicial

Desde la raíz del repositorio:

```bash
nvm install
nvm use
npm ci
uv sync --frozen --project apps/api
uv sync --frozen --project labs/simphony-mock
```

`npm ci` debe utilizarse para reproducir exactamente `package-lock.json`. Los
dos comandos `uv sync --frozen` hacen lo mismo con cada `uv.lock`.

## 2. Configurar el entorno local

### Supabase y React

Arranca primero Supabase:

```bash
npm run db:start
npx supabase status -o env
```

La segunda orden muestra `API_URL` y `PUBLISHABLE_KEY`. Crea la configuración
local del frontend:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edita `apps/web/.env.local` con los valores locales:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY mostrada por Supabase>
VITE_API_URL=http://localhost:8000
```

### POMA API y Simphony Mock

```bash
cp .env.compose.example .env.compose
```

En `.env.compose`, conserva la URL local accesible desde Docker y sustituye
únicamente la clave publicable:

```dotenv
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY mostrada por Supabase>
SIMPHONY_TOKEN=local-development-token
POMA_API_PORT=8000
ENABLE_LAB_ENDPOINTS=true
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
```

Los archivos `.env`, `.env.local` y `.env.compose` están ignorados por Git. No
uses ni copies una clave `service_role`; la clave publicable es suficiente.

## 3. Levantar toda la plataforma

Si es la primera ejecución o han cambiado las migraciones, reconstruye la base
local:

```bash
npm run db:reset
```

Este reset elimina y recrea **solo la base local**, aplica las migraciones y
ejecuta `supabase/seed.sql`. No añadas `--linked`.

Levanta POMA API y Simphony Mock:

```bash
docker compose --env-file .env.compose up -d --build --wait
docker compose --env-file .env.compose ps
```

Finalmente inicia React en otra terminal:

```bash
npm run dev
```

Servicios esperados:

| Servicio | URL |
| --- | --- |
| React | `http://localhost:5173` |
| POMA API | `http://localhost:8000` |
| Swagger de POMA API | `http://localhost:8000/docs` |
| Simphony Mock | `http://localhost:9100` |
| Supabase API | `http://localhost:54321` |
| Supabase Studio | `http://localhost:54323` |

## 4. Verificación manual

Salud de todos los componentes:

```bash
curl -sS http://localhost:8000/api/v1/health | jq
curl -sS http://localhost:9100/health | jq
```

La primera respuesta debe indicar `status: "ok"`, `supabase.status: "ok"` y
`tpv.status: "ok"`.

Catálogo DEMO validado mediante el token del fixture QR:

```bash
curl -sS \
  'http://localhost:8000/api/v1/restaurants/demo/catalog?table=c0ffee00-0000-4000-8000-000000000001' \
  | jq
```

Recorrido completo API → adaptador → mock, incluida la idempotencia:

```bash
npm run test:integration
```

El script utilizado está en `tests/integration/tpv-lab-smoke.sh`. Verifica
salud, catálogo, cálculo, creación, segunda creación con la misma clave y
recuperación del mismo check.

## 5. Pruebas disponibles

### Frontend rápido

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

### Python

```bash
npm run python:lint
npm run python:test
```

Ejecuta por separado 11 pruebas de POMA API y 9 del Simphony Mock utilizando
el entorno virtual correspondiente a cada servicio.

### PostgreSQL y migraciones

```bash
npm run db:start
npm run db:reset
npx supabase test db
npm run db:types
```

`db:reset` demuestra que el esquema puede reconstruirse desde cero. `supabase
test db` ejecuta pgTAP y `db:types` regenera los tipos TypeScript desde la base
local.

### Navegador completo

Antes de esta suite, detén POMA API si ya ocupa el puerto elegido:

```bash
docker compose --env-file .env.compose down
POMA_TEST_API_PORT=18001 npm test
```

`npm test` levanta Supabase local, reinicia la base, arranca una POMA API de
pruebas, ejecuta Playwright contra React y detiene Supabase al finalizar. El
puerto alternativo evita colisiones con otro servicio en `8000`.

### Validación completa recomendada

```bash
npm ci
npm run lint
npm run typecheck
npm run test:ci
npm run build
npm run python:lint
npm run python:test

npm run db:start
npm run db:reset
npx supabase test db

docker compose --env-file .env.compose up -d --build --wait
npm run test:integration
docker compose --env-file .env.compose down

POMA_TEST_API_PORT=18001 npm test
```

## 6. Usar otro puerto para POMA API

Si `8000` ya está ocupado:

```bash
POMA_API_PORT=18000 docker compose --env-file .env.compose up -d --build --wait
POMA_API_URL=http://localhost:18000 npm run test:integration
```

En ese caso cambia también `VITE_API_URL` en `apps/web/.env.local` a
`http://localhost:18000` y reinicia Vite.

## 7. Diagnóstico rápido

- `health.status` aparece como `degraded`: comprueba `npm run db:start`, la
  clave de `.env.compose` y `docker compose ... logs poma-api`.
- POMA API no conecta con Supabase: dentro de Compose debe usarse
  `host.docker.internal`, no `localhost`.
- El catálogo responde `403`: usa el QR correcto; una mesa inactiva y un token
  desconocido se rechazan de la misma forma.
- `/api/v1/lab/tpv/*` responde `404`: confirma
  `ENABLE_LAB_ENDPOINTS=true` y reconstruye el contenedor.
- Un puerto está ocupado: usa el procedimiento de la sección anterior o
  detén solamente el proceso que conozcas y controles.
- Una migración falla: lee el nombre y error mostrados por `db:reset`; no
  pruebes la corrección directamente sobre el remoto.

## 8. Apagar el entorno

```bash
docker compose --env-file .env.compose down
npm run db:stop
```

Supabase conserva un backup de su volumen local. No uses `--no-backup` salvo
que quieras borrar deliberadamente esos datos de desarrollo.

## Acciones excluidas de esta guía

No ejecutes para desarrollo local:

```text
supabase db reset --linked
supabase db push
```

Tampoco cambies `SIMPHONY_BASE_URL` para apuntar a Oracle. La futura conexión
al sandbox necesitará credenciales, configuración y el flujo OIDC oficial; se
implementará y validará en una vertical separada.
