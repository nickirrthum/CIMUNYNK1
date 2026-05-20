import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    // Disable HMR auto-reload entirely on the preview environment.
    // The Kubernetes ingress does not forward the Vite HMR WebSocket reliably,
    // so the client kept losing the WS connection and forcing full page reloads.
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
});
