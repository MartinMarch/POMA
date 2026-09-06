# Tests de POMA

**Creado:** 06/09/2026 01:37 CEST  
**Última actualización:** 06/09/2026 13:43 CEST

Esta carpeta concentra las pruebas transversales de POMA. Las suites unitarias
propias de cada servicio Python viven junto a esos servicios.

## Cobertura actual

- `unit/`: rutas internas seguras, generación de slugs y traducción de errores
  de Supabase Auth.
- `e2e/public-and-cart.spec.ts`: portada, acceso por QR, aislamiento de DEMO,
  catálogo real, carrito y rutas inexistentes.
- `e2e/auth-and-onboarding.spec.ts`: protección de sesión, registro local real,
  login, creación transaccional de restaurante, publicación, RLS y rol
  superadministrador, incluida la eliminación controlada de cuentas y locales.
- `e2e/logo.spec.ts`: regresión visual del SVG para evitar nuevas
  deformaciones. La navegación pública comprueba también que el favicon se
  entrega como SVG.
- `integration/tpv-lab-smoke.sh`: comprueba con HTTP real el recorrido POMA
  API → `TPVAdapter` → Simphony Mock, incluida la idempotencia.

## Ejecución

```bash
npm test
```

El comando levanta únicamente los servicios locales de Supabase necesarios
para Auth y REST, reconstruye la base desde migraciones, inyecta sus claves
públicas en Vite, ejecuta Chrome con Playwright y detiene los servicios al
terminar. Requiere Docker y Google Chrome.

El repositorio fija Node.js 24.20.0 en `.nvmrc`. Antes de instalar o ejecutar
las pruebas, activa esa versión con `nvm use`.

Para regenerar deliberadamente snapshots visuales:

```bash
npm run test:web:update
```

El deploy de Pages ejecuta el subconjunto determinista de lógica e invariantes
del SVG. No requiere descargar Supabase ni depende del rasterizador de una
versión concreta de Chrome en el runner efímero:

```bash
npm run test:ci
```

La validación integral y mutable permanece en `npm test`; siempre utiliza la
base local reconstruida y nunca el proyecto remoto.

Para una comprobación pública de solo lectura sobre Pages:

```bash
npm run test:smoke
```

Con Supabase local y los dos servicios de `compose.yaml` ya levantados:

```bash
npm run test:integration
```

El smoke requiere `curl` y `jq`. El token que aparece en el script es solo el
fixture público determinista del entorno DEMO; no se importa ni se compila en
React.

Las pruebas nunca deben apuntar los flujos mutables de autenticación contra el
proyecto remoto.
