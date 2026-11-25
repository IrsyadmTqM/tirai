// Dasbor "Data saya": lihat, riwayat akses, ekspor, dan hapus.
// Bukti lulus: berkas ekspor lengkap, dan setelah dihapus data tidak lagi
// terbaca, sementara catatan keuangan tetap ada tanpa identitas.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { DONASI, DONATUR, MUSTAHIK, PENYALURAN } from '../src/server/db/data-sintetis.js';
import { keCsv } from '../src/server/layanan/data-pribadi.js';
import { masukSebagai, siapkanApp } from './bantuan.js';

describe('melihat data sendiri', () => {
  let app;
  let pemilik;
  beforeAll(async () => {
    ({ app } = await siapkanApp());
    pemilik = await masukSebagai(app, 'donatur-01');
  });

  it('menampilkan semua data milik sendiri beserta alasan tiap field', async () => {
    const res = await pemilik.get('/api/data-saya');
    expect(res.status).toBe(200);
    expect(res.body.subjek).toEqual({ jenis: 'donatur', id: 1 });
    const nilai = Object.fromEntries(res.body.data.map((f) => [f.kolom, f.nilai]));
    expect(nilai).toMatchObject({ nama: DONATUR[0].nama, kontak: DONATUR[0].kontak, nama_pengguna: 'donatur-01' });
    for (const f of res.body.data) expect(f.alasan, f.kolom).toMatch(/\S/);
  });

  it('hanya memuat donasi miliknya sendiri', async () => {
    const res = await pemilik.get('/api/data-saya');
    const milik = DONASI.filter((d) => d.donatur_id === 1);
    expect(res.body.transaksi.baris).toHaveLength(milik.length);
    expect(JSON.stringify(res.body)).not.toContain(DONATUR[1].nama);
  });

  it('riwayat akses memuat akses bendahara, hanya sebagai peran tanpa nama akun', async () => {
    const bendahara = await masukSebagai(app, 'bendahara');
    await bendahara.get('/api/donasi');
    const res = await pemilik.get('/api/data-saya/riwayat');
    const dariBendahara = res.body.riwayat.filter((r) => r.peran === 'bendahara');
    expect(dariBendahara.length).toBeGreaterThan(0);
    expect(dariBendahara[0]).toMatchObject({ aksi: 'baca', objek: 'donatur' });
    for (const r of res.body.riwayat) expect(r).not.toHaveProperty('pelaku');
  });
});

describe('ekspor', () => {
  let app;
  let db;
  let pemilik;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
    pemilik = await masukSebagai(app, 'donatur-01');
  });

  it('JSON: berkas unduhan berisi data, donasi, dan riwayat akses', async () => {
    const res = await pemilik.get('/api/data-saya/ekspor?format=json');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="data-saya-tirai.json"/);
    const isi = JSON.parse(res.text);
    expect(isi.data.find((f) => f.kolom === 'kontak').nilai).toBe(DONATUR[0].kontak);
    expect(isi.transaksi.baris).toHaveLength(DONASI.filter((d) => d.donatur_id === 1).length);
    expect(isi.riwayat_akses.length).toBeGreaterThan(0);
  });

  it('CSV: berkas unduhan berkepala kolom dan memuat nama', async () => {
    const res = await pemilik.get('/api/data-saya/ekspor?format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toMatch(/^﻿?bagian,kolom,nilai,alasan/);
    expect(res.text).toContain(DONATUR[0].nama);
  });

  it('ekspor tercatat di audit log', () => {
    const n = db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE aksi = 'ekspor' AND subjek_id = 1").get().n;
    expect(n).toBe(2);
  });

  it('CSV menetralkan nilai yang bisa dijalankan sebagai rumus lembar kerja', () => {
    const csv = keCsv({
      data: [{ label: 'Nama', nilai: '=HYPERLINK("http://contoh.test")', alasan: 'uji' }],
      transaksi: { jenis: 'donasi', baris: [] },
      riwayat_akses: [],
    });
    expect(csv).toContain(`"'=HYPERLINK(""http://contoh.test"")"`);
  });

  it('amil mengekspor data mustahik di wilayahnya, tidak di wilayah lain', async () => {
    const amil = await masukSebagai(app, 'amil-rw01');
    const milik = await amil.get('/api/mustahik/1/ekspor');
    expect(milik.status).toBe(200);
    expect(JSON.parse(milik.text).data.find((f) => f.kolom === 'alamat').nilai).toBe(MUSTAHIK[0].alamat);
    expect((await amil.get('/api/mustahik/4/ekspor')).status).toBe(404);
  });
});

