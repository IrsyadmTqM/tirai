// Konfirmasi aksi yang muncul singkat di bawah layar, lalu hilang sendiri.
// Diumumkan ke pembaca layar lewat role="status".

import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { KURVA } from '../lib/gerak.js';

const Konteks = createContext(() => {});

export function PenyediaPemberitahuan({ children }) {
  const [pesan, setPesan] = useState(null);
  const nomor = useRef(0);

  const beriTahu = useCallback((teks, jenis = 'berhasil') => {
    const id = ++nomor.current;
    setPesan({ id, teks, jenis });
    setTimeout(() => setPesan((p) => (p?.id === id ? null : p)), 3600);
  }, []);

  return (
    <Konteks.Provider value={beriTahu}>
      {children}
      <div className="pemberitahuan-wadah" role="status" aria-live="polite">
        <AnimatePresence>
          {pesan && (
            <motion.div
              key={pesan.id}
              className={`pemberitahuan pemberitahuan-${pesan.jenis}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: KURVA } }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.18 } }}
            >
              {pesan.teks}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Konteks.Provider>
  );
}

export const useBeriTahu = () => useContext(Konteks);
