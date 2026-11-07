import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      // index.html is the live 2D game; 3d.html is the 3D draft
      input: { main: 'index.html', play3d: '3d.html' },
    },
  },
  server: {
    port: 3000,
  },
});
