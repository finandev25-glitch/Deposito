@echo off
cd /d "%~dp0"
echo Instalando dependencias de produccion...
call npm install

if errorlevel 1 (
  echo.
  echo Error instalando dependencias.
  pause
  exit /b 1
)

echo Iniciando servidor de produccion en puerto 3000...
echo Presiona Ctrl+C para detener el servidor

node server-production.js

if errorlevel 1 (
  echo.
  echo El servidor termino con error.
)

pause
