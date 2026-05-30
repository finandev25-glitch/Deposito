# Backend en consola

Si prefieres que el backend corra normal en consola, usa este script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-backend-console.ps1
```

Eso mantiene visible la ventana de PowerShell y ejecuta `server-production.js` directamente.

---

# Servicio Windows para el backend

Este proyecto usa `server-production.js` como backend y servidor estático.

## Requisitos

- Windows Server o Windows Pro
- Node.js instalado
- `npm install` ejecutado
- `npm run build` ejecutado para generar `dist/`
- NSSM solo si quieres instalarlo como servicio

## Instalación

Si quieres servicio Windows, primero descarga NSSM:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\download-nssm.ps1
```

Luego ejecuta PowerShell como Administrador y corre:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-backend-service.ps1 -NssmExe ".\scripts\tools\nssm\nssm.exe"
```

## Desinstalación

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-backend-service.ps1
```

## Observaciones

- El servicio arranca automático.
- La salida estándar y de error se guardan en `logs\`.
- Si cambias el puerto, ajusta el parámetro `-Port`.
- Si el backend irá detrás de un dominio, configura `CORS_ORIGIN` en el `.env`.
