@echo off
echo Instalando dependencias de produccion...
call npm install

echo Iniciando servidor de produccion en puerto 3000...
echo Presiona Ctrl+C para detener el servidor

node server-production.js

pause