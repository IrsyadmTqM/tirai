// Buku kas peragaan di beranda. Pengunjung memilih peran; server mengirim
// buku kas yang sudah disaring untuk peran itu dan mencatat aksesnya di
// audit log. Catatan baru meluncur masuk di panel samping.

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { KURVA } from '../lib/gerak.js';
import AngkaBerputar from './AngkaBerputar.jsx';
import BukuKas from './BukuKas.jsx';
import { kalimatAudit } from './DaftarAudit.jsx';
import SelTirai from './SelTirai.jsx';

const PILIHAN = [
  {
    peran: 'admin',
    label: 'Admin',
    uraian: 'Mengelola akun dan membaca audit log. Melihat ringkasan dana, tanpa identitas penerima dan tanpa nominal per baris.',
  },
  {
    peran: 'bendahara',
    label: 'Bendahara',
    uraian: 'Mencatat dan melihat nominal. Nama penerima terlihat; alamat dan kondisinya ditutup.',
  },
  {
    peran: 'amil',
    label: 'Amil lapangan',
    uraian: 'Mengantar bantuan di RW 01. Data penerima di wilayahnya terlihat lengkap; nominal dan wilayah lain ditutup.',
  },
];

const jam = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

export default function BukuKasPeragaan() {
  const [peran, setPeran] = useState('bendahara');
  const [data, setData] = useState(null);
  const [log, setLog] = useState([]);
  const [jumlahTerakhir, setJumlahTerakhir] = useState(null);
  const [galat, setGalat] = useState('');
  const permintaan = useRef(0);

  useEffect(() => {
    const nomor = ++permintaan.current;
    api(`/peragaan/buku-kas?peran=${peran}`)
      .then((d) => {
        if (nomor !== permintaan.current) return; // jawaban usang
        setData(d);
        setGalat('');
        setJumlahTerakhir(d.log.length);
        setLog((lama) => [...[...d.log].reverse(), ...lama].slice(0, 40));
      })
      .catch((e) => setGalat(e.status === 404 ? 'Mode peragaan dimatikan di server ini.' : e.message));
  }, [peran]);

  const pilihan = PILIHAN.find((p) => p.peran === peran);
  const r = data?.ringkasan;

  return (
    <section className="peragaan" aria-labelledby="judul-buku-kas">
      <div className="lembar lembar-buku">
        <div className="buku-kepala">
          <div>
            <h2 id="judul-buku-kas">Buku kas penyaluran</h2>
            <p className="keterangan">Maret sampai November 2026. Semua nama dan angka sintetis.</p>
          </div>
          <div className="pilih-peran" role="group" aria-label="Lihat buku kas sebagai">
            <span className="pilih-peran-label" aria-hidden="true">
              Lihat sebagai
            </span>
            {PILIHAN.map((p) => (
              <button
                key={p.peran}
                type="button"
                className="tombol-peran"
                aria-pressed={peran === p.peran}
                onClick={() => setPeran(p.peran)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={peran}
            className="uraian-peran"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: KURVA }}
            aria-live="polite"
          >
            <strong>{pilihan.label}.</strong> {pilihan.uraian}
          </motion.p>
        </AnimatePresence>

        <dl className="ringkasan-dana">
          {[
            ['Dana masuk', r?.total.masuk],
            ['Disalurkan', r?.total.keluar],
            ['Saldo', r?.total.saldo],
          ].map(([label, nilai]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <span className="mata-uang">Rp</span>{' '}
                {data && nilai !== undefined ? <AngkaBerputar nilai={nilai} /> : <SelTirai tertutup isi={null} />}
              </dd>
            </div>
          ))}
        </dl>

        {galat && <p className="pesan-galat">{galat}</p>}
        <p className="keterangan petunjuk-geser" aria-hidden="true">
          Geser tabel ke samping untuk melihat kolom lain.
        </p>
        {data && <BukuKas data={data} />}
        <p className="keterangan catatan-bukti">
          Sel hitam bukan disembunyikan dengan CSS: server tidak mengirim isinya ke browser ini. Periksa sendiri di tab
          Network pada alat pengembang browser.
        </p>
      </div>

      <aside className="lembar catatan-akses" aria-labelledby="judul-catatan-akses">
        <h2 id="judul-catatan-akses">Catatan akses</h2>
        <p className="keterangan">
          Server mencatat setiap pembukaan buku kas di audit log: siapa, kapan, dan data siapa yang terlihat.
          {jumlahTerakhir !== null && (
            <>
              {' '}
              Akses terakhir menghasilkan <strong>{jumlahTerakhir}</strong> catatan
              {jumlahTerakhir > 1 ? `, satu untuk tiap penerima yang namanya terlihat.` : '.'}
            </>
          )}
        </p>
        <ol className="log-meluncur" aria-live="polite" aria-relevant="additions">
          <AnimatePresence initial={false}>
            {log.slice(0, 8).map((l, i) => (
              <motion.li
                key={l.id}
                layout="position"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.28, ease: KURVA, delay: Math.min(i, 10) * 0.03 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <span className="audit-waktu">{jam.format(new Date(l.waktu))}</span>
                <span>{kalimatAudit(l)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </aside>
    </section>
  );
}
