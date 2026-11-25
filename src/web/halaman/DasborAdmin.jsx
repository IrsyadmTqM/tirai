// Dasbor admin: ringkasan, permintaan hapus, akun dan peran, audit log.

import { useCallback, useEffect, useState } from 'react';
import { NAMA_PERAN } from '../../bersama/label.js';
import BukuKas from '../komponen/BukuKas.jsx';
import DaftarAudit from '../komponen/DaftarAudit.jsx';
import { useBeriTahu } from '../komponen/Pemberitahuan.jsx';
import RingkasanDana from '../komponen/RingkasanDana.jsx';
import { api } from '../lib/api.js';
import { waktu } from '../lib/format.js';

const STATUS = { menunggu: 'Menunggu', disetujui: 'Disetujui', ditolak: 'Ditolak' };

function BarisAkun({ akun, wilayah, sendiri, onSimpan }) {
  const [peran, setPeran] = useState(akun.peran);
  const [wilayahId, setWilayahId] = useState(akun.wilayah_id ?? wilayah[0]?.id ?? '');
  const staf = ['admin', 'bendahara', 'amil'].includes(akun.peran);
  const berubah = peran !== akun.peran || (peran === 'amil' && Number(wilayahId) !== akun.wilayah_id);

  if (!staf || sendiri) {
    return (
      <tr>
        <td>{akun.nama_pengguna}</td>
        <td>{NAMA_PERAN[akun.peran]}</td>
        <td>{akun.wilayah ?? '–'}</td>
        <td className="keterangan">{sendiri ? 'Akun Anda' : 'Akun pemilik data'}</td>
      </tr>
    );
  }
  return (
    <tr>
      <td>{akun.nama_pengguna}</td>
      <td>
        <label className="tersamar" htmlFor={`peran-${akun.id}`}>
          Peran {akun.nama_pengguna}
        </label>
        <select id={`peran-${akun.id}`} value={peran} onChange={(e) => setPeran(e.target.value)}>
          {['admin', 'bendahara', 'amil'].map((p) => (
            <option key={p} value={p}>
              {NAMA_PERAN[p]}
            </option>
          ))}
        </select>
      </td>
      <td>
        {peran === 'amil' ? (
          <>
            <label className="tersamar" htmlFor={`wilayah-${akun.id}`}>
              Wilayah {akun.nama_pengguna}
            </label>
            <select id={`wilayah-${akun.id}`} value={wilayahId} onChange={(e) => setWilayahId(e.target.value)}>
              {wilayah.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nama}
                </option>
              ))}
            </select>
          </>
        ) : (
          '–'
        )}
      </td>
      <td>
        <button
          type="button"
          className="tombol tombol-garis"
          disabled={!berubah}
          onClick={() => onSimpan(akun, { peran, wilayah_id: peran === 'amil' ? Number(wilayahId) : undefined })}
        >
          Simpan
        </button>
      </td>
    </tr>
  );
}

