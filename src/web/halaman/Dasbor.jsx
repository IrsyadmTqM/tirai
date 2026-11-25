import { useEffect, useState } from 'react';
import BukuKas from '../komponen/BukuKas.jsx';
import { api } from '../lib/api.js';

export default function Dasbor({ pengguna }) {
  const [bukuKas, setBukuKas] = useState(null);
  const [galat, setGalat] = useState('');
  const bolehBukuKas = ['admin', 'bendahara', 'amil'].includes(pengguna.peran);

  useEffect(() => {
    if (!bolehBukuKas) return;
    api('/buku-kas').then(setBukuKas).catch((e) => setGalat(e.message));
  }, [bolehBukuKas]);

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
      {!bolehBukuKas && <p>Dasbor pemilik data sedang disiapkan.</p>}
    </main>
  );
}
