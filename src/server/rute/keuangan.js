// Buku kas, ringkasan, donasi, dan penyaluran.

import { Router } from 'express';
import { JENIS_DONASI, JENIS_PENYALURAN } from '../../bersama/label.js';
import { catat, catatUntukBanyak } from '../audit.js';
import { daftarDonasi, hitungRingkasan, saldoJenis, tambahDonasi, tambahPenyaluran } from '../data/keuangan.js';
import { adaDonatur, adaMustahik, daftarDonatur } from '../data/orang.js';
import { wajib } from '../keamanan/middleware.js';
import { catatAksesBukuKas, susunBukuKas } from '../layanan/buku-kas.js';
import { adaPersetujuan } from '../layanan/persetujuan.js';
import * as v from '../validasi.js';

const NOMINAL_MAKS = 10_000_000_000;

export function ruteKeuangan({ db, brankas }) {
  const r = Router();

  r.get('/buku-kas', wajib('buku_kas:baca', 'buku_kas:ringkas', 'buku_kas:wilayah'), (req, res) => {
    const { tampilan, terbuka } = susunBukuKas(db, brankas, req.pengguna);
    catatAksesBukuKas(db, req.pengguna, terbuka);
    res.json(tampilan);
  });

  r.get('/ringkasan', wajib('ringkasan:baca'), (req, res) => {
    res.json(hitungRingkasan(db));
  });

  r.get('/donatur', wajib('donatur:baca_nama'), (req, res) => {
    const donatur = daftarDonatur(db);
    catatUntukBanyak(db, {
      pengguna: req.pengguna,
      aksi: 'baca',
      objek: 'donatur',
      subjekJenis: 'donatur',
      subjekIds: donatur.map((d) => d.id),
    });
    res.json({ donatur });
  });

  r.get('/donasi', wajib('donasi:baca'), (req, res) => {
    const semua = daftarDonasi(db);
    catatUntukBanyak(db, {
      pengguna: req.pengguna,
      aksi: 'baca',
      objek: 'donatur',
      subjekJenis: 'donatur',
      subjekIds: [...new Set(semua.filter((d) => d.donatur_id).map((d) => d.donatur_id))],
    });
    const donasi = semua.map((d) => ({
      id: d.id,
      tanggal: d.tanggal,
      jenis: d.jenis,
      nominal: d.nominal,
      donatur: d.nama_donatur,
    }));
    res.json({ donasi });
  });

  r.post('/donasi', wajib('donasi:catat'), (req, res) => {
    const b = req.body ?? {};
    const donaturId = b.donatur_id === null || b.donatur_id === undefined ? null : v.bilanganBulat(b.donatur_id, 'Donatur');
    if (donaturId !== null && !adaDonatur(db, donaturId)) throw new v.GalatPermintaan('Donatur tidak ditemukan');
    if (donaturId !== null && !adaPersetujuan(db, donaturId, 'nama_di_catatan')) {
      throw new v.GalatPermintaan('Donatur ini tidak mengizinkan namanya dicatat. Catat sebagai donasi tanpa nama.', 422);
    }
    const id = tambahDonasi(db, {
      donaturId,
      jenis: v.pilihan(b.jenis, 'Jenis donasi', JENIS_DONASI),
      nominal: v.bilanganBulat(b.nominal, 'Nominal', { min: 1, maks: NOMINAL_MAKS }),
      tanggal: v.tanggal(b.tanggal, 'Tanggal'),
      dicatatOleh: req.pengguna.id,
    });
    catat(db, {
      pengguna: req.pengguna,
      aksi: 'buat',
      objek: 'donasi',
      subjek: donaturId ? { jenis: 'donatur', id: donaturId } : null,
    });
    res.status(201).json({ id });
  });

  r.post('/penyaluran', wajib('penyaluran:catat'), (req, res) => {
    const b = req.body ?? {};
    const mustahikId = v.bilanganBulat(b.mustahik_id, 'Mustahik');
    if (!adaMustahik(db, mustahikId)) throw new v.GalatPermintaan('Mustahik tidak ditemukan');
    const jenisDana = v.pilihan(b.jenis_dana, 'Jenis dana', JENIS_PENYALURAN);
    const nominal = v.bilanganBulat(b.nominal, 'Nominal', { min: 1, maks: NOMINAL_MAKS });
    if (nominal > saldoJenis(db, jenisDana)) {
      throw new v.GalatPermintaan('Saldo jenis dana ini tidak cukup', 422);
    }
    const id = tambahPenyaluran(db, {
      mustahikId,
      jenisDana,
      nominal,
      tanggal: v.tanggal(b.tanggal, 'Tanggal'),
      dicatatOleh: req.pengguna.id,
    });
    catat(db, { pengguna: req.pengguna, aksi: 'buat', objek: 'penyaluran', subjek: { jenis: 'mustahik', id: mustahikId } });
    res.status(201).json({ id });
  });

  return r;
}
