// Dasbor "Data saya" untuk pemilik data: data tersimpan beserta alasannya,
// riwayat akses, unduhan, dan permintaan hapus.

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { LABEL_AKSI, LABEL_JENIS, LABEL_OBJEK, NAMA_PERAN } from '../../bersama/label.js';
import AngkaBerputar from '../komponen/AngkaBerputar.jsx';
import { useBeriTahu } from '../komponen/Pemberitahuan.jsx';
import { api } from '../lib/api.js';
import { rupiah, tanggal, waktu } from '../lib/format.js';
import { KURVA } from '../lib/gerak.js';

function nilaiField(f) {
  if (f.nilai === null || f.nilai === undefined || f.nilai === '') return <span className="keterangan">tidak diisi</span>;
  if (f.kolom === 'dibuat_pada') return tanggal(f.nilai);
  return f.nilai;
}

function kalimatRiwayat(r) {
  const pelaku = r.peran === 'pemilik' ? 'Anda' : (NAMA_PERAN[r.peran] ?? 'Akun tak dikenal');
  const objek = ['donatur', 'mustahik'].includes(r.objek) ? 'data Anda' : LABEL_OBJEK[r.objek];
  return `${pelaku} ${LABEL_AKSI[r.aksi]} ${objek}`;
}

const STATUS = {
  menunggu: 'Menunggu diproses admin',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak admin',
};

export default function DasborPemilik() {
  const [isi, setIsi] = useState(null);
  const [riwayat, setRiwayat] = useState([]);
  const [galat, setGalat] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(false);
  const beriTahu = useBeriTahu();

  const muatRiwayat = useCallback(() => api('/data-saya/riwayat').then((d) => setRiwayat(d.riwayat)), []);

  useEffect(() => {
    api('/data-saya')
      .then(setIsi)
      .then(muatRiwayat)
      .catch((e) => setGalat(e.message));
  }, [muatRiwayat]);

  function unduh(format) {
    beriTahu(`Unduhan ${format.toUpperCase()} dimulai. Akses ini tercatat di riwayat.`);
    setTimeout(() => muatRiwayat().catch(() => {}), 800);
  }

  async function ajukanHapus() {
    try {
      const d = await api('/data-saya/hapus', { metode: 'POST' });
      setIsi((lama) => ({ ...lama, permintaan_hapus: d.permintaan_hapus }));
      setKonfirmasi(false);
      beriTahu('Permintaan hapus terkirim ke admin.');
      muatRiwayat().catch(() => {});
    } catch (e) {
      beriTahu(e.message, 'galat');
    }
  }

  if (galat) return <p className="pesan-galat">{galat}</p>;
  if (!isi) return <p aria-busy="true">Memuat…</p>;

  const total = isi.transaksi.baris.reduce((t, b) => t + b.nominal, 0);
  const permintaan = isi.permintaan_hapus;

  return (
    <div className="dasbor-kisi">
      <div className="dasbor-utama">
        <section className="lembar" aria-labelledby="judul-data">
          <h2 id="judul-data">Data tersimpan</h2>
          <p className="keterangan">Semua yang disimpan Tirai tentang Anda, dan alasan tiap data dikumpulkan.</p>
          <table className="tabel-data">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Isi</th>
                <th scope="col">Mengapa disimpan</th>
              </tr>
            </thead>
            <tbody>
              {isi.data.map((f) => (
                <tr key={f.kolom}>
                  <th scope="row">{f.label}</th>
                  <td>{nilaiField(f)}</td>
                  <td className="keterangan">
                    {f.alasan}
                    {f.perlindungan !== '-' && <span className="perlindungan">Perlindungan: {f.perlindungan}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="lembar" aria-labelledby="judul-donasi">
          <h2 id="judul-donasi">Donasi saya</h2>
          <table className="buku-kas tabel-ringkas">
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col">Jenis</th>
                <th scope="col" className="kolom-nominal">
                  Nominal (Rp)
                </th>
              </tr>
            </thead>
            <tbody>
              {isi.transaksi.baris.map((b, i) => (
                <tr key={`${b.tanggal}-${i}`}>
                  <td>{tanggal(b.tanggal)}</td>
                  <td>{LABEL_JENIS[b.jenis]}</td>
                  <td className="kolom-nominal">{rupiah(b.nominal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>
                  Jumlah
                </th>
                <td className="kolom-nominal">
                  <AngkaBerputar nilai={total} />
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="lembar lembar-peringatan" aria-labelledby="judul-hapus">
          <h2 id="judul-hapus">Hapus data saya</h2>
          <p>
            Yang dihapus: nama, kontak, akun, dan kunci enkripsi milik Anda. Yang tetap ada tanpa nama: catatan donasi,
            karena dibutuhkan untuk pembukuan zakat. Admin memproses permintaan ini tanpa melihat nama Anda.
          </p>
          {permintaan && permintaan.status === 'menunggu' ? (
            <p className="status-permintaan">
              <strong>{STATUS.menunggu}</strong> sejak {waktu(permintaan.diajukan_pada)}.
            </p>
          ) : (
            <>
              {permintaan && (
                <p className="status-permintaan">
                  Permintaan terakhir: <strong>{STATUS[permintaan.status]}</strong>
                  {permintaan.diproses_pada && <> pada {waktu(permintaan.diproses_pada)}</>}.
                </p>
              )}
              <AnimatePresence mode="wait" initial={false}>
                {konfirmasi ? (
                  <motion.div
                    key="yakin"
                    className="konfirmasi"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: KURVA }}
                  >
                    <p>Setelah admin menyetujui, Anda akan keluar dan akun ini tidak bisa dipakai lagi.</p>
                    <button type="button" className="tombol tombol-bahaya" onClick={ajukanHapus}>
                      Ya, ajukan penghapusan
                    </button>
                    <button type="button" className="tombol tombol-teks" onClick={() => setKonfirmasi(false)}>
                      Batal
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="awal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button type="button" className="tombol tombol-garis" onClick={() => setKonfirmasi(true)}>
                      Ajukan penghapusan
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </section>
      </div>

      <aside className="dasbor-samping">
        <section className="lembar" aria-labelledby="judul-unduh">
          <h2 id="judul-unduh">Unduh data saya</h2>
          <p className="keterangan">Salinan lengkap: data, donasi, dan riwayat akses.</p>
          <div className="baris-tombol">
            <a className="tombol tombol-garis tombol-tautan" href="/api/data-saya/ekspor?format=json" onClick={() => unduh('json')}>
              JSON
            </a>
            <a className="tombol tombol-garis tombol-tautan" href="/api/data-saya/ekspor?format=csv" onClick={() => unduh('csv')}>
              CSV
            </a>
          </div>
        </section>

        <section className="lembar" aria-labelledby="judul-riwayat">
          <h2 id="judul-riwayat">Riwayat akses</h2>
          <p className="keterangan">Siapa yang membuka data Anda, ditampilkan sebagai peran.</p>
          <ol className="log-meluncur">
            <AnimatePresence initial={false}>
              {riwayat.slice(0, 15).map((r) => (
                <motion.li
                  key={r.id}
                  layout="position"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.28, ease: KURVA } }}
                >
                  <span className="audit-waktu">{waktu(r.waktu)}</span>
                  <span>
                    {kalimatRiwayat(r)}
                    {r.saluran === 'peragaan' && <span className="label-peragaan">peragaan</span>}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
          {riwayat.length > 15 && <p className="keterangan">Ditampilkan 15 dari {riwayat.length} catatan.</p>}
        </section>
      </aside>
    </div>
  );
}
