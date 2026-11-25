import { useState } from 'react';
import { api } from '../lib/api.js';
import { pindah } from '../lib/rute.jsx';

const AKUN_DEMO = [
  ['admin', 'Admin'],
  ['bendahara', 'Bendahara'],
  ['amil-rw01', 'Amil lapangan RW 01'],
  ['donatur-01', 'Pemilik data (donatur)'],
];

export default function Masuk({ onMasuk }) {
  const [nama, setNama] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState('');
  const [proses, setProses] = useState(false);

  async function kirim(e) {
    e.preventDefault();
    setGalat('');
    setProses(true);
    try {
      const { pengguna } = await api('/masuk', { metode: 'POST', data: { nama_pengguna: nama, kata_sandi: sandi } });
      onMasuk(pengguna);
      pindah('/dasbor');
    } catch (err) {
      setGalat(err.message);
    } finally {
      setProses(false);
    }
  }

  return (
    <main className="halaman halaman-sempit">
      <h1>Masuk</h1>
      <form className="formulir" onSubmit={kirim} noValidate>
        <label htmlFor="nama">Nama pengguna</label>
        <input
          id="nama"
          autoComplete="username"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />
        <label htmlFor="sandi">Kata sandi</label>
        <input
          id="sandi"
          type="password"
          autoComplete="current-password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          required
        />
        {galat && (
          <p className="pesan-galat" role="alert">
            {galat}
          </p>
        )}
        <button type="submit" className="tombol tombol-utama" disabled={proses}>
          {proses ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>

      <section className="akun-demo" aria-labelledby="judul-demo">
        <h2 id="judul-demo">Akun demo</h2>
        <p className="keterangan">
          Semua akun memakai kata sandi <code>tirai-demo</code>. Isinya data sintetis.
        </p>
        <ul>
          {AKUN_DEMO.map(([akun, label]) => (
            <li key={akun}>
              <button
                type="button"
                className="tombol tombol-teks"
                onClick={() => {
                  setNama(akun);
                  setSandi('tirai-demo');
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
