@echo off
echo Instalando dependencias de producción...
npm install express http-proxy-middleware

echo.
echo Iniciando servidor de producción...
node server-production.js

pause