// Data yang tidak boleh dilihat suatu peran tidak boleh ada di jawaban
// server sama sekali (bukan sekadar disembunyikan di tampilan). Tes ini
// mencari teks asli data sintetis di seluruh jawaban JSON.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { DONATUR, MUSTAHIK } from '../src/server/db/data-sintetis.js';
import { AKUN_PERAN, masukSebagai, siapkanApp } from './bantuan.js';

const alamatSemua = MUSTAHIK.map((m) => m.alamat);
const kondisiSemua = MUSTAHIK.filter((m) => m.kondisi).map((m) => m.kondisi);
const namaSemua = MUSTAHIK.map((m) => m.nama);
const diWilayah = (w) => MUSTAHIK.filter((m) => m.wilayah_id === w);
const luarWilayah = (w) => MUSTAHIK.filter((m) => m.wilayah_id !== w);

function tidakMemuat(body, daftar) {
  const teks = JSON.stringify(body);
  for (const nilai of daftar) expect(teks, `bocor: ${nilai}`).not.toContain(nilai);
}

describe('buku kas per peran', () => {
  let app;
  const agen = {};
  beforeAll(async () => {
    ({ app } = await siapkanApp());
    for (const [peran, akun] of Object.entries(AKUN_PERAN)) agen[peran] = await masukSebagai(app, akun);
  });

  it('admin: tanpa identitas mustahik dan tanpa nominal per baris, ada ringkasan', async () => {
    const { body } = await agen.admin.get('/api/buku-kas');
    tidakMemuat(body, [...namaSemua, ...alamatSemua, ...kondisiSemua]);
    for (const b of body.baris) {
      expect(b.nominal).toBeNull();
      expect(b.tertutup).toEqual(expect.arrayContaining(['nama', 'alamat', 'kondisi', 'nominal', 'wilayah']));
    }
    expect(body.ringkasan.total.masuk).toBeGreaterThan(0);
  });

  it('bendahara: nama dan nominal terlihat, alamat dan kondisi tidak dikirim', async () => {
    const { body } = await agen.bendahara.get('/api/buku-kas');
    tidakMemuat(body, [...alamatSemua, ...kondisiSemua]);
    expect(body.baris.every((b) => typeof b.nominal === 'number')).toBe(true);
    expect(body.baris.every((b) => b.nama !== null)).toBe(true);
  });

  it('amil RW 01: data lengkap wilayahnya, tanpa nominal, wilayah lain tertutup', async () => {
    const { body } = await agen.amil.get('/api/buku-kas');
    const teks = JSON.stringify(body);
    for (const m of diWilayah(1)) expect(teks).toContain(m.alamat);
    tidakMemuat(body, luarWilayah(1).flatMap((m) => [m.nama, m.alamat, m.kondisi].filter(Boolean)));
    expect(body.baris.every((b) => b.nominal === null)).toBe(true);
    expect(body.ringkasan).toBeNull();
  });

  it('jawaban tidak memuat id mustahik untuk peran yang identitasnya tertutup', async () => {
    const { body } = await agen.admin.get('/api/buku-kas');
    expect(JSON.stringify(body)).not.toMatch(/mustahik_id/);
  });
});

describe('daftar mustahik dan donasi per peran', () => {
  let app;
  const agen = {};
  beforeAll(async () => {
    ({ app } = await siapkanApp());
    for (const [peran, akun] of Object.entries(AKUN_PERAN)) agen[peran] = await masukSebagai(app, akun);
  });

  it('bendahara melihat mustahik tanpa alamat dan kondisi', async () => {
    const { body } = await agen.bendahara.get('/api/mustahik');
    expect(body.mustahik).toHaveLength(MUSTAHIK.length);
    tidakMemuat(body, [...alamatSemua, ...kondisiSemua]);
  });

  it('amil hanya melihat mustahik wilayahnya', async () => {
    const { body } = await agen.amil.get('/api/mustahik');
    expect(body.mustahik.map((m) => m.id).sort()).toEqual(diWilayah(1).map((m) => m.id).sort());
    tidakMemuat(body, luarWilayah(1).flatMap((m) => [m.nama, m.alamat]));
  });

  it('bendahara melihat nama donatur tetapi tidak kontaknya', async () => {
    const donasi = await agen.bendahara.get('/api/donasi');
    const donatur = await agen.bendahara.get('/api/donatur');
    const kontak = DONATUR.filter((d) => d.kontak).map((d) => d.kontak);
    tidakMemuat(donasi.body, kontak);
    tidakMemuat(donatur.body, kontak);
    expect(JSON.stringify(donatur.body)).toContain(DONATUR[0].nama);
  });
});

