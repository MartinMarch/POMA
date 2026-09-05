# Registro 003 — Conexión del frontend con Supabase remoto

**Creado:** 05/09/2026 22:34 CEST  
**Última actualización:** 05/09/2026 22:34 CEST  
**Estado:** completado

## Objetivo

Conectar el frontend React de POMA al proyecto remoto de Supabase mediante las
variables de entorno recomendadas para Vite.

## Configuración

- Proyecto Supabase: `dujjezogyjaqlzvopepj`.
- URL: `https://dujjezogyjaqlzvopepj.supabase.co`.
- Archivo local: `apps/web/.env.local`.
- Variables utilizadas: `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Plantilla versionada y sin credenciales: `apps/web/.env.example`.

El identificador del proyecto ya forma parte de la URL, por lo que el cliente
de Supabase no necesita una tercera variable con el `project_ref`.

## Seguridad

- Se utiliza una clave moderna `sb_publishable_…`, diseñada para clientes web.
- No se ha recuperado ni escrito ninguna clave `sb_secret_…`, `service_role` ni
  contraseña de base de datos.
- `.env.local` está excluido por `.gitignore` y no se subirá al repositorio.
- La clave publicable no sustituye la autorización: las tablas que se expongan
  al navegador deberán tener permisos mínimos y políticas Row Level Security.

## Verificación

- La URL y la clave fueron obtenidas directamente mediante el MCP autenticado
  del proyecto.
- El cliente `@supabase/supabase-js` se pudo inicializar con la configuración.
- Una petición de lectura a la configuración de Auth respondió `HTTP 200` desde
  `dujjezogyjaqlzvopepj.supabase.co`.
- Lint, comprobación TypeScript y build de producción finalizaron correctamente.

## Historial

- **05/09/2026 22:34 CEST:** frontend conectado al proyecto remoto y conexión
  validada sin escrituras.
