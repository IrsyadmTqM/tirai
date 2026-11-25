import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'src/web',
  plugins: [react()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    root: import.meta.dirname,
    include: ['tests/**/*.test.js'],
    // node:sqlite masih berlabel eksperimental di Node 22; sembunyikan peringatannya.
    execArgv: ['--disable-warning=ExperimentalWarning'],
  },
});
