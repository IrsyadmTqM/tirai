// Dasbor "Data saya" untuk pemilik data, dan pemrosesan permintaan hapus
// oleh admin.

import { Router } from 'express';
import { catat, riwayatSubjek } from '../audit.js';
import { wajib } from '../keamanan/middleware.js';
import { bacaDataPribadi, kirimEkspor, paketEkspor, subjekDariPengguna } from '../layanan/data-pribadi.js';
import { ajukanHapus, daftarPermintaan, permintaanTerakhir, prosesPermintaan } from '../layanan/penghapusan.js';
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
