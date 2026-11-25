// Angka yang berputar ke nilai barunya seperti penghitung mekanis.
// Tiap digit adalah gulungan 0 sampai 9 yang digeser ke angka tujuannya.
// Saat pertama muncul, gulungan berputar dari 0.

import { motion } from 'motion/react';
import { rupiah } from '../lib/format.js';

const DIGIT = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function AngkaBerputar({ nilai }) {
  const teks = rupiah(nilai);
  const karakter = [...teks];
  return (
    <span className="angka-berputar" aria-label={teks}>
      {karakter.map((c, i) => {
        // Kunci dihitung dari kanan supaya digit satuan tetap di gulungannya
        // walaupun panjang angka berubah.
        const posisi = karakter.length - i;
        if (!/\d/.test(c)) {
          return (
            <span key={`p${posisi}`} className="angka-pemisah" aria-hidden="true">
              {c}
            </span>
          );
        }
        return (
          <span key={`d${posisi}`} className="angka-gulungan" aria-hidden="true">
            <motion.span
              className="angka-pita"
              initial={{ y: '0em' }}
              animate={{ y: `${-Number(c) * 1.25}em` }}
              transition={{ type: 'spring', stiffness: 140, damping: 22, mass: 0.9, delay: posisi * 0.025 }}
            >
              {DIGIT.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
