import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de proxy para Chatwoot API
app.use('/chatwoot-api', createProxyMiddleware({
  target: 'https://chatwoot-chatwoot.gnfcio.easypanel.host',
  changeOrigin: true,
  pathRewrite: {
    '^/chatwoot-api': '', // Remover /chatwoot-api del path
  },
  secure: true,
  logLevel: 'debug', // Para debugging
}));

// Servir archivos estáticos del build
app.use(express.static(path.join(__dirname, 'dist')));

// Manejar rutas de React Router (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`🔗 Proxy Chatwoot: /chatwoot-api -> https://chatwoot-chatwoot.gnfcio.easypanel.host`);
});