// Bagian "Cara Tirai menjaga data": alur data dari formulir sampai audit
// log. Garis di kiri terisi mengikuti scroll, dan tiap tahap bergerak saat
// masuk layar. Dengan prefers-reduced-motion, semuanya tampil diam dalam
// keadaan akhir.

import { motion, useInView, useReducedMotion, useScroll } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { KURVA } from '../lib/gerak.js';
import SelTirai from './SelTirai.jsx';

const ALAMAT = 'Jl. Kenanga No. 12, RT 02/RW 01';
// Contoh bentuk ciphertext seperti yang tersimpan di database (ilustrasi).
const SANDI = 'v1:jQHq1awJAFIP1m5QTAJqTDWPIVt7lpVr4nvu';
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function TeksTeracak({ dari, ke, jalan }) {
  const [teks, setTeks] = useState(dari);
  const hemat = useReducedMotion();

  useEffect(() => {
    if (!jalan) return undefined;
    if (hemat) {
      setTeks(ke);
      return undefined;
    }
    let langkah = 0;
    const total = 26;
    const id = setInterval(() => {
      langkah += 1;
      const tetap = Math.floor((langkah / total) * ke.length);
      let acak = '';
      for (let i = tetap; i < ke.length; i++) acak += BASE64[Math.floor(Math.random() * BASE64.length)];
      setTeks(ke.slice(0, tetap) + acak);
      if (langkah >= total) {
        clearInterval(id);
        setTeks(ke);
      }
    }, 38);
    return () => clearInterval(id);
  }, [jalan, hemat, ke]);

  return <code className="teks-sandi">{teks}</code>;
}

function VisualMinimal({ jalan }) {
  const baris = [
    ['Nama', 'Sumarni', false],
    ['Alamat', ALAMAT, false],
    ['Asnaf', 'Fakir', false],
    ['Foto KTP', 'tidak diminta', true],
    ['Lokasi GPS', 'tidak diminta', true],
  ];
  return (
    <dl className="kartu-formulir">
      {baris.map(([label, isi, coret], i) => (
        <div key={label} className={coret ? 'baris-coret' : undefined}>
          <dt>{label}</dt>
          <dd>
            {isi}
            {coret && (
              <motion.span
                className="garis-coret"
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: jalan ? 1 : 0 }}
                transition={{ duration: 0.4, ease: KURVA, delay: 0.2 + i * 0.12 }}
              />
            )}
          </dd>
        </div>
      ))}
      <div>
        <dt>NIK</dt>
        <dd>
          <TeksTeracak dari="0000 0000 0000 0001" ke="penanda e5f8cc65fa66" jalan={jalan} />
        </dd>
      </div>
    </dl>
  );
}

function VisualSandi({ jalan }) {
  return (
    <div className="kartu-sandi">
      <p className="keterangan">Ditulis amil</p>
      <p className="teks-asli">{ALAMAT}</p>
      <motion.div
        className="panah-turun"
        aria-hidden="true"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: jalan ? 1 : 0 }}
        transition={{ duration: 0.35, ease: KURVA }}
      />
      <p className="keterangan">Tersimpan di disk (contoh)</p>
      <TeksTeracak dari={ALAMAT} ke={SANDI} jalan={jalan} />
      <p className="keterangan kunci-milik">Dikunci dengan kunci milik penerima ini, yang dibungkus kunci master.</p>
    </div>
  );
}

function VisualPeran({ jalan }) {
  const baris = [
    ['Amil RW 01', false],
    ['Bendahara', true],
    ['Admin', true],
  ];
  return (
    <table className="tabel-peran">
      <caption className="tersamar">Alamat penerima menurut peran</caption>
      <tbody>
        {baris.map(([peran, tutup], i) => (
          <tr key={peran}>
            <th scope="row">{peran}</th>
            <td>
              <SelTirai tertutup={jalan && tutup} isi={ALAMAT} jeda={0.15 + i * 0.15} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function VisualLog({ jalan }) {
  const baris = ['10.02 · Amil lapangan membaca data mustahik #1', '10.05 · Bendahara membaca data mustahik #1'];
  return (
    <div className="kartu-log">
      <ol>
        {baris.map((b, i) => (
          <motion.li
            key={b}
            initial={{ opacity: 0, x: 24 }}
            animate={jalan ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: 0.3, ease: KURVA, delay: 0.15 + i * 0.25 }}
          >
            {b}
          </motion.li>
        ))}
      </ol>
      <p className="keterangan">Tidak bisa diubah atau dihapus. Tidak memuat nama.</p>
    </div>
  );
}

const LANGKAH = [
  {
    judul: 'Dikumpulkan seperlunya',
    teks: 'Amil hanya mengisi yang dibutuhkan untuk menyalurkan bantuan. Foto KTP, lokasi GPS, dan daftar kontak tidak diminta. NIK tidak disimpan; yang disimpan hanya penanda untuk mencegah penerima ganda.',
    Visual: VisualMinimal,
  },
  {
    judul: 'Disimpan terkunci',
    teks: 'Sebelum masuk database, nama, alamat, dan kondisi penerima dienkripsi dengan AES-256-GCM memakai kunci milik orang itu sendiri. Yang tersimpan di disk hanya deretan acak.',
    Visual: VisualSandi,
  },
  {
    judul: 'Dibuka sesuai peran',
    teks: 'Server memutuskan siapa boleh melihat apa. Amil wilayah itu melihat alamatnya; bendahara dan admin tidak. Yang tidak boleh dilihat bahkan tidak didekripsi dan tidak dikirim ke browser.',
    Visual: VisualPeran,
  },
  {
    judul: 'Setiap akses tercatat',
    teks: 'Siapa, kapan, dan data siapa. Audit log hanya bisa ditambah, dan isinya berupa nomor, bukan nama. Pemilik data bisa melihat riwayat akses atas datanya sendiri.',
    Visual: VisualLog,
  },
];

function Langkah({ nomor, judul, teks, Visual }) {
  const ref = useRef(null);
  const jalan = useInView(ref, { amount: 0.55, once: true });
  return (
    <li ref={ref} className={jalan ? 'alur-langkah aktif' : 'alur-langkah'}>
      <span className="alur-nomor" aria-hidden="true">
        {nomor}
      </span>
      <div className="alur-teks">
        <h3>{judul}</h3>
        <p>{teks}</p>
      </div>
      <div className="alur-visual">
        <Visual jalan={jalan} />
      </div>
    </li>
  );
}

export default function CaraKerja() {
  const ref = useRef(null);
  const hemat = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 65%'] });

  return (
    <section id="cara-kerja" className="cara-kerja" aria-labelledby="judul-cara-kerja">
      <div className="halaman halaman-lebar">
        <h2 id="judul-cara-kerja">Cara Tirai menjaga data</h2>
        <p className="pengantar">
          Satu alamat penerima, dari formulir amil sampai tercatat di audit log. Prinsipnya: kumpulkan seperlunya, kunci
          yang sensitif, buka sesuai peran, dan catat setiap akses.
        </p>
        <div className="alur" ref={ref}>
          <div className="alur-garis" aria-hidden="true">
            <motion.div className="alur-garis-isi" style={{ scaleY: hemat ? 1 : scrollYProgress }} />
          </div>
          <ol>
            {LANGKAH.map((l, i) => (
              <Langkah key={l.judul} nomor={i + 1} {...l} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
