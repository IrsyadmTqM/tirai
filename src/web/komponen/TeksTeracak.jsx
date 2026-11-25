// Teks yang berubah menjadi teks lain huruf demi huruf, melewati karakter
// acak. Dipakai untuk menggambarkan teks asli yang menjadi ciphertext.
// Dengan prefers-reduced-motion, hasil akhir langsung tampil.

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export default function TeksTeracak({ dari, ke, jalan }) {
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