export default function DasborAdmin({ pengguna }) {
  const [ringkasan, setRingkasan] = useState(null);
  const [bukuKas, setBukuKas] = useState(null);
  const [permintaan, setPermintaan] = useState([]);
  const [akun, setAkun] = useState([]);
  const [wilayah, setWilayah] = useState([]);
  const [audit, setAudit] = useState([]);
  const [yakin, setYakin] = useState(null);
  const [galat, setGalat] = useState('');
  const beriTahu = useBeriTahu();

  const muatAudit = useCallback(() => api('/audit?batas=40').then((d) => setAudit(d.log)), []);
  const muatPermintaan = useCallback(() => api('/permintaan').then((d) => setPermintaan(d.permintaan)), []);
  const muatAkun = useCallback(() => api('/pengguna').then((d) => setAkun(d.pengguna)), []);

  useEffect(() => {
    Promise.all([
      api('/ringkasan').then(setRingkasan),
      api('/buku-kas').then(setBukuKas),
      api('/wilayah').then((d) => setWilayah(d.wilayah)),
      muatPermintaan(),
      muatAkun(),
    ])
      .then(muatAudit)
      .catch((e) => setGalat(e.message));
  }, [muatAudit, muatPermintaan, muatAkun]);

  async function proses(p, keputusan) {
    try {
      await api(`/permintaan/${p.id}/proses`, { metode: 'POST', data: { keputusan } });
      setYakin(null);
      beriTahu(
        keputusan === 'setujui'
          ? `Data ${p.subjek.jenis} #${p.subjek.id} dihapus. Catatan keuangan tetap ada tanpa identitas.`
          : `Permintaan #${p.id} ditolak.`,
      );
      await Promise.all([muatPermintaan(), muatAkun(), muatAudit()]);
      api('/buku-kas').then(setBukuKas);
    } catch (err) {
      beriTahu(err.message, 'galat');
    }
  }

  async function simpanPeran(a, data) {
    try {
      await api(`/pengguna/${a.id}`, { metode: 'PATCH', data });
      beriTahu(`Peran ${a.nama_pengguna} diubah menjadi ${NAMA_PERAN[data.peran].toLowerCase()}.`);
      await Promise.all([muatAkun(), muatAudit()]);
    } catch (err) {
      beriTahu(err.message, 'galat');
    }
  }

  const menunggu = permintaan.filter((p) => p.status === 'menunggu');

  return (
    <>
      {galat && <p className="pesan-galat">{galat}</p>}
      <section className="lembar">
        <h2>Ringkasan dana</h2>
        <RingkasanDana ringkasan={ringkasan ?? undefined} />
      </section>

      <section className="lembar">
        <h2>Permintaan hapus data</h2>
        <p className="keterangan">
          Orang ditampilkan sebagai nomor. Menyetujui berarti identitas dan kunci enkripsinya dihapus, sementara catatan
          keuangan tetap ada tanpa identitas.
        </p>
        {permintaan.length === 0 ? (
          <p>Belum ada permintaan.</p>
        ) : (
          <table className="buku-kas tabel-ringkas">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Diajukan oleh</th>
                <th scope="col">Waktu</th>
                <th scope="col">Status</th>
                <th scope="col">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {permintaan.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.subjek.jenis} #{p.subjek.id}
                  </td>
                  <td>{p.diajukan_peran === 'amil' ? 'Amil, atas nama mustahik' : 'Pemilik data sendiri'}</td>
                  <td>{waktu(p.diajukan_pada)}</td>
                  <td>{STATUS[p.status]}</td>
                  <td className="sel-aksi">
                    {p.status !== 'menunggu' ? (
                      <span className="keterangan">{p.diproses_pada && waktu(p.diproses_pada)}</span>
                    ) : yakin === p.id ? (
                      <>
                        <button type="button" className="tombol tombol-bahaya" onClick={() => proses(p, 'setujui')}>
                          Ya, hapus
                        </button>
                        <button type="button" className="tombol tombol-teks" onClick={() => setYakin(null)}>
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="tombol tombol-garis" onClick={() => setYakin(p.id)}>
                          Setujui
                        </button>
                        <button type="button" className="tombol tombol-teks" onClick={() => proses(p, 'tolak')}>
                          Tolak
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {menunggu.length > 0 && <p className="keterangan">{menunggu.length} permintaan menunggu.</p>}
      </section>

      <section className="lembar">
        <h2>Akun dan peran</h2>
        <div className="buku-kas-gulir">
          <table className="buku-kas tabel-ringkas">
            <thead>
              <tr>
                <th scope="col">Nama pengguna</th>
                <th scope="col">Peran</th>
                <th scope="col">Wilayah</th>
                <th scope="col">
                  <span className="tersamar">Tindakan</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {akun.map((a) => (
                <BarisAkun
                  key={`${a.id}-${a.peran}-${a.wilayah_id}`}
                  akun={a}
                  wilayah={wilayah}
                  sendiri={a.id === pengguna.id}
                  onSimpan={simpanPeran}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lembar">
        <h2>Audit log</h2>
        <p className="keterangan">40 catatan terbaru. Catatan tidak bisa diubah atau dihapus.</p>
        <DaftarAudit log={audit} tampilkanPelaku />
      </section>

      {bukuKas && (
        <section className="lembar">
          <h2>Buku kas penyaluran</h2>
          <p className="keterangan">Admin hanya melihat ringkasan; identitas penerima dan nominal per baris ditutup.</p>
          <BukuKas data={bukuKas} />
        </section>
      )}
    </>
  );
}
