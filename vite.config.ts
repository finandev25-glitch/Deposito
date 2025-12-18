import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true, // Permite acceso desde otras PCs en la red local
    port: 3000,
    proxy: {
      '/chatwoot-api': {
        target: 'https://chatwoot-chatwoot.gnfcio.easypanel.host',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/chatwoot-api/, '')
      }
    }
  },
  preview: {
    port: 5173,
    proxy: {
      '/chatwoot-api': {
        target: 'https://chatwoot-chatwoot.gnfcio.easypanel.host',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/chatwoot-api/, '')
      }
    }
  }
});
