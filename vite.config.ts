import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config con proxy para evitar CORS en dev
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy para PIX: /pix/quotes -> https://pix.ferminrp.com/quotes
      '/pix': {
        target: 'https://pix.ferminrp.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/pix/, ''),
      },
    },
  },
});