describe('hapus data donatur', () => {
  let app;
  let db;
  let pemilik;
  let admin;
  let totalDonasiAwal;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
    pemilik = await masukSebagai(app, 'donatur-01');
    admin = await masukSebagai(app, 'admin');
    totalDonasiAwal = db.prepare('SELECT COUNT(*) AS n, SUM(nominal) AS s FROM donasi').get();
  });

  it('pemilik mengajukan; permintaan kedua saat masih menunggu ditolak 409', async () => {
    const res = await pemilik.post('/api/data-saya/hapus');
    expect(res.status).toBe(201);
    expect(res.body.permintaan_hapus.status).toBe('menunggu');
    expect((await pemilik.post('/api/data-saya/hapus')).status).toBe(409);
  });

  it('admin melihat permintaan sebagai nomor, tanpa nama', async () => {
    const res = await admin.get('/api/permintaan');
    expect(res.body.permintaan[0]).toMatchObject({ subjek: { jenis: 'donatur', id: 1 }, status: 'menunggu' });
    expect(JSON.stringify(res.body)).not.toContain(DONATUR[0].nama);
  });

  it('setelah disetujui: identitas, akun, sesi, dan kunci hilang', async () => {
    const { kunci_id } = db.prepare('SELECT kunci_id FROM donatur WHERE id = 1').get();
    const res = await admin.post('/api/permintaan/1/proses').send({ keputusan: 'setujui' });
    expect(res.status).toBe(200);
    expect(res.body.permintaan.status).toBe('disetujui');
    expect(db.prepare('SELECT 1 FROM donatur WHERE id = 1').get()).toBeUndefined();
    expect(db.prepare("SELECT 1 FROM pengguna WHERE nama_pengguna = 'donatur-01'").get()).toBeUndefined();
    expect(db.prepare('SELECT 1 FROM kunci_data WHERE id = ?').get(kunci_id)).toBeUndefined();
    expect((await pemilik.get('/api/data-saya')).status).toBe(401);
  });

  it('catatan donasi tetap ada tanpa identitas, total tidak berubah', async () => {
    expect(db.prepare('SELECT COUNT(*) AS n, SUM(nominal) AS s FROM donasi').get()).toEqual(totalDonasiAwal);
    const bekas = DONASI.filter((d) => d.donatur_id === 1).map((d) => d.id);
    for (const id of bekas) expect(db.prepare('SELECT donatur_id FROM donasi WHERE id = ?').get(id).donatur_id).toBeNull();
    const bendahara = await masukSebagai(app, 'bendahara');
    expect(JSON.stringify((await bendahara.get('/api/donasi')).body)).not.toContain(DONATUR[0].nama);
  });

  it('isi database tidak lagi memuat data donatur itu', () => {
    const isi = JSON.stringify(db.prepare('SELECT * FROM donatur').all());
    expect(isi).not.toContain(DONATUR[0].nama);
  });

  it('audit log tetap utuh dan tetap tanpa nama', () => {
    const n = db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE subjek_jenis = 'donatur' AND subjek_id = 1").get().n;
    expect(n).toBeGreaterThan(0);
    const hapus = db.prepare("SELECT * FROM audit_log WHERE aksi = 'hapus'").all();
    expect(hapus).toHaveLength(1);
    expect(hapus[0]).toMatchObject({ peran: 'admin', objek: 'donatur', subjek_id: 1 });
  });
});

