// Dasbor bendahara: ringkasan dana, pencatatan donasi dan penyaluran,
// buku kas, dan catatan donasi terbaru.

import { useCallback, useEffect, useState } from 'react';
import { JENIS_DONASI, JENIS_PENYALURAN, LABEL_ASNAF, LABEL_JENIS } from '../../bersama/label.js';
import BukuKas from '../komponen/BukuKas.jsx';
import { useBeriTahu } from '../komponen/Pemberitahuan.jsx';
import RingkasanDana from '../komponen/RingkasanDana.jsx';
import { api } from '../lib/api.js';
import { rupiah, tanggal } from '../lib/format.js';

const hariIni = () => new Date().toISOString().slice(0, 10);
const angka = (teks) => Number(String(teks).replace(/\D/g, ''));

function FormDonasi({ donatur, onSelesai }) {
  const [isian, setIsian] = useState({ donatur_id: '', jenis: 'infak', nominal: '', tanggal: hariIni() });
  const [proses, setProses] = useState(false);
  const beriTahu = useBeriTahu();
  const ubah = (k) => (e) => setIsian({ ...isian, [k]: e.target.value });

  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    try {
      await api('/donasi', {
        metode: 'POST',
        data: {
          donatur_id: isian.donatur_id ? Number(isian.donatur_id) : null,
          jenis: isian.jenis,
          nominal: angka(isian.nominal),
          tanggal: isian.tanggal,
        },
      });
      beriTahu(`Donasi Rp ${rupiah(angka(isian.nominal))} tercatat.`);
      setIsian({ ...isian, nominal: '' });
      onSelesai();
    } catch (err) {
      beriTahu(err.message, 'galat');
    } finally {
      setProses(false);
    }
  }

  return (
    <form className="formulir" onSubmit={kirim}>
      <label htmlFor="d-donatur">Donatur</label>
      <select id="d-donatur" value={isian.donatur_id} onChange={ubah('donatur_id')}>
        <option value="">Tanpa nama (hamba Allah)</option>
        {donatur.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nama}
          </option>
        ))}
      </select>
      <label htmlFor="d-jenis">Jenis</label>
      <select id="d-jenis" value={isian.jenis} onChange={ubah('jenis')}>
        {JENIS_DONASI.map((j) => (
          <option key={j} value={j}>
            {LABEL_JENIS[j]}
          </option>
        ))}
      </select>
      <label htmlFor="d-nominal">Nominal (Rp)</label>
      <input id="d-nominal" inputMode="numeric" value={isian.nominal} onChange={ubah('nominal')} required />
      <label htmlFor="d-tanggal">Tanggal</label>
      <input id="d-tanggal" type="date" max={hariIni()} value={isian.tanggal} onChange={ubah('tanggal')} required />
      <button type="submit" className="tombol tombol-utama" disabled={proses}>
        Catat donasi
      </button>
    </form>
  );
}

