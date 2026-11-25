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

const opsi = {
  peragaan: process.env.MODE_PERAGAAN !== 'mati',
  cookieAman: process.env.NODE_ENV === 'production',
};
if (opsi.peragaan) console.log('Mode peragaan aktif: beranda menampilkan buku kas sintetis per peran.');

createApp({ db, opsi }).listen(port, () => {
  console.log(`Tirai server berjalan di http://localhost:${port}`);
});
