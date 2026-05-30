@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo  Backend de Control de Depositos
echo  Instalando dependencias y arrancando...
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se encontro Node.js en PATH.
  echo Instala Node.js y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: No se encontro npm en PATH.
  echo Verifica la instalacion de Node.js.
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: No se encontro package.json en %CD%.
  pause
  exit /b 1
)

echo Instalando dependencias...
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: npm install fallo.
  pause
  exit /b 1
)

echo.
echo Iniciando backend en el puerto 3000...
echo Presiona Ctrl+C para detenerlo.
echo.

node server-production.js

pause
