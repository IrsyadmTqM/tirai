import DasborAdmin from './DasborAdmin.jsx';
import DasborAmil from './DasborAmil.jsx';
import DasborBendahara from './DasborBendahara.jsx';
import DasborPemilik from './DasborPemilik.jsx';

const JUDUL = {
  admin: 'Dasbor admin',
  bendahara: 'Dasbor bendahara',
  amil: 'Dasbor amil lapangan',
  pemilik: 'Data saya',
};

export default function Dasbor({ pengguna }) {
  return (
    <main className="halaman halaman-lebar">
      <h1>{JUDUL[pengguna.peran]}</h1>
      <p className="keterangan">
        Masuk sebagai <strong>{pengguna.nama_pengguna}</strong>
        {pengguna.wilayah && <>, wilayah {pengguna.wilayah.nama}</>}. Semua data sintetis.
      </p>
      {pengguna.peran === 'admin' && <DasborAdmin pengguna={pengguna} />}
      {pengguna.peran === 'bendahara' && <DasborBendahara />}
      {pengguna.peran === 'amil' && <DasborAmil pengguna={pengguna} />}
      {pengguna.peran === 'pemilik' && <DasborPemilik />}
    </main>
  );
}
