// Membuat ulang data/tirai.db berisi skema dan data sintetis.
// Jalankan: npm run db:reset

import { buatDatabaseSintetis, hitungBaris, lokasiDatabase } from '../src/server/db/index.js';
import { muatKunci } from '../src/server/keamanan/kripto.js';

const lokasi = lokasiDatabase();
const kunci = muatKunci();
if (kunci.sementara.length) console.warn(`Memakai kunci sementara untuk ${kunci.sementara.join(' dan ')}: berkas ini tidak bisa dibuka lagi.`);
const db = await buatDatabaseSintetis(lokasi, kunci);
console.log(`Database sintetis dibuat ulang: ${lokasi}`);
console.table(hitungBaris(db));
db.close();
