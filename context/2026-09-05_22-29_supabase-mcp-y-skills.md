# Registro 002 — Supabase MCP y Agent Skills

**Creado:** 05/09/2026 22:29 CEST  
**Última actualización:** 05/09/2026 22:29 CEST  
**Estado:** completado

## Objetivo

Dar a Codex acceso directo y limitado al proyecto remoto de Supabase de POMA,
además de instalar instrucciones especializadas para el trabajo posterior con
Supabase y PostgreSQL.

## Configuración realizada

- Servidor MCP global de Codex: `supabase`.
- Proyecto remoto: `dujjezogyjaqlzvopepj`.
- Transporte: Streamable HTTP con OAuth.
- Grupos solicitados: documentación, cuenta, base de datos, depuración,
  desarrollo, funciones y branching.
- El parámetro `project_ref` limita el servidor al proyecto de POMA. En este
  modo, las herramientas de cuenta incompatibles con el alcance del proyecto
  pueden no estar disponibles aunque aparezcan en la lista de features.
- La conexión no está configurada como solo lectura porque más adelante deberá
  aplicar migraciones y desplegar funciones. Toda escritura debe revisarse antes
  de ejecutarse y nunca debe utilizarse contra producción sin controles
  adicionales.

La configuración y las credenciales OAuth se guardan en el entorno global de
Codex y no dentro del repositorio. No se ha almacenado ningún token en Git.

## Incidencia de autenticación

Con Codex CLI `0.153.0`, el registro dinámico automático solicitó scopes que el
servidor OAuth de Supabase rechazó. Se resolvió iniciando el registro DCR con la
lista explícita de scopes admitidos por Supabase. La autenticación se completó
en el navegador.

## Verificación

- `codex mcp list` muestra `supabase` habilitado con autenticación OAuth.
- Un proceso nuevo de Codex ejecutó la herramienta MCP de solo lectura
  `get_project_url` y confirmó acceso a `dujjezogyjaqlzvopepj`.
- La prueba no ejecutó SQL ni modificó el proyecto remoto.

## Skills instaladas

Se instalaron globalmente desde el repositorio oficial
`supabase/agent-skills`:

- `supabase`: instrucciones generales para productos, CLI, MCP, seguridad y
  desarrollo con Supabase.
- `supabase-postgres-best-practices`: prácticas de diseño, rendimiento,
  concurrencia y Row Level Security en PostgreSQL.

Las skills estarán disponibles automáticamente para nuevas sesiones o turnos
de Codex que detecten una tarea relacionada.

## Historial

- **05/09/2026 22:29 CEST:** servidor añadido, OAuth completado, acceso remoto
  verificado e instalación de las dos skills finalizada.
