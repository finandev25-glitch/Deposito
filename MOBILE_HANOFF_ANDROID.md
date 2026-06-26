# Handoff tecnico - App Android de recepcion de depositos

## 1. Objetivo
Construir una aplicacion movil Android en Flutter para vendedores registrados que:

- Inicien sesion con celular y clave.
- Tengan acceso solo si su usuario/celular esta activo en la base de datos.
- Envien vouchers de deposito desde la app.
- Reciban vouchers mediante:
  - foto tomada con la camara
  - compartir desde WhatsApp u otras apps instaladas usando el flujo nativo de Android

La app movil no validara vouchers. La validacion queda fuera del alcance de este subproyecto.

## 2. Alcance funcional
### Incluido
- Login con Supabase Auth.
- Filtrado de acceso por usuarios activos.
- Captura de imagen desde camara.
- Recepcion de imagenes compartidas desde Android.
- Subida de voucher a Supabase Storage.
- Creacion o actualizacion del registro asociado en Supabase.

### Excluido
- Validacion de voucher.
- Tramitacion de confirmacion.
- Trazabilidad avanzada en el flujo movil.
- Integracion directa con SQL Server desde la app Android.
- Logica administrativa o de backoffice.

## 3. Stack acordado
- App movil: Flutter.
- Backend principal: Supabase.
- Base de datos compartida: la misma ya usada por el sistema actual.
- Recomendacion: no exponer credenciales sensibles en el cliente movil.

## 4. Contexto del sistema actual
El repo actual no es Flutter. Es una app web con:

- Vite
- React 19
- Node/Express
- Supabase
- Conectores y scripts auxiliares

El proyecto ya tiene estructura de backend y migraciones en:

- `supabase/migrations`
- `supabase/functions`
- `backend`
- `server.js`

Eso significa que la app Flutter debe nacer como un subproyecto separado, pero consumiendo la misma base Supabase.

## 5. Esquema de datos relevante

### `public.profiles`
Fuente principal de usuarios.

Campos observados en el esquema consolidado:
- `id`
- `nombre`
- `rol`
- `estado`
- `usuario`

Puntos importantes:
- `estado` existe y por defecto puede ser `inactivo`.
- El sistema usa `get_user_role(auth.uid())` para politicas por rol.
- En el esquema revisado no vi un campo explicito de `celular` dentro de `profiles`.

Conclusion:
- Si el acceso movil debe depender de un celular activo, hay que confirmar:
  - si el celular ya existe en otra tabla no revisada
  - o si hace falta agregarlo a `profiles`

### `public.sucursales`
Tabla de sucursales.

Campos observados:
- `id`
- `nombre`
- `telefono`
- `estado`

Uso esperado para la app movil:
- Identificar la tienda o sucursal asociada al vendedor.
- Filtrar acceso o contexto operativo si aplica.

### `public.sucursal_personal`
Tabla pivote entre sucursales y usuarios.

Campos:
- `sucursal_id`
- `usuario_id`

Uso esperado:
- Saber a que sucursal pertenece cada vendedor.
- Permitir autorizacion por asignacion de personal.

### `public.depositos`
Tabla principal de depositos.

Campos relevantes observados:
- `id`
- `created_at`
- `numero_operacion`
- `cliente`
- `monto`
- `moneda`
- `fecha_registro`
- `imagen_voucher`
- `estado`
- `observaciones`
- `motivo_rechazo`
- `fecha_validacion`
- `vendedor_id`
- `sucursal_id`
- `validado_por`
- `empresa_id`
- `banco_id`
- `anexo`
- `numero_operacion_banco`
- `fecha_deposito`

Puntos importantes para Android:
- `imagen_voucher` ya existe como referencia textual/URL.
- `estado` existe, pero la app movil no debe depender de validarlo.
- La app puede crear el registro inicial y dejar el proceso de revision para otros roles.

## 6. Storage y archivos
Ya existen buckets/politicas relacionados con archivos:

- `documentos`
- `whatsapp-media`
- `voucher-exports`

Observaciones:
- `documentos` permite lectura publica y carga autenticada.
- `whatsapp-media` existe para adjuntos de WhatsApp.

Recomendacion tecnica para la app Android:
- Definir un bucket especifico para vouchers si se quiere separar el dominio funcional.
- Si se quiere acelerar, reutilizar `documentos` como storage inicial.
- Guardar en la tabla el path o URL final del archivo.

## 7. Seguridad y acceso

### Regla principal
El acceso a la app Android debe permitirse solo a usuarios que cumplan las condiciones de estado activo.

### Condicion minima observada
- `profiles.estado = 'activo'`

### Pendiente de confirmar
- Si "celular activo" significa:
  - un campo `telefono/celular` dentro de `profiles`
  - una tabla de dispositivos autorizados
  - o una validacion con OTP/logica adicional

