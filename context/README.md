# Contexto vivo de POMA

**Creado:** 05/09/2026 22:11 CEST  
**Última actualización:** 06/09/2026 13:53 CEST

Esta carpeta es la fuente rápida de contexto funcional y técnico para las
personas y agentes de código que trabajen en POMA.

## Convención del diario

- Cada registro usa el nombre `AAAA-MM-DD_HH-MM_tema.md`.
- Todo registro indica fecha y hora de creación y de última actualización,
  incluida la zona horaria.
- Las decisiones nuevas no borran el historial. Si una decisión deja de estar
  vigente, se marca como **obsoleta** y se enlaza la que la sustituye.
- Los cambios relevantes se añaden al historial del documento correspondiente.
- El estado de cada iniciativa se expresa como `pendiente`, `en curso`,
  `bloqueada`, `completada` u `obsoleta`.

## Registros

| Fecha y hora | Documento | Contenido |
| --- | --- | --- |
| 05/09/2026 22:24 CEST | [Inicio y hoja de ruta](./2026-09-05_22-11_inicializacion-y-hoja-de-ruta.md) | Visión, alcance, arquitectura inicial y fases previstas |
| 05/09/2026 22:29 CEST | [Supabase MCP y Agent Skills](./2026-09-05_22-29_supabase-mcp-y-skills.md) | Conexión de Codex al proyecto remoto y skills instaladas |
| 05/09/2026 22:34 CEST | [Conexión del frontend con Supabase remoto](./2026-09-05_22-34_conexion-frontend-supabase-remoto.md) | Variables Vite, política de claves y validación remota |
| 05/09/2026 23:40 CEST | [Demo, vertical 001: catálogo multitenant](./2026-09-05_23-40_demo-vertical-001-catalogo-multitenant.md) | Recorrido visual, esquema desplegado, arquitectura multitenant y próximos servicios |
| 06/09/2026 00:21 CEST | [Identidad, onboarding y superadministración](./2026-09-06_00-21_identidad-onboarding-y-superadministracion.md) | Auth, alta transaccional de restaurantes, roles, consola global y pruebas de aislamiento |
| 06/09/2026 00:36 CEST | [Pages y QR aislado de DEMO](./2026-09-06_00-36_pages-y-qr-demo-aislada.md) | Cuenta global activa, herramienta interna, Pages publicado y QR verificado desde Internet |
| 06/09/2026 01:18 CEST | [Identidad visual POMA v1](./2026-09-06_01-18_identidad-visual-logo-v1.md) | Logo SVG, sistema visual verde/dorado, favicon y aplicación transversal a consolas y cartas |
| 06/09/2026 02:10 CEST | [Auditoría funcional, registro y tests web](./2026-09-06_01-53_auditoria-funcional-registro-y-tests-web.md) | Vectorización fiel del PNG, diagnóstico de Auth, correcciones funcionales y suite integral Playwright |
| 06/09/2026 13:43 CEST | [API central y laboratorio Oracle Simphony](./2026-09-06_13-23_api-y-laboratorio-simphony.md) | FastAPI central, validación QR, límite TPV neutral, adaptador STSG2, mock Docker y pruebas de extremo a extremo |
| 06/09/2026 13:53 CEST | [Guía local y alcance sin sandbox Oracle](./2026-09-06_13-50_guia-local-sin-sandbox-oracle.md) | Aclaración del alcance de laboratorio y runbook para levantar y probar toda la plataforma local |
