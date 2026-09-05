# Registro 006 — Herramienta interna, Pages y QR aislado de DEMO

**Creado:** 06/09/2026 00:36 CEST
**Última actualización:** 06/09/2026 00:47 CEST
**Estado:** implementación local completada; publicación bloqueada por el plan de GitHub

## Decisión de producto

La web raíz deja de presentar o enlazar la experiencia del restaurante DEMO.
Su responsabilidad actual es servir como herramienta de monitorización,
autenticación y configuración de clientes:

- acceso al panel de propietario o a la consola global;
- alta guiada de cuentas y restaurantes;
- consulta y administración de usuarios, tenants y catálogos;
- preparación de configuración operativa e integraciones.

La DEMO comercial se conserva como una experiencia separada y no descubrible
desde la interfaz. `/demo` se elimina. El acceso válido actual es el QR de la
Mesa 01, que apunta directamente a `/r/demo` con su token. La vista rechaza la
ausencia o sustitución del token y añade `noindex, nofollow` mientras está
montada. Esto reduce la exposición accidental, pero no sustituye la futura
validación de sesiones de mesa en el servidor.

## Cuenta global

La cuenta designada por el propietario se creó mediante Supabase Auth, se
confirmó y recibió el rol mediante la allowlist privada ya desplegada. Se
verificaron dos condiciones con llamadas reales:

1. el inicio de sesión con contraseña devuelve una sesión válida;
2. la sesión puede leer su propia fila en `app_admins` a través de RLS.

No se registra ninguna credencial ni token de sesión en Git, `context/` o
`Seguimiento/`.

## Publicación en GitHub Pages

Se añade `.github/workflows/deploy-pages.yml`, ejecutado solo por `push` a
`main` o manualmente. El pipeline:

1. instala dependencias reproducibles con Node fijado por `.nvmrc`;
2. ejecuta lint y comprobación TypeScript;
3. obtiene la ruta base de GitHub Pages;
4. compila Vite con variables públicas de Supabase almacenadas en GitHub
   Actions;
5. genera `404.html` como fallback de la SPA;
6. publica mediante el artefacto oficial de Pages.

React usa `BrowserRouter` con `import.meta.env.BASE_URL`, por lo que tanto los
recursos como las rutas internas funcionan bajo `/POMA/`. El alta por correo
también construye el redirect respetando esa base.

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` ya están
creadas en GitHub Actions. La API de GitHub rechazó habilitar Pages con HTTP
422 porque el repositorio es privado y el plan actual no admite Pages para ese
repositorio. No se cambia la visibilidad automáticamente porque publicarlo
expondría todo su contenido. Para activar el destino del QR habrá que hacer el
repositorio público o contratar un plan de GitHub que incluya Pages privado.

## QR generado

Se generan dos representaciones del mismo destino:

- `assets/qr/demo-mesa-01.png`, para pantalla y móvil;
- `assets/qr/demo-mesa-01.svg`, para impresión.

El QR usa corrección de errores alta y se ha decodificado después de generarlo,
comparando el contenido recuperado con la URL esperada.

## Verificación

- lint sin avisos;
- TypeScript sin errores;
- build de producción con base `/POMA/` correcto;
- portada revisada visualmente en navegador;
- `/demo` muestra el 404 de POMA;
- `/r/demo` sin token rechaza el acceso;
- `/r/demo` con el token de Mesa 01 carga el catálogo remoto y muestra la mesa;
- QR PNG decodificado correctamente;
- esquema y RLS sin incidencias; el asesor de Auth mantiene un aviso para
  activar la protección contra contraseñas filtradas antes de producción.

## Historial

- **06/09/2026 00:36 CEST:** cuenta global activada, interfaz DEMO aislada,
  pipeline de Pages creado, variables de Actions configuradas, QR generado y
  limitación del plan de GitHub documentada.
- **06/09/2026 00:47 CEST:** el commit `6612571` se publica en `main`; la
  ejecución real valida checkout, Node, instalación, lint y tipos, y se detiene
  al configurar Pages por la limitación del plan privado.
