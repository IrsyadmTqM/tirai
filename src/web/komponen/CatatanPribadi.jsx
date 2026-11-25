// Catatan pribadi yang dikunci di browser (E2EE terbatas). Kata sandi
// catatan tidak pernah dikirim ke server; yang dikirim hanya ciphertext.

import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { bukaCatatan, kunciCatatan, tersedia } from '../lib/catatan-e2ee.js';
import { waktu } from '../lib/format.js';
import { useBeriTahu } from './Pemberitahuan.jsx';
import TeksTeracak from './TeksTeracak.jsx';

const ringkas = (teks) => (teks.length > 56 ? `${teks.slice(0, 56)}…` : teks);

export default function CatatanPribadi({ onBerubah }) {
  const [catatan, setCatatan] = useState(undefined);
  const [terbuka, setTerbuka] = useState(null);
  const [teks, setTeks] = useState('');
  const [sandi, setSandi] = useState('');
  const [ulang, setUlang] = useState('');
  const [proses, setProses] = useState(false);
  const [terkirim, setTerkirim] = useState(null);
  const [yakinHapus, setYakinHapus] = useState(false);
  const beriTahu = useBeriTahu();

  useEffect(() => {
    api('/data-saya/catatan')
      .then((d) => setCatatan(d.catatan))
      .catch(() => setCatatan(null));
  }, []);

  if (!tersedia()) {
    return <p className="pesan-galat">Fitur ini butuh HTTPS atau localhost, karena memakai Web Crypto API browser.</p>;
  }
  if (catatan === undefined) return <p aria-busy="true">Memuat…</p>;

  async function simpan(e) {
    e.preventDefault();
    if (sandi.length < 8) return beriTahu('Kata sandi catatan minimal 8 karakter.', 'galat');
    if (!catatan && sandi !== ulang) return beriTahu('Kedua kata sandi catatan tidak sama.', 'galat');
    setProses(true);
    try {
      const paket = await kunciCatatan(teks, sandi);
      await api('/data-saya/catatan', { metode: 'PUT', data: paket });
      setCatatan({ ...paket, diubah_pada: new Date().toISOString() });
      setTerkirim({ asli: ringkas(teks), sandi: ringkas(paket.isi) });
      setTerbuka(null);
      setTeks('');
      setSandi('');
      setUlang('');
      beriTahu('Catatan dikunci di browser lalu disimpan. Server hanya menerima ciphertext.');
      onBerubah?.();
    } catch (err) {
      beriTahu(err.message, 'galat');
    } finally {
      setProses(false);
    }
  }

  async function buka(e) {
    e.preventDefault();
    setProses(true);
    try {
      const isi = await bukaCatatan(catatan, sandi);
      setTerbuka(isi);
      setTeks(isi);
      setTerkirim(null);
      onBerubah?.();
    } catch {
      beriTahu('Kata sandi catatan salah.', 'galat');
    } finally {
      setProses(false);
    }
  }

  async function hapus() {
    if (!yakinHapus) {
      setYakinHapus(true);
      return;
    }
    setYakinHapus(false);
    await api('/data-saya/catatan', { metode: 'DELETE' });
    setCatatan(null);
    setTerbuka(null);
    setTeks('');
    setSandi('');
    setTerkirim(null);
    beriTahu('Catatan dihapus.');
    onBerubah?.();
  }

  const formTulis = (
    <form className="formulir" onSubmit={simpan}>
      <label htmlFor="catatan-isi">Isi catatan</label>
      <textarea id="catatan-isi" rows={5} value={teks} onChange={(e) => setTeks(e.target.value)} required maxLength={8000} />
      {!catatan && (
        <>
          <label htmlFor="catatan-sandi">Kata sandi catatan (minimal 8 karakter)</label>
          <input
            id="catatan-sandi"
            type="password"
            autoComplete="new-password"
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            required
          />
          <label htmlFor="catatan-ulang">Ulangi kata sandi catatan</label>
          <input
            id="catatan-ulang"
            type="password"
            autoComplete="new-password"
            value={ulang}
            onChange={(e) => setUlang(e.target.value)}
            required
          />
        </>
      )}
      <div className="baris-tombol">
        <button type="submit" className="tombol tombol-utama" disabled={proses}>
          {proses ? 'Mengunci…' : 'Kunci dan simpan'}
        </button>
        {terbuka !== null && (
          <>
            <button
              type="button"
              className="tombol tombol-teks"
              onClick={() => {
                setTerbuka(null);
                setTeks('');
              }}
            >
              Tutup tanpa menyimpan
            </button>
            <button type="button" className="tombol tombol-teks teks-bahaya" onClick={hapus}>
              {yakinHapus ? 'Yakin? Klik lagi untuk menghapus' : 'Hapus catatan'}
            </button>
          </>
        )}
      </div>
    </form>
  );

  return (
    <div className="catatan-pribadi">
      <p>
        Catatan ini dikunci di browser Anda dengan kata sandi catatan, sebelum dikirim. Server, admin, dan pengurus
        masjid hanya menerima deretan acak. Bila kata sandi catatan lupa, isinya tidak bisa dipulihkan siapa pun.
      </p>

      {terkirim && (
        <div className="kartu-sandi bukti-kirim">
          <p className="keterangan">Yang Anda tulis</p>
          <p className="teks-asli">{terkirim.asli}</p>
          <p className="keterangan">Yang diterima server</p>
          <TeksTeracak dari={terkirim.asli} ke={terkirim.sandi} jalan />
        </div>
      )}

      {!catatan && formTulis}

      {catatan && terbuka === null && (
        <form className="formulir" onSubmit={buka}>
          <p className="status-permintaan">
            Catatan terkunci, terakhir disimpan {waktu(catatan.diubah_pada)}.
          </p>
          <label htmlFor="catatan-buka">Kata sandi catatan</label>
          <input
            id="catatan-buka"
            type="password"
            autoComplete="current-password"
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            required
          />
          <div className="baris-tombol">
            <button type="submit" className="tombol tombol-garis" disabled={proses}>
              {proses ? 'Membuka…' : 'Buka catatan'}
            </button>
            <button type="button" className="tombol tombol-teks teks-bahaya" onClick={hapus}>
              {yakinHapus ? 'Yakin? Klik lagi untuk menghapus' : 'Hapus catatan'}
            </button>
          </div>
        </form>
      )}

      {catatan && terbuka !== null && formTulis}

      <p className="keterangan">
        Batas: kode yang mengunci catatan dikirim oleh server yang sama, jadi Anda tetap memercayai server tidak
        mengubah kode itu. Server juga tahu kapan catatan disimpan dan kira-kira berapa panjangnya.
      </p>
    </div>
  );
}
