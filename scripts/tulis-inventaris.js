// Menulis docs/inventaris-data.md dari src/server/db/inventaris.js,
// supaya dokumen dan kode tidak pernah berbeda.
// Jalankan: npm run docs:inventaris

import fs from 'node:fs';
import path from 'node:path';
import { INVENTARIS, TIDAK_DIKUMPULKAN } from '../src/server/db/inventaris.js';

const baris = [
  '# Inventaris data Tirai',
  '',
  'Berkas ini dibuat otomatis oleh `npm run docs:inventaris` dari',
  '`src/server/db/inventaris.js`. Jangan diedit langsung.',
  '',
  'Setiap kolom di database punya alasan tertulis. Tes otomatis',
  '(`tests/database.test.js`) gagal bila ada kolom tanpa alasan.',
  'Kolom perlindungan berisi rancangan akhir: RBAC aktif mulai langkah 2,',
  'enkripsi kolom mulai langkah 3.',
  '',
];

for (const [tabel, kolom] of Object.entries(INVENTARIS)) {
  baris.push(`## ${tabel}`, '', '| Kolom | Alasan | Perlindungan |', '| --- | --- | --- |');
  for (const [nama, { alasan, perlindungan }] of Object.entries(kolom)) {
    baris.push(`| \`${nama}\` | ${alasan} | ${perlindungan} |`);
  }
  baris.push('');
}

baris.push('## Tidak dikumpulkan', '', '| Data | Alasan |', '| --- | --- |');
for (const { data, alasan } of TIDAK_DIKUMPULKAN) baris.push(`| ${data} | ${alasan} |`);
baris.push('');

const tujuan = path.resolve(import.meta.dirname, '../docs/inventaris-data.md');
fs.writeFileSync(tujuan, baris.join('\n'));
console.log(`Ditulis: ${tujuan}`);
