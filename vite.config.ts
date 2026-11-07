import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      // index.html is the 3D game; 2d.html keeps the original Phaser version playable
      input: { main: 'index.html', play2d: '2d.html' },
    },
  },
  server: {
    port: 3000,
  },
});
