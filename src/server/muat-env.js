// Memuat .env dari akar proyek bila berkasnya ada. Diimpor paling awal oleh
// index.js. Tidak memakai flag --env-file-if-exists karena, bersama
// node --watch, flag itu membuat server berhenti bila .env belum dibuat.

import fs from 'node:fs';
import path from 'node:path';

const lokasi = path.resolve(import.meta.dirname, '../../.env');
if (fs.existsSync(lokasi)) process.loadEnvFile(lokasi);
