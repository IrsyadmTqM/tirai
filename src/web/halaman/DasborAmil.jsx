// Dasbor amil lapangan: penerima di wilayahnya, pendaftaran penerima baru,
// dan hak mustahik (unduh dan hapus) yang dijalankan atas permintaan mereka.

import { useCallback, useEffect, useState } from 'react';
import { ASNAF, LABEL_ASNAF } from '../../bersama/label.js';
import BukuKas from '../komponen/BukuKas.jsx';
import { useBeriTahu } from '../komponen/Pemberitahuan.jsx';
import { api } from '../lib/api.js';

const KOSONG = { nama: '', alamat: '', kondisi: '', asnaf: 'miskin', nik: '' };

export default function DasborAmil({ pengguna }) {
  const [mustahik, setMustahik] = useState([]);
  const [bukuKas, setBukuKas] = useState(null);
  const [isian, setIsian] = useState(KOSONG);
  const [diajukan, setDiajukan] = useState({});
  const [yakinHapus, setYakinHapus] = useState(null);
  const [galat, setGalat] = useState('');
  const beriTahu = useBeriTahu();

  const muat = useCallback(() => {
    api('/mustahik').then((d) => setMustahik(d.mustahik)).catch((e) => setGalat(e.message));
    api('/buku-kas').then(setBukuKas).catch((e) => setGalat(e.message));
  }, []);

  useEffect(muat, [muat]);

  const ubah = (k) => (e) => setIsian({ ...isian, [k]: e.target.value });

  async function daftarkan(e) {
    e.preventDefault();
    try {
      await api('/mustahik', { metode: 'POST', data: { ...isian, kondisi: isian.kondisi || null } });
      beriTahu(`${isian.nama} terdaftar. NIK tidak disimpan.`);
      setIsian(KOSONG);
      muat();
    } catch (err) {
      beriTahu(err.message, 'galat');
    }
  }

  async function ajukanHapus(m) {
    try {
      await api(`/mustahik/${m.id}/hapus`, { metode: 'POST' });
      setDiajukan({ ...diajukan, [m.id]: true });
      setYakinHapus(null);
      beriTahu(`Permintaan hapus untuk ${m.nama} terkirim ke admin.`);
    } catch (err) {
      beriTahu(err.message, 'galat');
    }
  }

  return (
    <>
      {galat && <p className="pesan-galat">{galat}</p>}
      <section className="lembar">
        <h2>Penerima di {pengguna.wilayah?.nama}</h2>
        <p className="keterangan">
          Unduh dan hapus dipakai bila penerima meminta salinan atau penghapusan datanya. Setiap tindakan tercatat di
          audit log.
        </p>
        <div className="buku-kas-gulir">
          <table className="buku-kas tabel-penerima">
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Asnaf</th>
                <th scope="col">Alamat</th>
                <th scope="col">Kondisi</th>
                <th scope="col">Hak penerima</th>
              </tr>
            </thead>
            <tbody>
              {mustahik.map((m) => (
                <tr key={m.id}>
                  <td>{m.nama}</td>
                  <td>{LABEL_ASNAF[m.asnaf]}</td>
                  <td>{m.alamat}</td>
                  <td>{m.kondisi ?? <span className="keterangan">–</span>}</td>
                  <td className="sel-aksi">
                    <a
                      className="tombol tombol-teks tombol-tautan"
                      href={`/api/mustahik/${m.id}/ekspor?format=json`}
                      onClick={() => beriTahu(`Unduhan data ${m.nama} dimulai. Tercatat di audit log.`)}
                    >
                      Unduh
                    </a>
                    {diajukan[m.id] ? (
                      <span className="keterangan">Hapus diajukan</span>
                    ) : yakinHapus === m.id ? (
                      <>
                        <button type="button" className="tombol tombol-teks teks-bahaya" onClick={() => ajukanHapus(m)}>
                          Ya, ajukan hapus
                        </button>
                        <button type="button" className="tombol tombol-teks" onClick={() => setYakinHapus(null)}>
                          Batal
                        </button>
                      </>
                    ) : (
                      <button type="button" className="tombol tombol-teks" onClick={() => setYakinHapus(m.id)}>
                        Ajukan hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lembar">
        <h2>Daftarkan penerima baru</h2>
        <form className="formulir formulir-kisi" onSubmit={daftarkan}>
          <div>
            <label htmlFor="m-nama">Nama</label>
            <input id="m-nama" value={isian.nama} onChange={ubah('nama')} required maxLength={100} />
          </div>
          <div>
            <label htmlFor="m-asnaf">Asnaf</label>
            <select id="m-asnaf" value={isian.asnaf} onChange={ubah('asnaf')}>
              {ASNAF.map((a) => (
                <option key={a} value={a}>
                  {LABEL_ASNAF[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="lebar-penuh">
            <label htmlFor="m-alamat">Alamat</label>
            <input id="m-alamat" value={isian.alamat} onChange={ubah('alamat')} required maxLength={200} />
          </div>
          <div className="lebar-penuh">
            <label htmlFor="m-kondisi">Kondisi (catatan singkat, opsional)</label>
            <input id="m-kondisi" value={isian.kondisi} onChange={ubah('kondisi')} maxLength={200} />
          </div>
          <div>
            <label htmlFor="m-nik">NIK</label>
            <input
              id="m-nik"
              inputMode="numeric"
              value={isian.nik}
              onChange={ubah('nik')}
              required
              aria-describedby="m-nik-ket"
            />
            <p id="m-nik-ket" className="keterangan">
              NIK tidak disimpan. Server hanya menyimpan penanda untuk mencegah penerima ganda.
            </p>
          </div>
          <div className="lebar-penuh">
            <button type="submit" className="tombol tombol-utama">
              Daftarkan
            </button>
          </div>
        </form>
      </section>

      {bukuKas && (
        <section className="lembar">
          <h2>Buku kas penyaluran</h2>
          <p className="keterangan">Nominal dan data wilayah lain tidak dikirim server untuk peran amil.</p>
          <BukuKas data={bukuKas} />
        </section>
      )}
    </>
  );
}
