# Registro 005 — Identidad, onboarding y superadministración

**Creado:** 06/09/2026 00:21 CEST
**Última actualización:** 06/09/2026 00:36 CEST
**Estado:** funcional y desplegado; primera cuenta global activada

## Objetivo

Incorporar cuentas reales para propietarios de restaurantes y una consola
global que permita operar y depurar POMA sin utilizar directamente Supabase
Studio para las tareas habituales.

## Recorridos implementados

### Propietario

1. Crea una cuenta con nombre, correo y contraseña en `/acceso`.
2. Confirma el correo cuando el proyecto remoto lo solicita.
3. Inicia sesión y accede a `/panel`.
4. Si todavía no tiene locales, continúa a `/alta-restaurante`.
5. Registra nombre, slug y descripción del restaurante.
6. La base crea el restaurante y su membresía `owner` en una única transacción.
7. Desde el panel ve exclusivamente sus restaurantes, puede publicarlos y
   acceder a su carta o panel operativo.

### Superadministrador

La misma ruta `/panel` detecta el rol global en base de datos y muestra una
consola distinta. Desde ella se puede:

- consultar todos los usuarios registrados y su confirmación de correo;
- ver qué restaurantes pertenecen a cada usuario;
- consultar todos los restaurantes, incluidos los privados y `DEMO`;
- publicar o despublicar cualquier restaurante;
- eliminar un restaurante y sus datos dependientes;
- listar catálogos con sus cantidades de categorías y productos;
- eliminar un catálogo completo;
- eliminar una cuenta cliente y, tras confirmación explícita, sus restaurantes;
- comprobar de un vistazo la conexión de la infraestructura.

No existe un botón para elevar usuarios a superadministrador. Es una operación
deliberadamente externa al navegador.

## Modelo de identidad

Supabase Auth sigue siendo la fuente de verdad de las credenciales. Se añaden:

| Objeto | Uso |
| --- | --- |
| `public.profiles` | Proyección administrable de nombre, correo, confirmación y último acceso |
| `public.app_admins` | Allowlist por UUID de los superadministradores activos |
| `private.admin_email_allowlist` | Correos autorizados para obtener el rol global al registrarse |
| `private.is_super_admin()` | Comprobación central utilizada por las políticas RLS |

Un trigger sincroniza `auth.users` con `public.profiles`. Los metadatos que el
usuario puede editar solo se usan como información de presentación; nunca para
autorizar. El rol global depende de `app_admins`, una tabla que el cliente no
puede modificar.

## Activación segura de un superadministrador

La función siguiente no es accesible mediante la Data API ni por los roles
`anon`, `authenticated` o `service_role`. Solo se ejecuta desde una sesión de
administración de base de datos:

```sql
select private.bootstrap_super_admin('correo-del-administrador@dominio.com');
```

- Si la cuenta ya existe, la convierte inmediatamente en superadministradora.
- Si todavía no existe, guarda el correo en la allowlist privada y el trigger
  aplicará el rol cuando se registre.
- La migración no incluye ningún correo personal.
- Existe `private.revoke_super_admin(text)` para revocar tanto la cuenta como su
  entrada futura en la allowlist.

La primera cuenta global indicada por el propietario está creada, confirmada y
activa. Su correo y su contraseña no se versionan en el repositorio.

## Límites de seguridad

- Todas las nuevas tablas tienen RLS y grants explícitos.
- Un propietario no puede leer perfiles ajenos ni restaurantes privados de
  otro tenant.
- Un propietario no puede borrar otros usuarios, `DEMO` ni restaurantes de
  otros clientes.
- Los superadministradores pueden operar sobre todos los tenants mediante una
  comprobación central que no depende de datos del JWT controlables por el
  usuario.
- Las funciones con privilegios viven en el esquema no expuesto `private`.
- La Data API solo publica wrappers `security invoker`; esos wrappers llaman a
  implementaciones privadas que vuelven a comprobar identidad y rol.
- Ninguna clave secreta o `service_role` está disponible en React.
- No se permite que un superadministrador se elimine a sí mismo ni que elimine
  otra cuenta global desde la interfaz.
- El borrado de un cliente con restaurantes requiere una confirmación que
  enumera los locales afectados.

## Verificación ejecutada

### Base de datos local

- El propietario A ve `DEMO` y su restaurante, pero no el restaurante privado
  del propietario B.
- El superadministrador ve los tres restaurantes y los tres perfiles de la
  prueba.
- El propietario ve un único perfil: el suyo.
- Un intento del propietario de borrar `DEMO` no elimina ninguna fila.
- La RPC administrativa devuelve `403` al propietario.
- La misma RPC elimina al usuario de prueba y su restaurante cuando la llama el
  superadministrador.
- Los wrappers públicos conservan estas garantías después de mover los
  privilegios al esquema `private`.
- El bootstrap por correo funciona antes y después de crear la cuenta.
- Los asesores locales y el asesor remoto de seguridad no muestran incidencias.

### Navegador

- El login superadministrador redirige a `/panel`, muestra la marca `Control
  global` y lista todos los restaurantes.
- El login de propietario abre un panel diferente, sin componentes globales, y
  solo muestra su local.
- Una cuenta nueva muestra el estado vacío, continúa al alta, transforma
  `Café Iteración` en `cafe-iteracion`, crea el tenant y vuelve al panel.
- TypeScript, lint y build de producción terminan sin errores ni warnings.

## Configuración remota comprobada

- El registro por correo está habilitado.
- La confirmación de correo está activada.
- `profiles` y `app_admins` están desplegadas con RLS.
- Todas las migraciones locales tienen la misma versión que las remotas.

Cuando exista una URL pública habrá que añadirla a las Redirect URLs permitidas
en Supabase Auth. Para producción también quedan pendientes SMTP propio,
recuperación de contraseña, MFA para superadministradores y un registro de
auditoría inmutable para las acciones destructivas.

## Próxima vertical recomendada

Crear el editor de catálogos para propietarios y el log de auditoría de la
consola global. Después puede comenzar el modelo transaccional de comandas.

## Historial

- **06/09/2026 00:21 CEST:** autenticación, alta de restaurantes, separación de
  paneles, consola global, operaciones destructivas y políticas de seguridad
  implementadas y desplegadas.
- **06/09/2026 00:23 CEST:** finalizan el reset reproducible, la regeneración de
  tipos, el build y los asesores de seguridad sin incidencias.
- **06/09/2026 00:36 CEST:** se crea y confirma la primera cuenta global; se
  verifica mediante un login real que RLS expone su rol de superadministrador.
