import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local dev, proxy /api calls to the local Express backend (port 3001),
// so the frontend can use relative /api URLs in dev and in production (Vercel).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
