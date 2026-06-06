@echo off
cd /d "%~dp0"
echo Instalando dependencias de produccion...
call npm install express http-proxy-middleware

if errorlevel 1 (
  echo.
  echo Error instalando dependencias.
  pause
  exit /b 1
)

echo.
echo Iniciando servidor de produccion...
node server-production.js

if errorlevel 1 (
  echo.
  echo El servidor termino con error.
)

pause