describe('hapus data mustahik lewat amil', () => {
  let app;
  let db;
  let amil;
  let admin;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
    amil = await masukSebagai(app, 'amil-rw01');
    admin = await masukSebagai(app, 'admin');
  });

  it('amil mengajukan untuk mustahik di wilayahnya, tidak untuk wilayah lain', async () => {
    expect((await amil.post('/api/mustahik/4/hapus')).status).toBe(404);
    const res = await amil.post('/api/mustahik/2/hapus');
    expect(res.status).toBe(201);
    expect(res.body.permintaan_hapus).toMatchObject({ diajukan_peran: 'amil', status: 'menunggu' });
  });

  it('ditolak: data tetap utuh', async () => {
    const id = (await admin.get('/api/permintaan')).body.permintaan[0].id;
    await admin.post(`/api/permintaan/${id}/proses`).send({ keputusan: 'tolak' });
    expect(db.prepare('SELECT dianonimkan_pada FROM mustahik WHERE id = 2').get().dianonimkan_pada).toBeNull();
    expect((await admin.post(`/api/permintaan/${id}/proses`).send({ keputusan: 'setujui' })).status).toBe(409);
  });

  it('disetujui: identitas dikosongkan, kunci dimusnahkan, penyaluran tetap ada', async () => {
    await amil.post('/api/mustahik/2/hapus');
    const { kunci_id, nama } = db.prepare('SELECT kunci_id, nama FROM mustahik WHERE id = 2').get();
    const id = (await admin.get('/api/permintaan')).body.permintaan[0].id;
    expect((await admin.post(`/api/permintaan/${id}/proses`).send({ keputusan: 'setujui' })).status).toBe(200);

    const m = db.prepare('SELECT * FROM mustahik WHERE id = 2').get();
    expect(m).toMatchObject({ nama: null, alamat: null, kondisi: null, nik_hmac: null, kunci_id: null, asnaf: 'miskin' });
    expect(m.dianonimkan_pada).not.toBeNull();
    expect(db.prepare('SELECT 1 FROM kunci_data WHERE id = ?').get(kunci_id)).toBeUndefined();
    expect(() => app.locals.brankas.dekripsi(kunci_id, nama, 'mustahik.nama')).toThrow();

    const penyaluran = PENYALURAN.filter((p) => p.mustahik_id === 2).length;
    expect(db.prepare('SELECT COUNT(*) AS n FROM penyaluran WHERE mustahik_id = 2').get().n).toBe(penyaluran);
  });

  it('buku kas tetap memuat penyaluran itu, ditandai dianonimkan dan tanpa nama', async () => {
    const bendahara = await masukSebagai(app, 'bendahara');
    const { body } = await bendahara.get('/api/buku-kas');
    const baris = body.baris.filter((b) => b.dianonimkan);
    expect(baris).toHaveLength(PENYALURAN.filter((p) => p.mustahik_id === 2).length);
    expect(baris.every((b) => b.nama === null && typeof b.nominal === 'number')).toBe(true);
    expect(JSON.stringify(body)).not.toContain(MUSTAHIK[1].nama);
  });

  it('mustahik itu hilang dari daftar amil dan tidak bisa diekspor lagi', async () => {
    const daftar = (await amil.get('/api/mustahik')).body.mustahik.map((m) => m.id);
    expect(daftar).not.toContain(2);
    expect((await amil.get('/api/mustahik/2/ekspor')).status).toBe(404);
  });

  it('penyaluran baru ke mustahik yang sudah dihapus ditolak', async () => {
    const bendahara = await masukSebagai(app, 'bendahara');
    const res = await bendahara
      .post('/api/penyaluran')
      .send({ mustahik_id: 2, jenis_dana: 'infak', nominal: 1000, tanggal: '2026-11-20' });
    expect(res.status).toBe(400);
  });
});

describe('tanpa sesi', () => {
  it('semua endpoint Data saya menolak 401', async () => {
    const { app } = await siapkanApp();
    for (const jalur of ['/api/data-saya', '/api/data-saya/riwayat', '/api/data-saya/ekspor']) {
      expect((await request(app).get(jalur)).status).toBe(401);
    }
  });
});
