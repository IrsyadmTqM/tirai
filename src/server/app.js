import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, '../../dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Tirai' });
  });

  // Endpoint API yang tidak dikenal: 404 dalam bentuk JSON.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Tidak ditemukan' });
  });

  // Mode produksi: Express menyajikan hasil build React.
  if (fs.existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(WEB_DIST, 'index.html'));
    });
  }

  return app;
}
