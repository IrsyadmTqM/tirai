// Inventaris data: alasan tertulis untuk setiap kolom di skema.sql.
// Prinsip minimisasi: kolom tanpa alasan tidak boleh ada. Tes di
// tests/database.test.js gagal bila ada kolom yang belum tercatat di sini,
// atau bila di sini ada kolom yang tidak ada di skema.
//
// Teks "alasan" juga akan ditampilkan di dasbor "Data saya" (langkah 6)
// sebagai tujuan pengumpulan tiap field.
//
// "perlindungan" adalah rancangan akhir. Enkripsi kolom baru aktif di
// langkah 3, RBAC di langkah 2.

export const INVENTARIS = {
  wilayah: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    nama: {
      alasan: 'Membagi tugas amil lapangan per wilayah (misalnya RW)',
      perlindungan: '-',
    },
  },

  donatur: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    nama: { alasan: 'Bukti donasi atas nama donatur', perlindungan: 'RBAC' },
    kontak: {
      alasan: 'Opsional: mengirim bukti donasi bila donatur memintanya',
      perlindungan: 'Enkripsi kolom, RBAC',
    },
    dibuat_pada: {
      alasan: 'Dasar menghitung masa simpan data',
      perlindungan: 'RBAC',
    },
  },

  mustahik: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    nama: {
      alasan: 'Menyalurkan bantuan kepada orang yang tepat',
      perlindungan: 'Enkripsi kolom, RBAC wilayah',
    },
    alamat: {
      alasan: 'Verifikasi dan pengantaran bantuan oleh amil wilayah',
      perlindungan: 'Enkripsi kolom, hanya amil wilayahnya',
    },
    kondisi: {
      alasan: 'Catatan singkat alasan penyaluran',
      perlindungan: 'Enkripsi kolom, hanya amil wilayahnya',
    },
    asnaf: {
      alasan: 'Menentukan hak penerima menurut kategori asnaf',
      perlindungan: 'RBAC',
    },
    wilayah_id: {
      alasan: 'Membatasi akses amil hanya pada wilayahnya',
      perlindungan: 'RBAC',
    },
    nik_hmac: {
      alasan: 'Mencegah penerima ganda tanpa menyimpan NIK utuh',
      perlindungan: 'HMAC berkunci, NIK asli tidak disimpan',
    },
    dibuat_pada: {
      alasan: 'Dasar menghitung masa simpan data',
      perlindungan: 'RBAC',
    },
  },

  pengguna: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    nama_pengguna: { alasan: 'Identitas untuk masuk', perlindungan: 'RBAC' },
    kata_sandi_hash: {
      alasan: 'Memeriksa kata sandi saat masuk',
      perlindungan: 'Hash scrypt dengan salt, kata sandi asli tidak disimpan',
    },
    peran: { alasan: 'Menentukan hak akses (RBAC)', perlindungan: 'Hanya admin yang mengubah' },
    wilayah_id: {
      alasan: 'Wilayah tugas amil lapangan',
      perlindungan: 'Hanya admin yang mengubah',
    },
    donatur_id: {
      alasan: 'Menautkan akun pemilik data ke data donaturnya',
      perlindungan: 'RBAC',
    },
    mustahik_id: {
      alasan: 'Menautkan akun pemilik data ke data mustahiknya, bila mustahik punya akun',
      perlindungan: 'RBAC',
    },
    dibuat_pada: {
      alasan: 'Dasar menghitung masa simpan data',
      perlindungan: 'RBAC',
    },
  },

  donasi: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    donatur_id: {
      alasan: 'Menautkan donasi ke donatur. Kosong bila donatur memilih tanpa nama',
      perlindungan: 'RBAC',
    },
    jenis: { alasan: 'Pembukuan per jenis dana ZISWAF', perlindungan: 'RBAC' },
    nominal: { alasan: 'Pembukuan dan laporan keuangan', perlindungan: 'RBAC' },
    tanggal: { alasan: 'Pembukuan dan laporan keuangan', perlindungan: 'RBAC' },
    dicatat_oleh: {
      alasan: 'Akuntabilitas: siapa yang mencatat transaksi',
      perlindungan: 'RBAC',
    },
    dibuat_pada: { alasan: 'Dasar menghitung masa simpan data', perlindungan: 'RBAC' },
  },

  penyaluran: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    mustahik_id: { alasan: 'Menautkan penyaluran ke penerima', perlindungan: 'RBAC' },
    jenis_dana: { alasan: 'Pembukuan per jenis dana ZISWAF', perlindungan: 'RBAC' },
    nominal: { alasan: 'Pembukuan dan laporan keuangan', perlindungan: 'RBAC' },
    tanggal: { alasan: 'Pembukuan dan laporan keuangan', perlindungan: 'RBAC' },
    dicatat_oleh: {
      alasan: 'Akuntabilitas: siapa yang mencatat transaksi',
      perlindungan: 'RBAC',
    },
    dibuat_pada: { alasan: 'Dasar menghitung masa simpan data', perlindungan: 'RBAC' },
  },
};

// Data yang sengaja tidak dikumpulkan sama sekali. Tes memastikan tidak ada
// kolom dengan nama yang mengarah ke data ini.
export const TIDAK_DIKUMPULKAN = [
  { data: 'NIK utuh', alasan: 'Cukup penanda duplikat berupa HMAC' },
  { data: 'Foto KTP', alasan: 'Tidak ada kebutuhan' },
  { data: 'Lokasi GPS', alasan: 'Tidak ada kebutuhan' },
  { data: 'Daftar kontak telepon', alasan: 'Tidak ada kebutuhan' },
];
