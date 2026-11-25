// Pengaturan gerak. Bila pengguna mengaktifkan prefers-reduced-motion,
// semua animasi Motion langsung selesai (tanpa gerakan), termasuk animasi
// opasitas. Animasi CSS dimatikan di styles.css.

import { MotionGlobalConfig } from 'motion/react';

const kueri = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function pasangPengaturanGerak() {
  if (!kueri) return;
  const terapkan = () => {
    MotionGlobalConfig.skipAnimations = kueri.matches;
  };
  terapkan();
  kueri.addEventListener('change', terapkan);
}

// Kurva gerak bersama: cepat di awal, lembut di akhir.
export const KURVA = [0.2, 0, 0, 1];
