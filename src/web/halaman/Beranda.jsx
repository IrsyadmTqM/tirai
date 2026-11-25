import BukuKasPeragaan from '../komponen/BukuKasPeragaan.jsx';
import CaraKerja from '../komponen/CaraKerja.jsx';
import { Tautan } from '../lib/rute.jsx';

export default function Beranda({ pengguna }) {
  return (
    <main>
      <section className="halaman halaman-lebar pembuka">
        <h1>Zakat tercatat rapi, data penerima tetap terjaga</h1>
        <p className="pembuka-teks">
          Tirai membantu pengurus masjid mencatat zakat, infak, sedekah, dan wakaf. Setiap orang hanya melihat data yang
          memang ia perlukan, dan setiap akses tercatat. Coba ganti peran di buku kas di bawah.
        </p>
      </section>

      <div className="halaman halaman-lebar" id="buku-kas">
        <BukuKasPeragaan />
      </div>

      <CaraKerja />

      <section className="halaman halaman-lebar kendali" aria-labelledby="judul-kendali">
        <h2 id="judul-kendali">Pemilik data memegang kendali</h2>
        <p>
          Donatur punya dasbor Data saya: semua datanya beserta alasan pengumpulannya, riwayat siapa saja yang pernah
          mengaksesnya, unduhan JSON dan CSV, permintaan hapus, dan izin yang bisa dicabut. Mustahik yang tidak punya
          akun menjalankan hak yang sama lewat amil, dan permintaannya tetap tercatat.
        </p>
        <Tautan ke={pengguna ? '/dasbor' : '/masuk'} className="tombol tombol-utama tombol-tautan">
          {pengguna ? 'Buka dasbor' : 'Masuk dengan akun demo'}
        </Tautan>
      </section>
    </main>
  );
}
