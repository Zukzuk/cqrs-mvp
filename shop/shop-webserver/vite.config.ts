import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on 0.0.0.0 in container
    strictPort: true,
    watch: { usePolling: true },// match CHOKIDAR_USEPOLLING
    hmr: { clientPort: Number(process.env.SHOP_WEB_DEV_PORT) || 5173 },
    proxy: {
      // client connects to same-origin `/socket.io` (see getSocket("/"))
      '/socket.io': {
        target: 'http://shop-bff-service:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
