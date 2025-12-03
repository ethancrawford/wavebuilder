import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "sass:math";`
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
