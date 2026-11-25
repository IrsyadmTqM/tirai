import { useEffect, useState } from 'react';
import BukuKas from '../komponen/BukuKas.jsx';
import DaftarAudit from '../komponen/DaftarAudit.jsx';
import { api } from '../lib/api.js';

export default function Dasbor({ pengguna }) {
  const [bukuKas, setBukuKas] = useState(null);
  const [audit, setAudit] = useState(null);
  const [galat, setGalat] = useState('');
  const bolehBukuKas = ['admin', 'bendahara', 'amil'].includes(pengguna.peran);
  const admin = pengguna.peran === 'admin';

  useEffect(() => {
    if (bolehBukuKas) api('/buku-kas').then(setBukuKas).catch((e) => setGalat(e.message));
    if (admin) api('/audit?batas=50').then((d) => setAudit(d.log)).catch((e) => setGalat(e.message));
  }, [bolehBukuKas, admin]);

  return (
    <main className="halaman">
      <h1>Dasbor {pengguna.nama_peran.toLowerCase()}</h1>
      <p>
        Masuk sebagai <strong>{pengguna.nama_pengguna}</strong>
        {pengguna.wilayah && <>, wilayah {pengguna.wilayah.nama}</>}.
      </p>
      {galat && <p className="pesan-galat">{galat}</p>}
      {bukuKas && (
        <section className="lembar">
          <h2>Buku kas penyaluran</h2>
          <BukuKas data={bukuKas} />
        </section>
      )}
      {audit && (
        <section className="lembar">
          <h2>Audit log</h2>
          <p className="keterangan">50 catatan terbaru. Catatan tidak bisa diubah atau dihapus.</p>
          <DaftarAudit log={audit} tampilkanPelaku />
        </section>
      )}
      {!bolehBukuKas && <p>Dasbor pemilik data sedang disiapkan.</p>}
    </main>
  );
}
