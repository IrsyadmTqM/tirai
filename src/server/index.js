import './muat-env.js';
import { createApp } from './app.js';
import { buatDatabaseSintetis, hitungBaris, lokasiDatabase } from './db/index.js';
import { muatKunci } from './keamanan/kripto.js';

const port = Number(process.env.PORT) || 3000;

// Prototipe: database dibuat ulang dengan data sintetis setiap server menyala.
const kunci = muatKunci();
if (kunci.sementara.length) {
  console.warn(`Peringatan: ${kunci.sementara.join(' dan ')} kosong, memakai kunci sementara di memori.`);
  console.warn('Isi .env (lihat .env.example) agar kunci tetap sama setelah server dimulai ulang.');
}
const lokasi = lokasiDatabase();
const db = await buatDatabaseSintetis(lokasi, kunci);
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

createApp({ db, kunci, opsi }).listen(port, () => {
  console.log(`Tirai server berjalan di http://localhost:${port}`);
});
