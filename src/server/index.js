import { createApp } from './app.js';
import { buatDatabaseSintetis, hitungBaris, lokasiDatabase } from './db/index.js';

const port = Number(process.env.PORT) || 3000;

// Prototipe: database dibuat ulang dengan data sintetis setiap server menyala.
const lokasi = lokasiDatabase();
const db = await buatDatabaseSintetis(lokasi);
const jumlah = Object.entries(hitungBaris(db))
  .map(([tabel, n]) => `${tabel} ${n}`)
  .join(', ');
console.log(`Database sintetis dibuat ulang: ${lokasi}`);
console.log(`Isi: ${jumlah}`);

createApp().listen(port, () => {
  console.log(`Tirai server berjalan di http://localhost:${port}`);
});
