// Alat bantu tes: aplikasi dengan database sintetis di memori, dan agen
// HTTP yang sudah masuk sebagai akun demo tertentu.

import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { buatDatabaseSintetis } from '../src/server/db/index.js';
import { KATA_SANDI_DEMO } from '../src/server/db/data-sintetis.js';

export const AKUN_PERAN = {
  admin: 'admin',
  bendahara: 'bendahara',
  amil: 'amil-rw01',
  pemilik: 'donatur-01',
};

export async function siapkanApp(opsi = {}) {
  const db = await buatDatabaseSintetis();
  const app = createApp({ db, opsi });
  return { db, app };
}

export async function masukSebagai(app, namaPengguna) {
  const agen = request.agent(app);
  const res = await agen.post('/api/masuk').send({ nama_pengguna: namaPengguna, kata_sandi: KATA_SANDI_DEMO });
  if (res.status !== 200) throw new Error(`Gagal masuk sebagai ${namaPengguna}: ${res.status}`);
  return agen;
}
