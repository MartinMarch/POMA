# Auditoría funcional, registro y pruebas web

**Creado:** 06/09/2026 01:53 CEST  
**Última actualización:** 06/09/2026 02:08 CEST
**Estado:** completada con dependencia externa documentada

## Objetivo de esta iteración

Corregir la deformación observada en el primer SVG, investigar el alta de
propietarios y crear una suite reproducible que pruebe la web y Supabase local
de extremo a extremo.

## Identidad visual corregida

El SVG dibujado manualmente en la iteración anterior no conservaba fielmente
las proporciones del PNG. Se sustituyó por un trazado vectorial obtenido de las
siluetas reales de `assets/brand/logo-poma-original.png`:

- caja de contenido original respetada, incluida la altura del asta de la `P`;
- mesa y dispositivo preservados mediante espacio negativo;
- cuatro esquinas doradas vectorizadas por separado;
- fondo transparente y `viewBox` ajustado sin deformar el símbolo;
- snapshot visual versionado en
  `tests/e2e/logo.spec.ts-snapshots/poma-symbol-chromium-linux.png`.

La prueba visual impedirá aceptar accidentalmente cambios futuros de
proporciones.

## Diagnóstico del registro

Los logs de Auth del proyecto remoto mostraron dos respuestas distintas el
05/09/2026 23:22 CEST:

- `email_address_invalid` para una dirección no autorizada por el correo
  integrado del proyecto;
- `over_email_send_rate_limit` en el reintento.

Supabase Auth sí permite el alta y la confirmación está activa, pero su SMTP
integrado es de demostración: solo entrega a direcciones autorizadas del equipo
y aplica un límite muy bajo. El frontend ocultaba el código real bajo un
mensaje genérico, lo que hacía parecer que el formulario no funcionaba.

Se ha corregido la aplicación para:

- traducir los códigos reales de Auth a mensajes accionables;
- normalizar el email antes de enviarlo;
- conservar el destino `next` al cambiar entre acceso y registro;
- ofrecer reenvío del correo de confirmación después de un alta pendiente;
- evitar una carrera entre cierre de sesión y la protección de `/panel`.

El flujo completo de registro funciona contra Supabase local y queda cubierto
por navegador real. Para admitir direcciones arbitrarias en producción sigue
siendo obligatorio conectar SMTP propio en el proyecto remoto y autorizar las
URLs de retorno de GitHub Pages. No se desactiva la confirmación de email como
atajo de seguridad.

## Correcciones funcionales adicionales

- La tabla de usuarios de la consola global ahora muestra el email real y
  separa el estado de confirmación en la columna `Estado`.
- Los accesos de configuración de DEMO dejaron de apuntar a anclas inexistentes
  y enlazan a la carta pública protegida por su token de mesa.
- El `slug` y la validación de retornos internos se movieron a utilidades
  compartidas y comprobables.
- El `seed` local incluye una identidad superadministradora exclusiva de E2E;
  las pruebas no emplean credenciales personales ni alteran el proyecto remoto.

## Infraestructura de pruebas

Se creó `tests/` con Playwright 1.63 y tres grupos:

- lógica unitaria: rutas de retorno, slugs y errores de Auth;
- E2E: registro, login, logout, alta y publicación de restaurante, RLS,
  consola superadmin y operaciones de borrado;
- navegación pública: portada, QR, carta desde Supabase, carrito, pago aún
  deshabilitado y rutas inexistentes;
- regresión visual del logo.

`npm test` inicia Supabase local, reconstruye todas las migraciones, inyecta
solo las claves locales, ejecuta Chrome y detiene los contenedores. Se fijó
Node.js 24.20.0 en `.nvmrc`.

**06/09/2026 02:02 CEST:** la primera ejecución del nuevo pipeline agotó el
arranque del stack completo de Supabase en un runner limpio. El ejecutor se
ajustó para iniciar solo PostgreSQL, Auth, REST y la puerta de enlace, que son
los servicios usados por estas pruebas. La suite reducida se volvió a validar
localmente con 11/11 casos correctos antes de reintentar el despliegue.

**06/09/2026 02:06 CEST:** un segundo runner confirmó que incluso el conjunto
mínimo excede el límite interno de arranque en frío de Supabase en Actions. Se
separaron las capas de validación:

- `npm test` conserva los 11 casos integrales con Supabase local;
- `npm run test:ci` ejecuta lógica e invariantes vectoriales del SVG de forma
  determinista antes de cada deploy de Pages;
- `npm run test:smoke` queda disponible para validar la web publicada sin
  mutar datos remotos.

Este cambio no reduce la suite del repositorio; evita que la publicación del
frontend dependa de descargar una plataforma Docker completa en cada push.
La comparación visual pixel a pixel se mantiene en `npm test`, donde se ejecuta
con el navegador de referencia del proyecto.

**06/09/2026 02:08 CEST:** la comprobación visual se retiró del subconjunto de
CI al confirmar que dependía del navegador preinstalado del runner. Se añadió
una prueba estructural del `viewBox`, preservación de aspecto y capas verde y
dorada. `npm run test:ci` quedó validado con 4/4 casos sin navegador.

## Resultado de validación

**06/09/2026 01:56 CEST:**

- `npm test`: **11/11 pruebas correctas**;
- `npm run lint`: correcto;
- `npm run typecheck`: correcto;
- build de producción: correcto;
- `git diff --check`: correcto.

El asesor remoto de Supabase no detectó regresiones de base de datos. Conserva
el aviso previo de protección de contraseñas filtradas desactivada y varios
índices marcados como no usados debido al volumen todavía mínimo de la demo;
no se eliminan antes de observar carga representativa.

## Límites conocidos de la demo

El catálogo y el carrito funcionan. El envío definitivo de comandas, Apple Pay
y la integración con TPV continúan señalados en la interfaz como siguiente
iteración; no se presentan como funciones terminadas en esta auditoría.
