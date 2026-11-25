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

  kunci_data: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    kunci_terbungkus: {
      alasan: 'Kunci data milik satu pemilik data, untuk membuka kolom terenkripsinya',
      perlindungan: 'Dibungkus AES-256-GCM dengan kunci master yang disimpan di luar database',
    },
    dibuat_pada: { alasan: 'Dasar rotasi kunci', perlindungan: '-' },
  },

  donatur: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    nama: { alasan: 'Bukti donasi atas nama donatur', perlindungan: 'RBAC' },
    kontak: {
      alasan: 'Opsional: mengirim bukti donasi bila donatur memintanya',
      perlindungan: 'Enkripsi kolom, RBAC',
    },
    kunci_id: {
      alasan: 'Menunjuk kunci data milik donatur ini',
      perlindungan: 'Tidak dikirim ke browser',
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
    kunci_id: {
      alasan: 'Menunjuk kunci data milik mustahik ini',
      perlindungan: 'Tidak dikirim ke browser',
    },
    dianonimkan_pada: {
      alasan: 'Menandai data yang sudah dihapus atas permintaan, sementara catatan penyaluran tetap ada',
      perlindungan: '-',
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

  sesi: {
    token_hash: {
      alasan: 'Mengenali pengguna yang sudah masuk',
      perlindungan: 'Hanya hash SHA-256, token asli hanya di cookie HttpOnly',
    },
    pengguna_id: { alasan: 'Pemilik sesi', perlindungan: 'Tidak dikirim ke browser' },
    kedaluwarsa_pada: {
      alasan: 'Sesi berakhir otomatis setelah 8 jam',
      perlindungan: '-',
    },
  },

  permintaan_hapus: {
    id: { alasan: 'Penanda baris', perlindungan: '-' },
    subjek_jenis: { alasan: 'Jenis data yang diminta dihapus: donatur atau mustahik', perlindungan: 'Pilihan tetap' },
    subjek_id: { alasan: 'Nomor orang yang datanya diminta dihapus', perlindungan: 'Nomor saja, admin tidak melihat nama' },
    diajukan_peran: { alasan: 'Diajukan sendiri atau oleh amil atas nama mustahik', perlindungan: 'Pilihan tetap' },
    diajukan_pada: { alasan: 'Kapan permintaan diajukan', perlindungan: '-' },
    status: { alasan: 'Menunggu, disetujui, atau ditolak', perlindungan: 'Pilihan tetap' },
    diproses_pada: { alasan: 'Kapan permintaan diproses admin', perlindungan: '-' },
  },

  audit_log: {
    id: { alasan: 'Penanda baris dan urutan catatan', perlindungan: 'Hanya bisa ditambah' },
    waktu: { alasan: 'Kapan akses terjadi', perlindungan: 'Hanya bisa ditambah' },
    pengguna_id: {
      alasan: 'Siapa yang mengakses (akun staf atau pemilik data)',
      perlindungan: 'Hanya admin yang melihat; pemilik data hanya melihat perannya',
    },
    peran: { alasan: 'Peran pelaku saat akses, untuk riwayat akses pemilik data', perlindungan: 'Hanya bisa ditambah' },
    aksi: { alasan: 'Jenis aksi: baca, buat, ubah, ekspor, hapus, masuk', perlindungan: 'Pilihan tetap, bukan teks bebas' },
    objek: { alasan: 'Jenis data yang diakses', perlindungan: 'Pilihan tetap, bukan teks bebas' },
    subjek_jenis: { alasan: 'Data siapa yang diakses: donatur, mustahik, atau akun', perlindungan: 'Pilihan tetap' },
    subjek_id: {
      alasan: 'Nomor orang yang datanya diakses, tanpa nama',
      perlindungan: 'Nomor saja, bukan data pribadi asli',
    },
    saluran: {
      alasan: 'Membedakan akses dari aplikasi dan dari peragaan beranda',
      perlindungan: 'Pilihan tetap',
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
