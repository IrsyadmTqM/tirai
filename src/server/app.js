import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { asalSama, headerKeamanan, kenaliPengguna } from './keamanan/middleware.js';
import { ruteAutentikasi } from './rute/autentikasi.js';
import { ruteKeuangan } from './rute/keuangan.js';
import { ruteOrang } from './rute/orang.js';
import { rutePeragaan } from './rute/peragaan.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, '../../dist');

// opsi.peragaan: aktifkan buku kas peragaan di beranda (data sintetis saja).
// opsi.cookieAman: cookie hanya dikirim lewat HTTPS (aktifkan di produksi).
export function createApp({ db, opsi = {} } = {}) {
  if (!db) throw new Error('createApp membutuhkan db');
  const konteks = { db, opsi: { peragaan: true, cookieAman: false, ...opsi } };

  const app = express();
  app.disable('x-powered-by');
  app.use(headerKeamanan);
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  // Jawaban API berisi data pribadi: jangan disimpan di cache browser atau proxy.
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(asalSama);
  api.use(kenaliPengguna(db));

  api.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'Tirai' });
  });
  api.use(ruteAutentikasi(konteks));
  api.use(rutePeragaan(konteks));
  api.use(ruteKeuangan(konteks));
  api.use(ruteOrang(konteks));

  // Endpoint API yang tidak dikenal: 404 dalam bentuk JSON.
  api.use((req, res) => {
    res.status(404).json({ error: 'Tidak ditemukan' });
  });

  // Galat: pesan untuk masukan yang salah dikirim apa adanya; galat lain
  // disamarkan supaya rincian server tidak bocor.
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Format JSON tidak valid' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Data terlalu besar' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan di server' });
  });

  app.use('/api', api);

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
