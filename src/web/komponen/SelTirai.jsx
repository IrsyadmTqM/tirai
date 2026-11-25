// Satu sel buku kas dengan "tirai": bar hitam yang menutup dari kiri saat
// peran tidak boleh melihat isinya, dan tersibak ke kanan saat boleh.
//
// Saat menutup, teks lama tetap ada di bawah bar sampai bar menutup penuh,
// lalu dibuang. Teks itu memang sudah diterima browser untuk peran
// sebelumnya, jadi tidak ada data baru yang terbuka. Lebar bar dipertahankan
// supaya tabel tidak melompat.

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { KURVA } from '../lib/gerak.js';

export default function SelTirai({ tertutup, isi, jeda = 0 }) {
  const [tampil, setTampil] = useState(tertutup ? null : isi);
  const [lebar, setLebar] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!tertutup) {
      setTampil(isi);
      setLebar(null);
    }
  }, [tertutup, isi]);

  return (
    <span className="sel-isi" ref={ref} style={lebar ? { minWidth: lebar } : undefined}>
      <span className={tampil === null ? 'sel-teks sel-kosong' : 'sel-teks'} aria-hidden={tertutup}>
        {tampil ?? ' '}
      </span>
      <AnimatePresence initial={false}>
        {tertutup && (
          <motion.span
            key="tirai"
            className="tirai-sel"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1, originX: 0, transition: { duration: 0.32, ease: KURVA, delay: jeda } }}
            exit={{ scaleX: 0, originX: 1, transition: { duration: 0.32, ease: KURVA, delay: jeda } }}
            onAnimationComplete={(target) => {
              // Hanya setelah tirai menutup penuh, bukan setelah tersibak.
              if (target?.scaleX !== 1) return;
              if (tampil !== null && ref.current) setLebar(ref.current.offsetWidth);
              setTampil(null);
            }}
          />
        )}
      </AnimatePresence>
      {tertutup && <span className="tersamar">ditutup untuk peran ini</span>}
    </span>
  );
}
