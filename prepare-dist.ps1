# Script para preparar dist para producción
Write-Host "Copiando archivos de producción a dist..." -ForegroundColor Green

# Copiar archivos necesarios
Copy-Item "server-production.js" "dist\" -Force
Copy-Item "start-server.bat" "dist\" -Force  
Copy-Item "package-production.json" "dist\package.json" -Force

Write-Host "Archivos copiados correctamente." -ForegroundColor Green
Write-Host "Para instalar en otra PC:" -ForegroundColor Yellow
Write-Host "1. Copia la carpeta 'dist' completa" -ForegroundColor White
Write-Host "2. En la PC destino: cd dist" -ForegroundColor White  
Write-Host "3. npm install" -ForegroundColor White
Write-Host "4. start-server.bat" -ForegroundColor White