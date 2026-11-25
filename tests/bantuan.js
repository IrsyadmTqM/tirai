// Alat bantu tes: aplikasi dengan database sintetis di memori, dan agen
// HTTP yang sudah masuk sebagai akun demo tertentu.

import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { buatDatabaseSintetis } from '../src/server/db/index.js';
import { KATA_SANDI_DEMO } from '../src/server/db/data-sintetis.js';
import { muatKunci } from '../src/server/keamanan/kripto.js';

export const AKUN_PERAN = {
  admin: 'admin',
  bendahara: 'bendahara',
  amil: 'amil-rw01',
  pemilik: 'donatur-01',
};

// Kunci acak baru untuk tiap aplikasi uji (tidak membaca .env).
export const kunciUji = () => muatKunci({});

export async function siapkanApp(opsi = {}) {
  const kunci = kunciUji();
  const db = await buatDatabaseSintetis(':memory:', kunci);
  const app = createApp({ db, kunci, opsi });
  return { db, app, kunci };
}

export async function masukSebagai(app, namaPengguna) {
  const agen = request.agent(app);
  const res = await agen.post('/api/masuk').send({ nama_pengguna: namaPengguna, kata_sandi: KATA_SANDI_DEMO });
  if (res.status !== 200) throw new Error(`Gagal masuk sebagai ${namaPengguna}: ${res.status}`);
  return agen;
}
