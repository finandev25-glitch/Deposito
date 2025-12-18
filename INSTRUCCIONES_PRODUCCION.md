# Instrucciones para configurar en otras PCs

## Archivos necesarios para producción

Copia estos archivos a la carpeta donde tienes el `dist`:

1. `server-production.js` - Servidor con proxy para Chatwoot
2. `package-production.json` - Dependencias necesarias
3. `start-production.bat` - Script para iniciar fácilmente

## Pasos para configurar:

### 1. Estructura de carpetas

```
D:\proyecto react\Confirmacion\
├── dist\                     (tu carpeta de archivos compilados)
├── server-production.js      (NUEVO - copia este archivo)
├── package-production.json   (NUEVO - copia este archivo)
└── start-production.bat      (NUEVO - copia este archivo)
```

### 2. Instalar Node.js

- Asegúrate de tener Node.js instalado en cada PC
- Descarga desde: https://nodejs.org/

### 3. Configurar el servidor

**Opción A - Usando el archivo .bat (más fácil):**

```bash
# Desde la carpeta del proyecto:
D:\proyecto react\Confirmacion> start-production.bat
```

**Opción B - Manual:**

```bash
# 1. Instalar dependencias
D:\proyecto react\Confirmacion> npm install --package-lock-only express http-proxy-middleware

# 2. Iniciar servidor
D:\proyecto react\Confirmacion> node server-production.js
```

### 4. Acceder a la aplicación

- Abre el navegador en: `http://localhost:3000`
- El chat funcionará correctamente con el proxy configurado

## ¡IMPORTANTE!

- **NO uses más `serve -s .`** - usa el nuevo servidor
- El nuevo servidor incluye el proxy para Chatwoot
- Funciona en puerto 3000 por defecto
- Todos los archivos se sirven desde la carpeta `dist`

## Solución de problemas

- Si no funciona, verifica que Node.js esté instalado
- Si el puerto 3000 está ocupado, el servidor te dará error
- Revisa la consola para ver mensajes de error
