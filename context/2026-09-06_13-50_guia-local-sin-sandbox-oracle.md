# Guía local y alcance sin sandbox Oracle

**Creado:** 06/09/2026 13:50 CEST  
**Última actualización:** 06/09/2026 13:53 CEST  
**Estado:** completado

## Aclaración de alcance

La primera vertical de integración TPV está diseñada expresamente para poder
desarrollarse y probarse antes de disponer de un sandbox real de Oracle. El
objetivo actual es validar los límites entre React, POMA API, Supabase y un
adaptador neutral mediante un mock controlado; no certificar la conexión con
Simphony.

El bearer estático, los fixtures `POMALAB` y los checks en memoria pertenecen
exclusivamente al laboratorio. La conexión real seguirá pendiente hasta
implementar OIDC y contrastar el contrato contra el sandbox o TPV del piloto.

## Guía operativa

Se incorpora `DESARROLLO_LOCAL.md` como runbook único para:

- instalar dependencias reproducibles con npm y uv;
- configurar las claves publicables locales sin `service_role`;
- levantar Supabase CLI, POMA API, Simphony Mock y React;
- ejecutar lint, tipos, build, pytest, pgTAP, Playwright y el smoke Docker;
- resolver colisiones de puerto y errores habituales;
- apagar los servicios conservando el volumen local.

La guía evita comandos remotos destructivos y deja explícitamente fuera
`supabase db reset --linked`, `supabase db push` y cualquier conexión a Oracle.
