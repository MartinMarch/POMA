# Publicación de la API y el laboratorio en el repositorio

**Creado:** 06/09/2026 14:16 CEST
**Última actualización:** 06/09/2026 14:16 CEST
**Estado:** código publicado y frontend Pages verificado

## Publicación

La primera vertical de POMA API y el laboratorio Simphony se publicó en
`main` mediante el commit `8dfbc26` (`Add POMA API and Simphony integration
lab`). El envío incluye código, migración, tests, Docker y documentación, pero
no contiene los archivos locales `.env.compose` ni `apps/web/.env.local`.

Antes del push se ejecutaron con resultado correcto:

- `npm ci`, lint, comprobación TypeScript, 4 pruebas CI y build con base
  `/POMA/`;
- Ruff y 20 pruebas Python;
- `git diff --check` y un escaneo de patrones de credenciales sobre los blobs
  preparados para el commit.

## GitHub Pages

El workflow `Deploy frontend to GitHub Pages`, ejecución `34032506401`, terminó
correctamente en sus jobs `build` y `deploy`. La publicación se comprobó en
`https://martinmarch.github.io/POMA/` con 3 pruebas de navegador sobre portada,
flujo de alta/acceso, fallback SPA, ruta desconocida y logo SVG.

## Límite de despliegue actual

GitHub Pages aloja únicamente React. La carta por QR ahora depende de POMA API,
que aún no tiene alojamiento público, y `VITE_API_URL` no dispone todavía de
una URL de producción. Por ello, el frontend corporativo y de configuración
está publicado, pero el catálogo QR no quedará operativo por Internet hasta
desplegar FastAPI y configurar esa variable. El laboratorio completo continúa
siendo reproducible en local mediante `DESARROLLO_LOCAL.md`.