function FormPenyaluran({ mustahik, onSelesai }) {
  const [isian, setIsian] = useState({ mustahik_id: '', jenis_dana: 'zakat_mal', nominal: '', tanggal: hariIni() });
  const [proses, setProses] = useState(false);
  const beriTahu = useBeriTahu();
  const ubah = (k) => (e) => setIsian({ ...isian, [k]: e.target.value });

  async function kirim(e) {
    e.preventDefault();
    setProses(true);
    try {
      await api('/penyaluran', {
        metode: 'POST',
        data: {
          mustahik_id: Number(isian.mustahik_id),
          jenis_dana: isian.jenis_dana,
          nominal: angka(isian.nominal),
          tanggal: isian.tanggal,
        },
      });
      beriTahu(`Penyaluran Rp ${rupiah(angka(isian.nominal))} tercatat.`);
      setIsian({ ...isian, nominal: '' });
      onSelesai();
    } catch (err) {
      beriTahu(err.message, 'galat');
    } finally {
      setProses(false);
    }
  }

  return (
    <form className="formulir" onSubmit={kirim}>
      <label htmlFor="p-mustahik">Penerima</label>
      <select id="p-mustahik" value={isian.mustahik_id} onChange={ubah('mustahik_id')} required>
        <option value="" disabled>
          Pilih penerima
        </option>
        {mustahik.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nama} ({LABEL_ASNAF[m.asnaf]}, {m.wilayah})
          </option>
        ))}
      </select>
      <label htmlFor="p-jenis">Sumber dana</label>
      <select id="p-jenis" value={isian.jenis_dana} onChange={ubah('jenis_dana')}>
        {JENIS_PENYALURAN.map((j) => (
          <option key={j} value={j}>
            {LABEL_JENIS[j]}
          </option>
        ))}
      </select>
      <label htmlFor="p-nominal">Nominal (Rp)</label>
      <input id="p-nominal" inputMode="numeric" value={isian.nominal} onChange={ubah('nominal')} required />
      <label htmlFor="p-tanggal">Tanggal</label>
      <input id="p-tanggal" type="date" max={hariIni()} value={isian.tanggal} onChange={ubah('tanggal')} required />
      <button type="submit" className="tombol tombol-utama" disabled={proses}>
        Catat penyaluran
      </button>
    </form>
  );
}

export default function DasborBendahara() {
  const [ringkasan, setRingkasan] = useState(null);
  const [bukuKas, setBukuKas] = useState(null);
  const [donasi, setDonasi] = useState([]);
  const [donatur, setDonatur] = useState([]);
  const [mustahik, setMustahik] = useState([]);
  const [galat, setGalat] = useState('');

  const muatUlang = useCallback(() => {
    Promise.all([api('/ringkasan'), api('/buku-kas'), api('/donasi')])
      .then(([r, b, d]) => {
        setRingkasan(r);
        setBukuKas(b);
        setDonasi(d.donasi);
      })
      .catch((e) => setGalat(e.message));
  }, []);

  useEffect(() => {
    muatUlang();
    api('/donatur').then((d) => setDonatur(d.donatur)).catch((e) => setGalat(e.message));
    api('/mustahik').then((d) => setMustahik(d.mustahik)).catch((e) => setGalat(e.message));
  }, [muatUlang]);

  return (
    <>
      {galat && <p className="pesan-galat">{galat}</p>}
      <section className="lembar">
        <h2>Ringkasan dana</h2>
        <RingkasanDana ringkasan={ringkasan ?? undefined} />
      </section>
      <div className="dua-kolom">
        <section className="lembar">
          <h2>Catat donasi</h2>
          <FormDonasi donatur={donatur} onSelesai={muatUlang} />
        </section>
        <section className="lembar">
          <h2>Catat penyaluran</h2>
          <FormPenyaluran mustahik={mustahik} onSelesai={muatUlang} />
        </section>
      </div>
      {bukuKas && (
        <section className="lembar">
          <h2>Buku kas penyaluran</h2>
          <p className="keterangan">Alamat dan kondisi penerima tidak dikirim server untuk peran bendahara.</p>
          <BukuKas data={bukuKas} />
        </section>
      )}
      <section className="lembar">
        <h2>Donasi terbaru</h2>
        <table className="buku-kas tabel-ringkas">
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Donatur</th>
              <th scope="col">Jenis</th>
              <th scope="col" className="kolom-nominal">
                Nominal (Rp)
              </th>
            </tr>
          </thead>
          <tbody>
            {donasi.slice(0, 10).map((d) => (
              <tr key={d.id}>
                <td>{tanggal(d.tanggal)}</td>
                <td>{d.donatur ?? <span className="keterangan">Tanpa nama</span>}</td>
                <td>{LABEL_JENIS[d.jenis]}</td>
                <td className="kolom-nominal">{rupiah(d.nominal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
