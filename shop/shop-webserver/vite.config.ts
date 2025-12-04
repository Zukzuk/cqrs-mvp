import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // container port
    host: true,
    strictPort: true,
    watch: { usePolling: true },
    hmr: {
      clientPort: Number(process.env.SHOP_WEB_DEV_PORT) || 5173,
    },
    proxy: {
      '/socket.io': {
        target: 'http://shop-bff-service:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
