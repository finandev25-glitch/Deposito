import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { networkInterfaces } from 'os';
import {
  registerDashboardApiRoutes,
  registerRequestLogger,
  registerDepositSseRoute,
  startDepositRealtimeHub,
} from "./backend/realtimeHub.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces

app.use(express.json({ limit: "10mb" }));
registerRequestLogger(app);
startDepositRealtimeHub();
registerDashboardApiRoutes(app);
registerDepositSseRoute(app);

// Servir archivos estáticos desde el build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - todas las rutas GET que no sean API devuelven index.html
app.use((req, res, next) => {
  if (req.method !== "GET") {
    return next();
  }

  if (req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Función para obtener las IPs de red local
function getNetworkIPs() {
  const nets = networkInterfaces();
  const ips = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Solo IPv4 y no loopback
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
}

app.listen(PORT, HOST, () => {
  const networkIPs = getNetworkIPs();

  console.log('\n🚀 Servidor de producción iniciado\n');
  console.log('📍 URLs disponibles:');
  console.log(`   ➜ Local:   http://localhost:${PORT}/`);

  if (networkIPs.length > 0) {
    networkIPs.forEach(ip => {
      console.log(`   ➜ Network: http://${ip}:${PORT}/`);
    });
  }

  console.log(`\n📁 Sirviendo archivos desde: ${__dirname}`);
  console.log(`🔴 SSE depositos: /api/events/depositos`);
  console.log('\n✨ Presiona Ctrl+C para detener el servidor\n');
});
