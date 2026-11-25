// E2EE terbatas: catatan pribadi dienkripsi di browser. Tes ini memakai
// modul browser yang sama (Web Crypto API juga tersedia di Node.js) untuk
// membuktikan bahwa server hanya pernah menerima dan menyimpan ciphertext.

import { describe, it, expect, beforeAll } from 'vitest';
import { ITERASI, bukaCatatan, kunciCatatan } from '../src/web/lib/catatan-e2ee.js';
import { masukSebagai, siapkanApp } from './bantuan.js';

const TEKS = 'Perhitungan zakat mal 2026: tabungan 120 juta, emas 50 gram (contoh sintetis).';
const SANDI = 'kata sandi catatan yang panjang';

describe('modul enkripsi di browser', () => {
  it('membuka kembali dengan kata sandi yang benar', async () => {
    const paket = await kunciCatatan(TEKS, SANDI, 100_000);
    expect(await bukaCatatan(paket, SANDI)).toBe(TEKS);
  });

  it('menolak kata sandi yang salah', async () => {
    const paket = await kunciCatatan(TEKS, SANDI, 100_000);
    await expect(bukaCatatan(paket, 'tebakan')).rejects.toThrow();
  });

  it('menolak isi yang diubah', async () => {
    const paket = await kunciCatatan(TEKS, SANDI, 100_000);
    const rusak = { ...paket, isi: (paket.isi[0] === 'A' ? 'B' : 'A') + paket.isi.slice(1) };
    await expect(bukaCatatan(rusak, SANDI)).rejects.toThrow();
  });

  it('memakai 600.000 iterasi PBKDF2 secara bawaan', async () => {
    const paket = await kunciCatatan('a', SANDI);
    expect(paket.iterasi).toBe(ITERASI);
    expect(ITERASI).toBe(600_000);
  });
});

describe('server hanya menyimpan ciphertext', () => {
  let app;
  let db;
  let pemilik;
  let paket;
  beforeAll(async () => {
    ({ app, db } = await siapkanApp());
    pemilik = await masukSebagai(app, 'donatur-01');
    paket = await kunciCatatan(TEKS, SANDI, 100_000);
  });

  it('yang dikirim dan disimpan tidak memuat teks asli maupun kata sandi', async () => {
    const res = await pemilik.put('/api/data-saya/catatan').send(paket);
    expect(res.status).toBe(200);
    const mentah = JSON.stringify(db.prepare('SELECT * FROM catatan_rahasia').all());
    expect(mentah).not.toContain('zakat mal');
    expect(mentah).not.toContain(SANDI);
    expect(JSON.stringify(paket)).not.toContain(SANDI);
  });

  it('server mengembalikan ciphertext apa adanya, dan hanya pemiliknya yang bisa membuka', async () => {
    const res = await pemilik.get('/api/data-saya/catatan');
    expect(res.body.catatan).toMatchObject(paket);
    expect(await bukaCatatan(res.body.catatan, SANDI)).toBe(TEKS);
  });

  it('peran lain tidak bisa mengambilnya', async () => {
    for (const akun of ['admin', 'bendahara', 'amil-rw01']) {
      const agen = await masukSebagai(app, akun);
      expect((await agen.get('/api/data-saya/catatan')).status).toBe(403);
    }
  });

  it('pemilik lain tidak melihat catatan ini', async () => {
    const lain = await masukSebagai(app, 'donatur-02');
    expect((await lain.get('/api/data-saya/catatan')).body.catatan).toBeNull();
  });

  it('ekspor memuat catatan dalam bentuk terenkripsi saja', async () => {
    const isi = JSON.parse((await pemilik.get('/api/data-saya/ekspor')).text);
    expect(isi.catatan_pribadi_terenkripsi.isi).toBe(paket.isi);
    expect(JSON.stringify(isi)).not.toContain('zakat mal');
  });

  it('menyimpan, membaca, dan menghapus catatan tercatat di audit log', async () => {
    await pemilik.delete('/api/data-saya/catatan');
    const aksi = db
      .prepare("SELECT aksi FROM audit_log WHERE objek = 'catatan' ORDER BY id")
      .all()
      .map((l) => l.aksi);
    expect(aksi).toEqual(['ubah', 'baca', 'hapus']);
    expect(db.prepare('SELECT COUNT(*) AS n FROM catatan_rahasia').get().n).toBe(0);
  });

  it('menolak masukan yang bukan base64 atau di luar batas', async () => {
    const buruk = [
      { ...paket, isi: 'teks biasa, bukan base64!' },
      { ...paket, iv: 'AAAA' },
      { ...paket, iterasi: 10 },
      { ...paket, isi: 'A'.repeat(20000) },
    ];
    for (const b of buruk) expect((await pemilik.put('/api/data-saya/catatan').send(b)).status).toBe(400);
  });
});

describe('penghapusan akun', () => {
  it('catatan ikut terhapus saat data donatur dihapus', async () => {
    const { app, db } = await siapkanApp();
    const pemilik = await masukSebagai(app, 'donatur-01');
    await pemilik.put('/api/data-saya/catatan').send(await kunciCatatan(TEKS, SANDI, 100_000));
    await pemilik.post('/api/data-saya/hapus');
    const admin = await masukSebagai(app, 'admin');
    await admin.post('/api/permintaan/1/proses').send({ keputusan: 'setujui' });
    expect(db.prepare('SELECT COUNT(*) AS n FROM catatan_rahasia').get().n).toBe(0);
  });
});
