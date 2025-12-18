# Diagnóstico de Problemas de Red

## Problema Actual
El servidor funciona en el servidor (192.168.85.50:3000) y en tu PC, pero NO funciona en otras PCs de la red local.

## Pasos de Diagnóstico

### 1. En las PCs que NO FUNCIONAN:

#### A. Verificar conectividad de red básica
Abre CMD o PowerShell y ejecuta:
```bash
ping 192.168.85.50
```
- ✅ Si responde: La red funciona
- ❌ Si no responde: Problema de red/VLAN

#### B. Verificar acceso al puerto 3000
```bash
telnet 192.168.85.50 3000
```
O si telnet no está instalado:
```bash
Test-NetConnection -ComputerName 192.168.85.50 -Port 3000
```
- ✅ Si conecta: El puerto está abierto
- ❌ Si falla: Firewall bloqueando el puerto

#### C. Revisar la consola del navegador
1. Presiona F12 para abrir DevTools
2. Ve a la pestaña "Console"
3. Recarga la página (Ctrl + R)
4. Busca errores que digan:
   - "useChatwootConfig"
   - "Failed to fetch"
   - "Network error"
   - "CORS"
5. **Captura pantalla y envíame los errores**

#### D. Revisar peticiones de red
1. En DevTools, ve a la pestaña "Network"
2. Marca "Preserve log"
3. Recarga la página
4. Busca peticiones en ROJO (fallidas)
5. Haz clic en cada petición roja y revisa:
   - Headers
   - Response
6. **Captura pantalla de las peticiones fallidas**

### 2. En el SERVIDOR (192.168.85.50):

#### A. Verificar que el servidor está escuchando en todas las interfaces
Cuando inicias el servidor, debes ver:
```
🚀 Servidor de producción iniciado

📍 URLs disponibles:
   ➜ Local:   http://localhost:3000/
   ➜ Network: http://192.168.85.50:3000/
```

#### B. Abrir el puerto en el Firewall de Windows
1. Abre "Windows Defender Firewall con seguridad avanzada"
2. Clic en "Reglas de entrada" (Inbound Rules)
3. Clic en "Nueva regla..." (New Rule)
4. Selecciona "Puerto" (Port)
5. TCP, puerto 3000
6. Permitir la conexión
7. Aplicar a Dominio, Privado y Público
8. Nombre: "Node.js Server Port 3000"

O ejecuta este comando en PowerShell como Administrador:
```powershell
New-NetFirewallRule -DisplayName "Node.js Server Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

#### C. Verificar puertos abiertos
En PowerShell ejecuta:
```powershell
netstat -ano | findstr :3000
```
Debes ver algo como:
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
```

### 3. Soluciones Comunes:

#### Solución 1: Firewall del Servidor bloqueando
Si el servidor tiene firewall activo, agrega la regla descrita arriba.

#### Solución 2: Firewall de las PCs clientes bloqueando
En cada PC que no funciona, desactiva temporalmente el firewall para probar:
```
Panel de Control → Sistema y Seguridad → Windows Defender Firewall → Activar o desactivar
```
⚠️ Solo para probar, luego vuelve a activarlo

#### Solución 3: Diferentes redes/VLANs
Verifica que todas las PCs estén en la misma subred:
```bash
ipconfig
```
Todas deben tener IPs como: 192.168.85.X

#### Solución 4: Antivirus bloqueando
Algunos antivirus bloquean conexiones a servidores locales. Desactiva temporalmente para probar.

## Qué hacer con los resultados:

1. **Si ping falla**: Problema de red física/configuración de router
2. **Si ping funciona pero telnet/Test-NetConnection falla**: Firewall bloqueando puerto 3000
3. **Si todo funciona pero la app no carga**: Problema de código/configuración de Supabase
4. **Si ves errores CORS**: Problema de proxy/configuración del servidor

## Información a enviarme:

Para ayudarte mejor, necesito:
1. ✅ Resultado del ping desde PC que no funciona
2. ✅ Resultado del Test-NetConnection al puerto 3000
3. ✅ Captura de pantalla de errores en Console (F12)
4. ✅ Captura de pantalla de Network tab mostrando peticiones fallidas
5. ✅ Confirmar si agregaste la regla de firewall en el servidor
