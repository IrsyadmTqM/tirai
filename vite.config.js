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
    // changeOrigin: false agar header Host tetap localhost:5173. Bentuk singkat
    // (string) di Vite memakai changeOrigin: true, sehingga Host berubah menjadi
    // localhost:3000 dan penahan CSRF asalSama() menolak login di mode dev.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
  test: {
    root: import.meta.dirname,
    include: ['tests/**/*.test.js'],
    // node:sqlite masih berlabel eksperimental di Node 22; sembunyikan peringatannya.
    execArgv: ['--disable-warning=ExperimentalWarning'],
  },
});