describe('aturan pencatatan', () => {
  let app;
  let bendahara;
  beforeAll(async () => {
    ({ app } = await siapkanApp());
    bendahara = await masukSebagai(app, 'bendahara');
  });

  it('menolak nominal bukan bilangan bulat dan tanggal di masa depan', async () => {
    const dasar = { donatur_id: 1, jenis: 'infak', nominal: 5000, tanggal: '2026-11-01' };
    expect((await bendahara.post('/api/donasi').send({ ...dasar, nominal: '5000' })).status).toBe(400);
    expect((await bendahara.post('/api/donasi').send({ ...dasar, nominal: 12.5 })).status).toBe(400);
    expect((await bendahara.post('/api/donasi').send({ ...dasar, tanggal: '2999-01-01' })).status).toBe(400);
    expect((await bendahara.post('/api/donasi').send({ ...dasar, tanggal: '2026-02-30' })).status).toBe(400);
    expect((await bendahara.post('/api/donasi').send({ ...dasar, jenis: 'hibah' })).status).toBe(400);
    expect((await bendahara.post('/api/donasi').send(dasar)).status).toBe(201);
  });

  it('menolak penyaluran yang melebihi saldo jenis dananya', async () => {
    const res = await bendahara
      .post('/api/penyaluran')
      .send({ mustahik_id: 1, jenis_dana: 'zakat_fitrah', nominal: 1000, tanggal: '2026-11-01' });
    expect(res.status).toBe(422);
  });

  it('perubahan peran oleh admin langsung berlaku pada sesi yang sedang berjalan', async () => {
    const admin = await masukSebagai(app, 'admin');
    const amil2 = await masukSebagai(app, 'amil-rw02');
    expect((await amil2.get('/api/mustahik')).status).toBe(200);
    expect((await admin.patch('/api/pengguna/4').send({ peran: 'admin' })).status).toBe(200);
    expect((await amil2.get('/api/mustahik')).status).toBe(403);
  });

  it('admin tidak bisa mengubah perannya sendiri atau akun pemilik data', async () => {
    const admin = await masukSebagai(app, 'admin');
    expect((await admin.patch('/api/pengguna/1').send({ peran: 'bendahara' })).status).toBe(400);
    expect((await admin.patch('/api/pengguna/5').send({ peran: 'bendahara' })).status).toBe(400);
  });
});

describe('peragaan beranda', () => {
  it('memakai penyaringan yang sama dengan akun sungguhan', async () => {
    const { app } = await siapkanApp();
    const bendahara = await masukSebagai(app, AKUN_PERAN.bendahara);
    const asli = await bendahara.get('/api/buku-kas');
    const peragaan = await request(app).get('/api/peragaan/buku-kas?peran=bendahara');
    expect(peragaan.status).toBe(200);
    expect(peragaan.body.baris).toEqual(asli.body.baris);
    tidakMemuat(peragaan.body, [...alamatSemua, ...kondisiSemua]);
  });

  it('menolak peran di luar admin, bendahara, amil', async () => {
    const { app } = await siapkanApp();
    expect((await request(app).get('/api/peragaan/buku-kas?peran=pemilik')).status).toBe(400);
  });

  it('bisa dimatikan untuk pemasangan sungguhan', async () => {
    const { app } = await siapkanApp({ peragaan: false });
    expect((await request(app).get('/api/peragaan/buku-kas?peran=bendahara')).status).toBe(404);
  });
});
