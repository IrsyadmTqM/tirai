// Data pribadi satu orang (donatur atau mustahik), lengkap dengan alasan
// pengumpulan tiap field dari inventaris data. Dipakai untuk dasbor
// "Data saya", ekspor oleh pemilik data, dan ekspor oleh amil atas
// permintaan mustahik.

import { INVENTARIS } from '../db/inventaris.js';
import { riwayatSubjek } from '../audit.js';
import { bacaPersetujuan } from './persetujuan.js';

const LABEL = {
  nama: 'Nama',
  kontak: 'Kontak',
  alamat: 'Alamat',
  kondisi: 'Kondisi',
  asnaf: 'Asnaf',
  wilayah_id: 'Wilayah',
  nik_hmac: 'NIK',
  dibuat_pada: 'Dicatat sejak',
  nama_pengguna: 'Nama pengguna',
};

const field = (tabel, kolom, nilai) => ({
  kolom,
  label: LABEL[kolom],
  nilai,
  alasan: INVENTARIS[tabel][kolom].alasan,
  perlindungan: INVENTARIS[tabel][kolom].perlindungan,
});

export function subjekDariPengguna(pengguna) {
  if (pengguna?.donatur_id) return { jenis: 'donatur', id: pengguna.donatur_id };
  if (pengguna?.mustahik_id) return { jenis: 'mustahik', id: pengguna.mustahik_id };
  return null;
}

function akunMilik(db, subjek) {
  const kolom = subjek.jenis === 'donatur' ? 'donatur_id' : 'mustahik_id';
  return db.prepare(`SELECT nama_pengguna FROM pengguna WHERE ${kolom} = ?`).get(subjek.id);
}

// Mengembalikan null bila orangnya tidak ada atau datanya sudah dihapus.
export function bacaDataPribadi(db, brankas, subjek) {
  const akun = akunMilik(db, subjek);
  const dataAkun = akun ? [field('pengguna', 'nama_pengguna', akun.nama_pengguna)] : [];

  if (subjek.jenis === 'donatur') {
    const d = db.prepare('SELECT nama, kontak, kunci_id, dibuat_pada FROM donatur WHERE id = ?').get(subjek.id);
    if (!d) return null;
    const donasi = db
      .prepare('SELECT tanggal, jenis, nominal FROM donasi WHERE donatur_id = ? ORDER BY tanggal DESC, id DESC')
      .all(subjek.id)
      .map((b) => ({ ...b }));
    return {
      subjek,
      data: [
        field('donatur', 'nama', d.nama),
        field('donatur', 'kontak', brankas.dekripsi(d.kunci_id, d.kontak, 'donatur.kontak')),
        field('donatur', 'dibuat_pada', d.dibuat_pada),
        ...dataAkun,
      ],
      transaksi: { jenis: 'donasi', baris: donasi },
    };
  }

  const m = db
    .prepare(
      `SELECT m.nama, m.alamat, m.kondisi, m.asnaf, m.kunci_id, m.nik_hmac, m.dibuat_pada, w.nama AS wilayah
       FROM mustahik m JOIN wilayah w ON w.id = m.wilayah_id
       WHERE m.id = ? AND m.dianonimkan_pada IS NULL`,
    )
    .get(subjek.id);
  if (!m) return null;
  const buka = (kolom) => brankas.dekripsi(m.kunci_id, m[kolom], `mustahik.${kolom}`);
  const penyaluran = db
    .prepare('SELECT tanggal, jenis_dana AS jenis, nominal FROM penyaluran WHERE mustahik_id = ? ORDER BY tanggal DESC, id DESC')
    .all(subjek.id)
    .map((b) => ({ ...b }));
  return {
    subjek,
    data: [
      field('mustahik', 'nama', buka('nama')),
      field('mustahik', 'alamat', buka('alamat')),
      field('mustahik', 'kondisi', buka('kondisi')),
      field('mustahik', 'asnaf', m.asnaf),
      field('mustahik', 'wilayah_id', m.wilayah),
      // NIK memang tidak disimpan; yang ada hanya penanda.
      field('mustahik', 'nik_hmac', m.nik_hmac ? 'Tidak disimpan. Yang tersimpan hanya penanda HMAC.' : null),
      field('mustahik', 'dibuat_pada', m.dibuat_pada),
      ...dataAkun,
    ],
    transaksi: { jenis: 'penyaluran', baris: penyaluran },
  };
}

// Paket ekspor: data, transaksi, dan riwayat akses.
export function paketEkspor(db, brankas, subjek) {
  const isi = bacaDataPribadi(db, brankas, subjek);
  if (!isi) return null;
  return {
    keterangan: 'Ekspor data pribadi dari Tirai. Prototipe dengan data sintetis.',
    dibuat_pada: new Date().toISOString(),
    ...isi,
    persetujuan:
      subjek.jenis === 'donatur'
        ? bacaPersetujuan(db, subjek.id).map(({ tujuan, judul, diberikan, diubah_pada }) => ({
            tujuan,
            judul,
            diberikan,
            diubah_pada,
          }))
        : [],
    riwayat_akses: riwayatSubjek(db, subjek.jenis, subjek.id).map(({ waktu, peran, aksi, objek, saluran }) => ({
      waktu,
      peran,
      aksi,
      objek,
      saluran,
    })),
  };
}

// Nilai CSV. Nilai yang diawali = + - @ diberi tanda kutip tunggal supaya
// tidak dijalankan sebagai rumus oleh aplikasi lembar kerja.
function selCsv(nilai) {
  if (nilai === null || nilai === undefined) return '';
  let teks = String(nilai);
  if (/^[=+\-@\t\r]/.test(teks)) teks = `'${teks}`;
  return /[",\n\r]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

export function keCsv(paket) {
  const baris = [['bagian', 'kolom', 'nilai', 'alasan']];
  for (const f of paket.data) baris.push(['data', f.label, f.nilai, f.alasan]);
  paket.transaksi.baris.forEach((t, i) => {
    for (const [k, v] of Object.entries(t)) baris.push([`${paket.transaksi.jenis} ${i + 1}`, k, v, '']);
  });
  for (const p of paket.persetujuan ?? []) baris.push(['persetujuan', p.judul, p.diberikan ? 'diberikan' : 'dicabut', '']);
  paket.riwayat_akses.forEach((r, i) => {
    baris.push([`riwayat ${i + 1}`, 'waktu', r.waktu, '']);
    baris.push([`riwayat ${i + 1}`, 'akses', `${r.peran ?? '-'} ${r.aksi} ${r.objek} (${r.saluran})`, '']);
  });
  return `${baris.map((b) => b.map(selCsv).join(',')).join('\r\n')}\r\n`;
}

export function kirimEkspor(res, paket, format, namaBerkas) {
  if (format === 'csv') {
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${namaBerkas}.csv"`);
    return res.send(`﻿${keCsv(paket)}`);
  }
  res.set('Content-Disposition', `attachment; filename="${namaBerkas}.json"`);
  return res.type('application/json').send(JSON.stringify(paket, null, 2));
}