### Recomendacion
No confiar en el numero del dispositivo Android como unica identidad.
Usar:
- Supabase Auth para identidad
- estado activo en base de datos
- rol y/o asignacion de sucursal para autorizacion

## 8. Flujo movil propuesto

### 8.1 Login
1. Usuario abre la app.
2. Ingresa celular y clave.
3. Flutter autentica contra Supabase Auth o backend intermedio.
4. La app consulta el perfil.
5. Si `estado != 'activo'`, se bloquea el acceso.
6. Si esta activo, se habilita el flujo de carga.

### 8.2 Envio por camara
1. Usuario abre pantalla de nuevo voucher.
2. Toma foto desde camara.
3. Completa datos minimos requeridos.
4. La imagen se sube a Supabase Storage.
5. Se crea el registro en `depositos`.

### 8.3 Recepcion por compartir
1. Usuario abre WhatsApp o galeria.
2. Usa el boton compartir.
3. Android envia el archivo a la app Flutter mediante intent/share handler.
4. La app recibe la imagen.
5. Se guarda en Storage.
6. Se registra el voucher en la base.

### 8.4 Sin validacion
- La app no cambia el estado final a aprobado/rechazado.
- No calcula trazabilidad operativa.
- Solo recibe y registra.

## 9. Integracion Android especifica
La app Flutter debe contemplar:

- `image_picker` o equivalente para camara.
- Manejo de share intents para recibir contenido compartido.
- Permisos de camara y almacenamiento segun version Android.
- Manejo de archivos temporales.
- Reintentos de subida cuando no haya red.

## 10. Variables de entorno
Para la app movil solo deben viajar variables publicas.

### Necesarias en Flutter
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### No deben ir en el cliente movil
- `SUPABASE_SERVICE_ROLE_KEY`
- credenciales de `SQLSERVER_*`
- llaves privadas de terceros

### Observacion
El archivo `.env` del repo actual contiene secretos. Eso no debe copiarse al proyecto Flutter.

## 11. Dependencias del backend actual
La app movil debe asumir que el backend actual ya gestiona:

- politicas RLS
- triggers de creacion de perfil
- funciones RPC
- almacenamiento de archivos
- permisos por rol

No hace falta replicar eso en Flutter. Flutter debe ser consumidor.

## 12. Riesgos y decisiones abiertas

### Riesgo 1: campo de celular
No esta confirmado en el esquema revisado si `profiles` tiene un celular propio.

### Riesgo 2: bucket definitivo para vouchers
Hay buckets existentes, pero falta decidir si:
- se reutiliza `documentos`
- se usa `whatsapp-media`
- o se crea uno nuevo como `voucher-media`

### Riesgo 3: autenticacion exacta
Hay que definir si el login sera:
- email/clave interno
- celular/clave con tabla propia
- o Supabase Auth con metadata adicional

### Riesgo 4: origen unico de verdad
Hay que decidir si la app Android escribira:
- solo en Supabase
- o en Supabase y luego sincronizara con SQL Server por backend

## 13. Estructura sugerida del proyecto Flutter

- `lib/`
  - `app/`
  - `core/`
  - `features/auth/`
  - `features/vouchers/`
  - `features/share_receiver/`
  - `features/camera_capture/`
  - `features/profile/`
- `assets/`
- `android/`
- `pubspec.yaml`

### Capas recomendadas
- UI
- estado
- repositorios
- datasource Supabase

## 14. Flujo de implementacion recomendado
### Fase 1
- Crear proyecto Flutter Android.
- Conectar Supabase.
- Implementar login.
- Restringir acceso por estado activo.

### Fase 2
- Captura por camara.
- Carga de archivo a Storage.
- Insercion en `depositos`.

### Fase 3
- Recepcion por compartir desde WhatsApp.
- Manejo de archivos entrantes.
- Validacion basica de formato y red.

### Fase 4
- Ajustes de UX.
- Manejo offline parcial.
- Reintentos y errores.

## 15. Regla de trabajo para el subproyecto
Este subproyecto debe trabajar con el sistema existente sin romperlo:

- No cambiar migraciones sin revisar impacto.
- No mover secretos al cliente.
- No asumir campos que no existan.
- Si falta un campo para celular activo, se debe proponer migracion antes de codificar.

## 16. Decision recomendada
Abrir un proyecto Flutter separado para Android y usar este documento como contrato tecnico inicial.

El nuevo proyecto debe consumir:
- Supabase Auth
- Supabase Storage
- tablas `profiles`, `sucursales`, `sucursal_personal`, `depositos`

Y debe evitar:
- SQL Server directo desde el movil
- logica de validacion
- secretos del backend
