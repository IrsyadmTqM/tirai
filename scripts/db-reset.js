// Membuat ulang data/tirai.db berisi skema dan data sintetis.
// Jalankan: npm run db:reset

import { buatDatabaseSintetis, hitungBaris, lokasiDatabase } from '../src/server/db/index.js';

const lokasi = lokasiDatabase();
const db = await buatDatabaseSintetis(lokasi);
console.log(`Database sintetis dibuat ulang: ${lokasi}`);
console.table(hitungBaris(db));
db.close();
