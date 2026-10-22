import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // two pages: the game and the style guide (#65)
  build: { target: 'es2022', outDir: 'dist', rollupOptions: { input: { main: 'index.html', styleguide: 'styleguide.html' } } },
  server: { port: 5173, host: true },
  test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'], environment: 'node' },
});
