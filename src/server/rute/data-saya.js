// Dasbor "Data saya" untuk pemilik data, dan pemrosesan permintaan hapus
// oleh admin.

import { Router } from 'express';
import { catat, riwayatSubjek } from '../audit.js';
import { wajib } from '../keamanan/middleware.js';
import { bacaDataPribadi, kirimEkspor, paketEkspor, subjekDariPengguna } from '../layanan/data-pribadi.js';
import { ajukanHapus, daftarPermintaan, permintaanTerakhir, prosesPermintaan } from '../layanan/penghapusan.js';
import { TUJUAN, adaPersetujuan, bacaPersetujuan, ubahPersetujuan } from '../layanan/persetujuan.js';
import { ubahKontak } from '../data/orang.js';
import * as v from '../validasi.js';

export function ruteDataSaya({ db, brankas }) {
  const r = Router();

  const subjekSaya = (req) => {
    const subjek = subjekDariPengguna(req.pengguna);
    if (!subjek) throw new v.GalatPermintaan('Akun ini tidak tertaut ke data pribadi', 404);
    return subjek;
  };

  r.get('/data-saya', wajib('data_saya:baca'), (req, res) => {
    const subjek = subjekSaya(req);
    const isi = bacaDataPribadi(db, brankas, subjek);
    if (!isi) return res.status(404).json({ error: 'Data tidak ditemukan' });
    catat(db, { pengguna: req.pengguna, aksi: 'baca', objek: subjek.jenis, subjek });
    res.json({ ...isi, permintaan_hapus: permintaanTerakhir(db, subjek) });
  });

  r.get('/data-saya/riwayat', wajib('data_saya:baca'), (req, res) => {
    const subjek = subjekSaya(req);
    // Pelaku hanya ditampilkan sebagai peran, tanpa nama akun staf.
    const riwayat = riwayatSubjek(db, subjek.jenis, subjek.id).map(({ id, waktu, peran, aksi, objek, saluran }) => ({
      id,
      waktu,
      peran,
      aksi,
      objek,
      saluran,
    }));
    res.json({ riwayat });
  });

  r.get('/data-saya/ekspor', wajib('data_saya:ekspor'), (req, res) => {
    const subjek = subjekSaya(req);
    const format = v.pilihan(req.query.format ?? 'json', 'Format', ['json', 'csv']);
    catat(db, { pengguna: req.pengguna, aksi: 'ekspor', objek: subjek.jenis, subjek });
    const paket = paketEkspor(db, brankas, subjek);
    if (!paket) return res.status(404).json({ error: 'Data tidak ditemukan' });
    kirimEkspor(res, paket, format, 'data-saya-tirai');
  });

  r.post('/data-saya/hapus', wajib('data_saya:hapus'), (req, res) => {
    const subjek = subjekSaya(req);
    const id = ajukanHapus(db, { subjek, diajukanPeran: 'pemilik' });
    catat(db, { pengguna: req.pengguna, aksi: 'buat', objek: 'permintaan', subjek });
    res.status(201).json({ permintaan_hapus: permintaanTerakhir(db, subjek), id });
  });

  // Persetujuan hanya berlaku untuk donatur (lihat docs/arsitektur.md).
  const donaturSaya = (req) => {
    const subjek = subjekSaya(req);
    if (subjek.jenis !== 'donatur') throw new v.GalatPermintaan('Persetujuan hanya untuk akun donatur', 404);
    return subjek;
  };

  r.get('/data-saya/persetujuan', wajib('persetujuan:kelola'), (req, res) => {
    const subjek = donaturSaya(req);
    res.json({ persetujuan: bacaPersetujuan(db, subjek.id) });
  });

  r.put('/data-saya/persetujuan/:tujuan', wajib('persetujuan:kelola'), (req, res) => {
    const subjek = donaturSaya(req);
    const tujuan = v.pilihan(req.params.tujuan, 'Tujuan', TUJUAN);
    if (typeof req.body?.diberikan !== 'boolean') throw new v.GalatPermintaan('diberikan harus true atau false');
    const akibat = ubahPersetujuan(db, subjek.id, tujuan, req.body.diberikan);
    catat(db, { pengguna: req.pengguna, aksi: 'ubah', objek: 'persetujuan', subjek });
    if (akibat.includes('kontak_dihapus')) catat(db, { pengguna: req.pengguna, aksi: 'hapus', objek: 'donatur', subjek });
    res.json({ persetujuan: bacaPersetujuan(db, subjek.id), akibat });
  });

  // Mengisi atau mengganti kontak. Hanya bila izin kontak diberikan.
  r.put('/data-saya/kontak', wajib('persetujuan:kelola'), (req, res) => {
    const subjek = donaturSaya(req);
    if (!adaPersetujuan(db, subjek.id, 'kontak_bukti')) {
      throw new v.GalatPermintaan('Berikan dulu izin menyimpan kontak', 422);
    }
    const kontak = v.teks(req.body?.kontak, 'Kontak', { min: 5, maks: 100 });
    ubahKontak(db, brankas, subjek.id, kontak);
    catat(db, { pengguna: req.pengguna, aksi: 'ubah', objek: 'donatur', subjek });
    res.json({ ok: true });
  });

  // Catatan pribadi E2EE terbatas. Server hanya menyimpan dan mengembalikan
  // isi terenkripsi; tidak ada kode di server yang bisa membukanya.
  const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
  const base64 = (nilai, nama, panjang) => {
    if (typeof nilai !== 'string' || !BASE64.test(nilai)) throw new v.GalatPermintaan(`${nama} harus base64`);
    if (!panjang(nilai.length)) throw new v.GalatPermintaan(`Panjang ${nama} tidak valid`);
    return nilai;
  };

  r.get('/data-saya/catatan', wajib('catatan:kelola'), (req, res) => {
    const subjek = subjekSaya(req);
    const catatan = db
      .prepare('SELECT isi, iv, salt, iterasi, diubah_pada FROM catatan_rahasia WHERE pengguna_id = ?')
      .get(req.pengguna.id);
    if (catatan) catat(db, { pengguna: req.pengguna, aksi: 'baca', objek: 'catatan', subjek });
    res.json({ catatan: catatan ? { ...catatan } : null });
  });

  r.put('/data-saya/catatan', wajib('catatan:kelola'), (req, res) => {
    const subjek = subjekSaya(req);
    const b = req.body ?? {};
    const isi = base64(b.isi, 'isi', (n) => n >= 24 && n <= 16000);
    const iv = base64(b.iv, 'iv', (n) => n === 16);
    const salt = base64(b.salt, 'salt', (n) => n === 24);
    const iterasi = v.bilanganBulat(b.iterasi, 'iterasi', { min: 100000, maks: 5000000 });
    db.prepare(
      `INSERT INTO catatan_rahasia (pengguna_id, isi, iv, salt, iterasi, diubah_pada) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (pengguna_id) DO UPDATE SET isi = excluded.isi, iv = excluded.iv, salt = excluded.salt,
         iterasi = excluded.iterasi, diubah_pada = excluded.diubah_pada`,
    ).run(req.pengguna.id, isi, iv, salt, iterasi, new Date().toISOString());
    catat(db, { pengguna: req.pengguna, aksi: 'ubah', objek: 'catatan', subjek });
    res.json({ ok: true });
  });

  r.delete('/data-saya/catatan', wajib('catatan:kelola'), (req, res) => {
    const subjek = subjekSaya(req);
    db.prepare('DELETE FROM catatan_rahasia WHERE pengguna_id = ?').run(req.pengguna.id);
    catat(db, { pengguna: req.pengguna, aksi: 'hapus', objek: 'catatan', subjek });
    res.status(204).end();
  });

  // Admin: daftar permintaan hapus. Orang dirujuk dengan nomor saja.
  r.get('/permintaan', wajib('permintaan:proses'), (req, res) => {
    catat(db, { pengguna: req.pengguna, aksi: 'baca', objek: 'permintaan' });
    res.json({ permintaan: daftarPermintaan(db) });
  });

  r.post('/permintaan/:id/proses', wajib('permintaan:proses'), (req, res) => {
    const id = v.idDariJalur(req.params.id);
    const keputusan = v.pilihan(req.body?.keputusan, 'Keputusan', ['setujui', 'tolak']);
    const hasil = prosesPermintaan(db, brankas, id, keputusan);
    catat(db, {
      pengguna: req.pengguna,
      aksi: keputusan === 'setujui' ? 'hapus' : 'ubah',
      objek: keputusan === 'setujui' ? hasil.subjek.jenis : 'permintaan',
      subjek: hasil.subjek,
    });
    res.json({ permintaan: hasil });
  });

  return r;
}
