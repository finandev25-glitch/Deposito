# Diagnóstico de PC Cliente que NO puede ver el Chat

## 🎯 Situación Actual

- ✅ El servidor funciona correctamente (192.168.85.50:3000)
- ✅ Algunas PCs pueden ver el chat sin problema
- ❌ Otras PCs NO pueden ver el chat (mismo depósito, misma tarjeta)
- 🔍 El error es: "Configuración de Chatwoot no encontrada o inactiva"

**Conclusión:** El problema está en la PC cliente, no en los datos.

---

## 🔍 DIAGNÓSTICO RÁPIDO

### En la PC que NO FUNCIONA:

#### 1. Verificar conexión a Supabase

Abre DevTools (F12) → Console, y ejecuta este código:

```javascript
fetch('https://rwxdwgtcykcskzyfxkam.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eGR3Z3RjeWtjc2t6eWZ4a2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTc5MzMsImV4cCI6MjA3NDczMzkzM30._fqHpCK27YPQN3ZyVYn-UQHRQTwLOwD-YQQWhdg8jr8'
  }
})
.then(r => console.log('✅ Supabase conectado:', r.status))
.catch(e => console.error('❌ Supabase bloqueado:', e))
```

**Resultado esperado:**
- ✅ Si dice: `✅ Supabase conectado: 200` → La conexión funciona
- ❌ Si dice: `❌ Supabase bloqueado: ...` → Firewall/Antivirus bloqueando

---

## 🛡️ SOLUCIONES SEGÚN EL PROBLEMA

### Problema 1: Firewall de Windows bloqueando

**Síntoma:** El fetch falla con error de red

**Solución temporal (para probar):**
1. Ve a: Panel de Control → Sistema y Seguridad → Firewall de Windows Defender
2. Clic en "Activar o desactivar Firewall de Windows Defender"
3. Desactiva temporalmente el firewall de la red privada
4. Prueba si funciona el chat
5. ⚠️ Vuelve a activar el firewall después

**Solución permanente:**
1. Firewall de Windows → Configuración avanzada
2. Reglas de salida → Nueva regla
3. Regla de puerto → TCP
4. Puerto específico: 443 (HTTPS)
5. Permitir la conexión
6. Dominio: `*.supabase.co`

### Problema 2: Antivirus bloqueando peticiones HTTPS

**Síntoma:** El fetch funciona pero las peticiones a Supabase fallan

**Antivirus comunes que pueden bloquear:**
- Kaspersky
- Avast
- AVG
- Norton
- McAfee

**Solución:**
1. Abre tu antivirus
2. Busca "Exclusiones" o "Excepciones"
3. Agrega como sitio de confianza: `rwxdwgtcykcskzyfxkam.supabase.co`
4. Reinicia el navegador

### Problema 3: Proxy corporativo

**Síntoma:** Otras páginas web funcionan lento o requieren autenticación

**Verificación:**
1. Ve a: Configuración de Windows → Red e Internet → Proxy
2. Verifica si hay algún proxy configurado

**Solución:**
Si hay proxy configurado, necesitas que el administrador de red agregue `*.supabase.co` a la lista blanca.

### Problema 4: Cache del navegador

**Solución rápida:**
1. Abre DevTools (F12)
2. Clic derecho en el botón de recargar
3. Selecciona "Vaciar caché y volver a cargar de forma forzada"

**Solución completa:**
1. Presiona `Ctrl + Shift + Delete`
2. Selecciona "Todo el tiempo"
3. Marca SOLO "Imágenes y archivos en caché"
4. Clic en "Borrar datos"
5. Cierra y vuelve a abrir el navegador completamente

### Problema 5: DNS no resuelve supabase.co

**Verificación:**
Abre CMD y ejecuta:
```bash
nslookup rwxdwgtcykcskzyfxkam.supabase.co
```

**Resultado esperado:**
```
Nombre:  rwxdwgtcykcskzyfxkam.supabase.co
Address: [alguna IP]
```

**Si falla:**
Cambiar DNS a Google DNS:
1. Panel de Control → Redes e Internet → Centro de redes
2. Cambiar configuración del adaptador
3. Clic derecho en tu red → Propiedades
4. Selecciona "Protocolo de Internet versión 4"
5. Propiedades
6. Usar las siguientes direcciones:
   - DNS preferido: `8.8.8.8`
   - DNS alternativo: `8.8.4.4`
7. Aceptar y reiniciar

---

## 🔬 DIAGNÓSTICO COMPLETO

### Paso 1: Abrir la aplicación en la PC problemática
```
http://192.168.85.50:3000/
```

### Paso 2: Abrir DevTools (F12)

### Paso 3: Ir a la pestaña "Console"

### Paso 4: Verificar inicialización de Supabase

Busca este mensaje al cargar la página:
```
✅ Cliente Supabase inicializado:
   - Auth con localStorage y auto-refresh
   - Realtime configurado con reconexión automática
```

**Si NO aparece este mensaje:**
Busca este mensaje:
```
⚠️ Credenciales de Supabase no válidas o no proporcionadas...
```

### Paso 5: Ir a la pestaña "Network"

1. Recarga la página (F5)
2. Busca peticiones a: `rwxdwgtcykcskzyfxkam.supabase.co`
3. Si hay peticiones en ROJO (fallidas), haz clic en ellas
4. Revisa el error:
   - `net::ERR_BLOCKED_BY_CLIENT` → Bloqueado por extensión/antivirus
   - `net::ERR_CONNECTION_REFUSED` → Firewall bloqueando
   - `net::ERR_NAME_NOT_RESOLVED` → Problema de DNS
   - `CORS error` → Problema de configuración del servidor

### Paso 6: Abrir un depósito y ver el chat

En Console, busca estos logs:
```
🔄 useChatwootConfig: Iniciando con configId: [NUMERO] supabase: true/false
```

**Si dice `supabase: false`:**
→ El cliente Supabase no se inicializó (problema de variables de entorno o conexión bloqueada)

**Si dice `supabase: true` pero luego falla:**
→ La conexión está bloqueada por firewall/antivirus

---

## ✅ PRUEBA DEFINITIVA

### En una PC que SÍ FUNCIONA:

1. Abre DevTools (F12) → Network
2. Abre un depósito y ve el chat
3. Observa las peticiones a Supabase
4. Captura pantalla

### En la PC que NO FUNCIONA:

1. Haz exactamente lo mismo
2. Captura pantalla
3. Compara ambas capturas

La diferencia te dirá exactamente qué está bloqueado.

---

## 📋 REPORTE PARA DIAGNOSTICAR

Por favor ejecuta en la PC que NO FUNCIONA:

1. **Test de conexión a Supabase** (el código JavaScript del inicio)
2. **Captura de Console** al abrir un depósito
3. **Captura de Network** mostrando las peticiones a Supabase
4. **Resultado de `nslookup rwxdwgtcykcskzyfxkam.supabase.co`**
5. **Información del antivirus instalado** en esa PC

Con esa información podré darte la solución exacta.
