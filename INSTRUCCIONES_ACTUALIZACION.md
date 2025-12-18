# Instrucciones para Actualizar y Diagnosticar

## ✅ Build Completado Exitosamente

Se ha generado un nuevo build con logs adicionales para diagnosticar el problema del chat.

**Nuevo archivo generado:** `index-CW9S3ngk.js` (reemplaza el anterior `index-BetPDpyy.js`)

---

## 🔄 PASO 1: Reiniciar el Servidor

### En el servidor (192.168.85.50):

1. **Detener el servidor actual:**
   - Si está corriendo en una terminal, presiona `Ctrl + C`
   - O cierra la ventana/terminal donde está corriendo

2. **Ir a la carpeta dist:**
   ```bash
   cd "d:\descargas\confirmaciondep_ozwpnp_dualiteproject - copia (2)\dist"
   ```

3. **Iniciar el servidor nuevamente:**
   ```bash
   node server-production.js
   ```

4. **Verificar que muestre:**
   ```
   🚀 Servidor de producción iniciado

   📍 URLs disponibles:
      ➜ Local:   http://localhost:3000/
      ➜ Network: http://192.168.85.50:3000/
   ```

---

## 🧹 PASO 2: Limpiar Cache en TODAS las PCs

### En CADA PC que accede al sistema:

#### Opción A: Limpiar Cache Completo (RECOMENDADO)

**En Chrome:**
1. Presiona `Ctrl + Shift + Delete`
2. Selecciona "Todo el tiempo"
3. Marca SOLO "Archivos e imágenes en caché"
4. Clic en "Borrar datos"

**En Edge:**
1. Presiona `Ctrl + Shift + Delete`
2. Selecciona "Todo el tiempo"
3. Marca SOLO "Archivos e imágenes en caché"
4. Clic en "Borrar ahora"

#### Opción B: Forzar Recarga (más rápido pero puede no funcionar siempre)
1. Abre la página: `http://192.168.85.50:3000/`
2. Presiona `Ctrl + Shift + R` (recarga forzada)
3. O presiona `F12`, luego clic derecho en el botón de recargar y selecciona "Vaciar caché y forzar recarga"

---

## 🔍 PASO 3: Verificar Logs en PCs que FALLAN

### En las PCs donde NO funciona el chat:

1. **Abrir la aplicación:**
   ```
   http://192.168.85.50:3000/
   ```

2. **Abrir DevTools:**
   - Presiona `F12`
   - O clic derecho → "Inspeccionar"

3. **Ir a la pestaña "Console"**

4. **Buscar un depósito y abrir el chat**

5. **Buscar estos logs en la consola:**

   Debes ver ESTOS mensajes:
   ```
   ✅ Cliente Supabase inicializado:
      - Auth con localStorage y auto-refresh
      - Realtime configurado con reconexión automática

   🔄 useChatwootConfig: Iniciando con configId: [NUMERO] supabase: true
   🔍 useChatwootConfig: Buscando config con ID: [NUMERO]
   📊 useChatwootConfig: Resultado de consulta: ...
   ```

6. **Captura pantalla de TODOS los logs que aparecen**

---

## 📊 PASO 4: Qué Buscar en los Logs

### Escenario 1: Cliente Supabase NO inicializado
Si ves:
```
⚠️ Credenciales de Supabase no válidas o no proporcionadas...
❌ useChatwootConfig: Cliente Supabase no inicializado
```
**Problema:** Las variables de entorno no están embebidas en el build
**Solución:** Verificar el archivo .env antes de hacer el build

### Escenario 2: configId no proporcionado
Si ves:
```
⚠️ useChatwootConfig: configId no proporcionado
```
**Problema:** El depósito no tiene asignado un `chatwoot_config_id`
**Solución:** Actualizar la base de datos para asignar un config_id al depósito

### Escenario 3: Config no encontrada
Si ves:
```
⚠️ No se encontró config activa. Todos los registros con ese ID: null
❌ Error en useChatwootConfig: Error: Configuración de Chatwoot no encontrada o inactiva
```
**Problema:** La configuración no existe en la tabla `chatwoot_config` o está con `activo: false`
**Solución:** Verificar/crear la configuración en Supabase

### Escenario 4: Config encontrada exitosamente
Si ves:
```
✅ useChatwootConfig: Config encontrada: {id: 1, account_id: "...", ...}
```
**Éxito:** El chat debería funcionar correctamente

---

## ⚠️ Verificaciones Adicionales

### Verificar que el nuevo build se está sirviendo:
1. Abre DevTools (F12)
2. Ve a la pestaña "Network"
3. Recarga la página (F5)
4. Busca el archivo JavaScript principal
5. Debe decir `index-CW9S3ngk.js` (NO `index-BetPDpyy.js`)

Si todavía dice `index-BetPDpyy.js`, significa que el cache no se limpió correctamente.

---

## 📝 Información a Reportar

Después de seguir TODOS los pasos, por favor envíame:

1. ✅ Confirmación de que reiniciaste el servidor
2. ✅ Captura de pantalla de la consola del servidor mostrando las URLs
3. ✅ Confirmación de que limpiaste el cache en las PCs que fallan
4. ✅ Captura de pantalla de la pestaña Console con los logs del chat
5. ✅ Captura de pantalla de la pestaña Network mostrando el archivo `index-CW9S3ngk.js`

Con esta información podré identificar exactamente qué está fallando.
