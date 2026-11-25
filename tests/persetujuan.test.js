// Persetujuan (consent): lihat dan cabut per tujuan, dengan akibat nyata.

import { describe, it, expect, beforeAll } from 'vitest';
import { DONASI, DONATUR, NAMA_DICABUT } from '../src/server/db/data-sintetis.js';
import { masukSebagai, siapkanApp } from './bantuan.js';

const idTerakhir = (db) => db.prepare('SELECT COALESCE(MAX(id), 0) AS n FROM audit_log').get().n;

describe('melihat persetujuan', () => {
  it('menampilkan dua tujuan beserta statusnya', async () => {
    const { app } = await siapkanApp();
    const pemilik = await masukSebagai(app, 'donatur-01');
    const res = await pemilik.get('/api/data-saya/persetujuan');
    expect(res.status).toBe(200);
    expect(res.body.persetujuan.map((p) => [p.tujuan, p.diberikan])).toEqual([
      ['kontak_bukti', true],
      ['nama_di_catatan', true],
    ]);
    for (const p of res.body.persetujuan) expect(p.uraian).toMatch(/dicabut/);
  });
});

describe('mencabut izin kontak', () => {
  let app;
  let db;
  let pemilik;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
    pemilik = await masukSebagai(app, 'donatur-01');
  });

  it('kontak langsung dihapus dari database, dan tercatat di audit log', async () => {
    const awal = idTerakhir(db);
    const res = await pemilik.put('/api/data-saya/persetujuan/kontak_bukti').send({ diberikan: false });
    expect(res.status).toBe(200);
    expect(res.body.akibat).toEqual(['kontak_dihapus']);
    expect(db.prepare('SELECT kontak FROM donatur WHERE id = 1').get().kontak).toBeNull();
    const log = db.prepare('SELECT aksi, objek FROM audit_log WHERE id > ?').all(awal).map((l) => `${l.aksi} ${l.objek}`);
    expect(log).toEqual(['ubah persetujuan', 'hapus donatur']);
    const data = await pemilik.get('/api/data-saya');
    expect(data.body.data.find((f) => f.kolom === 'kontak').nilai).toBeNull();
  });

  it('kontak tidak bisa diisi selama izin dicabut', async () => {
    const res = await pemilik.put('/api/data-saya/kontak').send({ kontak: 'baru@contoh.test' });
    expect(res.status).toBe(422);
  });

  it('setelah izin diberikan lagi, kontak baru tersimpan terenkripsi', async () => {
    await pemilik.put('/api/data-saya/persetujuan/kontak_bukti').send({ diberikan: true });
    expect((await pemilik.put('/api/data-saya/kontak').send({ kontak: 'baru@contoh.test' })).status).toBe(200);
    const mentah = db.prepare('SELECT kontak FROM donatur WHERE id = 1').get().kontak;
    expect(mentah).toMatch(/^v1:/);
    const data = await pemilik.get('/api/data-saya');
    expect(data.body.data.find((f) => f.kolom === 'kontak').nilai).toBe('baru@contoh.test');
  });
});

describe('mencabut izin nama di catatan donasi', () => {
  let app;
  let db;
  let pemilik;
  let bendahara;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
    pemilik = await masukSebagai(app, 'donatur-02');
    bendahara = await masukSebagai(app, 'bendahara');
    await pemilik.put('/api/data-saya/persetujuan/nama_di_catatan').send({ diberikan: false });
  });

  it('bendahara tidak lagi menerima nama donatur itu, tetapi nominalnya tetap ada', async () => {
    const res = await bendahara.get('/api/donasi');
    const teks = JSON.stringify(res.body);
    expect(teks).not.toContain(DONATUR[1].nama);
    const milik = DONASI.filter((d) => d.donatur_id === 2).map((d) => d.id);
    const baris = res.body.donasi.filter((d) => milik.includes(d.id));
    expect(baris).toHaveLength(milik.length);
    expect(baris.every((d) => d.donatur === null && d.nominal > 0)).toBe(true);
  });

  it('donatur itu hilang dari pilihan donatur bendahara', async () => {
    const res = await bendahara.get('/api/donatur');
    expect(res.body.donatur.map((d) => d.id)).not.toContain(2);
  });

  it('donasi baru atas nama donatur itu ditolak', async () => {
    const res = await bendahara.post('/api/donasi').send({ donatur_id: 2, jenis: 'infak', nominal: 5000, tanggal: '2026-11-20' });
    expect(res.status).toBe(422);
  });

  it('bendahara membaca catatan donasi tidak lagi tercatat sebagai akses atas data donatur itu', async () => {
    const awal = idTerakhir(db);
    await bendahara.get('/api/donasi');
    const subjek = db
      .prepare("SELECT subjek_id FROM audit_log WHERE id > ? AND subjek_jenis = 'donatur'")
      .all(awal)
      .map((l) => l.subjek_id);
    expect(subjek).not.toContain(2);
    expect(subjek).toContain(1);
  });

  it('pemilik masih melihat semua donasinya sendiri lengkap', async () => {
    const res = await pemilik.get('/api/data-saya');
    expect(res.body.transaksi.baris).toHaveLength(DONASI.filter((d) => d.donatur_id === 2).length);
  });
});

describe('data sintetis dan validasi', () => {
  it('donatur yang dalam data sintetis mencabut izin nama tampil tanpa nama bagi bendahara', async () => {
    const { app } = await siapkanApp();
    const bendahara = await masukSebagai(app, 'bendahara');
    const teks = JSON.stringify((await bendahara.get('/api/donasi')).body);
    for (const id of NAMA_DICABUT) expect(teks).not.toContain(DONATUR[id - 1].nama);
  });

  it('tujuan tak dikenal dan nilai bukan boolean ditolak 400', async () => {
    const { app } = await siapkanApp();
    const pemilik = await masukSebagai(app, 'donatur-01');
    expect((await pemilik.put('/api/data-saya/persetujuan/iklan').send({ diberikan: true })).status).toBe(400);
    expect((await pemilik.put('/api/data-saya/persetujuan/kontak_bukti').send({ diberikan: 'ya' })).status).toBe(400);
  });

  it('ekspor memuat status persetujuan', async () => {
    const { app } = await siapkanApp();
    const pemilik = await masukSebagai(app, 'donatur-01');
    const isi = JSON.parse((await pemilik.get('/api/data-saya/ekspor')).text);
    expect(isi.persetujuan.map((p) => p.tujuan)).toEqual(['kontak_bukti', 'nama_di_catatan']);
  });
});
