// Menampilkan isi mentah setiap tabel, langsung dari berkas database,
// tanpa lewat server. Dipakai sebagai bukti uji: apa yang benar-benar
// tersimpan di disk (mulai langkah 3, kolom sensitif harus berupa ciphertext).
// Jalankan: npm run db:lihat

import '../src/server/muat-env.js';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { TABEL, lokasiDatabase } from '../src/server/db/index.js';

const lokasi = lokasiDatabase();
if (!fs.existsSync(lokasi)) {
  console.error(`Berkas ${lokasi} belum ada. Jalankan dulu: npm run db:reset`);
  process.exit(1);
}

const PANJANG_MAKS = 48;
const ringkas = (nilai) =>
  typeof nilai === 'string' && nilai.length > PANJANG_MAKS ? `${nilai.slice(0, PANJANG_MAKS)}…` : nilai;

const db = new DatabaseSync(lokasi, { readOnly: true });
console.log(`Isi mentah ${lokasi}\n`);
for (const tabel of TABEL) {
  const baris = db.prepare(`SELECT * FROM ${tabel}`).all();
  console.log(`== ${tabel} (${baris.length} baris)`);
  console.table(baris.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, ringkas(v)]))));
}
db.close();
