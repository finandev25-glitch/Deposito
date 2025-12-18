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
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      clientPort: 443
    },
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
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
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
