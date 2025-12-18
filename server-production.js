import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces

// Configurar proxy para Chatwoot
app.use('/chatwoot-api', createProxyMiddleware({
  target: 'https://chatwoot-chatwoot.gnfcio.easypanel.host',
  changeOrigin: true,
  secure: false,
  pathRewrite: {
    '^/chatwoot-api': '', // Remover /chatwoot-api del path
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  },
  logLevel: 'info'
}));

// Servir archivos estáticos desde el directorio actual (ya estamos en dist)
app.use(express.static(__dirname));

// SPA fallback - todas las rutas que no sean API devuelven index.html
app.get('/*', (req, res) => {
  // Si es una ruta de API, no hacer fallback
  if (req.path.startsWith('/chatwoot-api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, 'index.html'));
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
  console.log(`🔄 Proxy Chatwoot: /chatwoot-api -> https://chatwoot-chatwoot.gnfcio.easypanel.host`);
  console.log('\n✨ Presiona Ctrl+C para detener el servidor\n');
});