import { useEffect, useState } from 'react';
import Beranda from './halaman/Beranda.jsx';
import Dasbor from './halaman/Dasbor.jsx';
import Masuk from './halaman/Masuk.jsx';
import { api } from './lib/api.js';
import { Tautan, pindah, useJalur } from './lib/rute.jsx';

export default function App() {
  const jalur = useJalur();
  const [pengguna, setPengguna] = useState(undefined); // undefined: belum tahu

  useEffect(() => {
    api('/saya')
      .then((d) => setPengguna(d.pengguna))
      .catch(() => setPengguna(null));
  }, []);

  async function keluar() {
    await api('/keluar', { metode: 'POST' }).catch(() => {});
    setPengguna(null);
    pindah('/');
  }

  let isi;
  if (jalur === '/masuk') {
    isi = <Masuk onMasuk={setPengguna} />;
  } else if (jalur === '/dasbor') {
    if (pengguna === undefined) isi = <main className="halaman" aria-busy="true" />;
    else if (pengguna === null) isi = <Masuk onMasuk={setPengguna} />;
    else isi = <Dasbor pengguna={pengguna} />;
  } else {
    isi = <Beranda pengguna={pengguna} />;
  }

  return (
    <>
      <a className="lompat" href="#isi">
        Langsung ke isi
      </a>
      <header className="kepala">
        <Tautan ke="/" className="merek">
          Tirai
        </Tautan>
        <nav aria-label="Navigasi utama">
          <a href="/#cara-kerja">Cara kerja</a>
          {pengguna ? (
            <>
              <Tautan ke="/dasbor">Dasbor</Tautan>
              <button type="button" className="tombol tombol-teks" onClick={keluar}>
                Keluar
              </button>
            </>
          ) : (
            <Tautan ke="/masuk">Masuk</Tautan>
          )}
        </nav>
      </header>
      <div id="isi">{isi}</div>
      <footer className="kaki">
        <p>
          Tirai adalah prototipe tugas besar mata kuliah ICT dan Islam. Semua nama, alamat, dan angka di aplikasi ini
          sintetis.
        </p>
      </footer>
    </>
  );
}
