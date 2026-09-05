# Identidad visual POMA v1

**Creado:** 06/09/2026 01:18 CEST  
**Última actualización:** 06/09/2026 01:53 CEST
**Estado:** parcialmente obsoleta

> **Actualización — 06/09/2026 01:53 CEST:** la primera construcción manual
> del SVG deformaba las proporciones del PNG. El activo fue sustituido por una
> vectorización de sus siluetas reales y la decisión queda documentada en
> [Auditoría funcional, registro y tests web](./2026-09-06_01-53_auditoria-funcional-registro-y-tests-web.md).

## Objetivo de esta iteración

Convertir el primer logo facilitado para POMA en un activo vectorial nativo y
utilizarlo como base de una identidad coherente en la web corporativa, las
consolas privadas y las cartas públicas de los restaurantes.

## Activos de marca

- Fuente raster original: `assets/brand/logo-poma-original.png`.
- Símbolo vectorial para producto: `apps/web/public/brand/poma-symbol.svg`.
- Componente React compartido: `apps/web/src/components/PomaBrand.tsx`.
- Favicon: el mismo SVG, declarado en `apps/web/index.html` y resuelto con el
  `base path` de Vite para que funcione bajo `/POMA/` en GitHub Pages.

El SVG es vectorial puro, tiene fondo transparente e incluye metadatos
accesibles. Mantiene los tres elementos del original: la `P`, la mesa/dispositivo
y las cuatro esquinas doradas de escaneo.

## Sistema visual

Paleta base de esta versión:

| Uso | Color |
| --- | --- |
| Verde principal | `#004d3f` |
| Verde profundo | `#003b31` |
| Verde luminoso | `#00614d` |
| Dorado | `#d2a254` |
| Dorado de texto/acento | `#936624` |
| Fondo marfil | `#f5f2e8` |
| Tinta | `#102720` |

La tipografía de producto pasa a combinar `Manrope` para títulos y marca con
`DM Sans` para interfaz y lectura. La interfaz emplea fondos marfil, superficies
claras, navegación verde y acentos dorados.

## Superficies actualizadas

- Portada corporativa y vista previa de la consola.
- Inicio de sesión y creación de cuenta.
- Alta y configuración inicial de restaurantes.
- Dashboard del propietario.
- Consola de superadministración.
- Consola operativa de la DEMO.
- Template público compartido por las cartas de restaurantes, incluida DEMO.

La marca de plataforma aparece en las cartas sin sustituir el nombre propio del
restaurante. La arquitectura continúa siendo multitenant: todos comparten el
template y cada restaurante conserva sus datos aislados.

## Persistencia y compatibilidad

La migración `apply_poma_brand_to_restaurants` cambia el acento por defecto de
nuevos restaurantes a `#936624` y actualiza únicamente el restaurante `demo`.
Se probó reconstruyendo la base local completa y se aplicó al proyecto remoto.
No cambia permisos, políticas RLS ni el modelo de datos.

## Validación realizada

- Renderizado visual del SVG y comparación con el PNG fuente.
- Revisión visual de portada, acceso y carta responsive.
- `npm run lint`.
- `npm run typecheck`.
- build de producción con base `/POMA/`.
- `supabase db reset` con todas las migraciones.
- comprobación local y remota del color de DEMO y del valor por defecto.

## Pendiente inmediato

- En una iteración futura, definir variantes horizontales del logotipo y reglas
  de personalización de marca para restaurantes clientes.

## Despliegue

**06/09/2026 01:20 CEST:** el commit `84708aa` se desplegó correctamente con
el workflow `Deploy frontend to GitHub Pages`, ejecución `33998370855`.

- Portada: `https://martinmarch.github.io/POMA/`.
- Carta DEMO: `https://martinmarch.github.io/POMA/r/demo?table=c0ffee00-0000-4000-8000-000000000001`.
- El SVG público devuelve `200 image/svg+xml` y coincide byte a byte con el
  archivo versionado.
- La portada y la carta DEMO se comprobaron mediante renderizado real después
  del despliegue.

El asesor de seguridad no detectó regresiones de esta migración. Permanece el
aviso previo de proyecto sobre la protección de contraseñas filtradas de
Supabase Auth, ajeno a este cambio visual.
