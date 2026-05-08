================================================================
JASA TUGAS - Panduan File Proyek
================================================================
Platform pemesanan jasa tugas akademik untuk mahasiswa Indonesia.
User bisa order tugas, cek status, dan admin bisa kelola pesanan.
================================================================


----------------------------------------------------------------
STRUKTUR FOLDER UTAMA
----------------------------------------------------------------

readme.txt                      --> File ini. Panduan semua file proyek.
replit.md                       --> Dokumentasi teknis proyek (untuk developer).
pnpm-workspace.yaml             --> Konfigurasi monorepo pnpm (jangan diubah).
package.json                    --> Daftar perintah dan tools di level root.
tsconfig.json                   --> Konfigurasi TypeScript level root.
tsconfig.base.json              --> Konfigurasi TypeScript dasar yang dibagi semua package.


----------------------------------------------------------------
FOLDER: google-apps-script/
----------------------------------------------------------------
Berisi kode backend yang harus di-deploy ke Google Apps Script.
Google Apps Script berfungsi sebagai API yang menyimpan dan
mengambil data dari Google Sheets.

  Code.gs
    --> KODE UTAMA BACKEND.
        Berisi semua fungsi API:
        - createOrder  : menyimpan order baru ke Google Sheets
        - getOrder     : mengambil 1 order berdasarkan order_id
        - getAllOrders  : mengambil semua order (untuk admin)
        - updateStatus : mengubah status order (pending/proses/selesai)

        CARA PAKAI:
        1. Buka https://script.google.com
        2. Buat project baru, paste isi file ini
        3. Ganti SPREADSHEET_ID dengan ID Google Sheets kamu
        4. Deploy sebagai Web App (Anyone can access)
        5. Copy URL deploy-nya
        6. Paste URL ke Replit Secrets sebagai VITE_GAS_URL


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/
----------------------------------------------------------------
Berisi seluruh kode frontend (tampilan website).

  package.json
    --> Daftar semua library yang dipakai frontend.
        Termasuk React, Tailwind, shadcn, TanStack Query, dll.

  vite.config.ts
    --> Konfigurasi build tool Vite.
        Mengatur port, base URL, dan plugin yang dipakai.
        JANGAN diubah kecuali kamu paham konfigurasi Vite.

  tsconfig.json
    --> Konfigurasi TypeScript untuk project frontend.

  index.html
    --> File HTML utama. Titik masuk aplikasi di browser.

  components.json
    --> Konfigurasi shadcn/ui. Dipakai saat menambah komponen UI baru.


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/src/
----------------------------------------------------------------
Berisi semua kode React yang bisa kamu edit dan kembangkan.

  main.tsx
    --> Titik masuk React. Merender App.tsx ke dalam index.html.
        Biasanya tidak perlu diubah.

  App.tsx
    --> Konfigurasi routing halaman.
        Di sini didaftarkan semua halaman (/, /order, /track, /admin).
        Edit file ini jika ingin menambah halaman baru.

  index.css
    --> File CSS utama. Berisi warna, font, dan styling global.
        Edit di sini jika ingin mengubah warna tema seluruh website.
        Warna menggunakan format HSL (misal: "221 83% 53%").

  lib/utils.ts
    --> Fungsi utilitas kecil (misal: menggabungkan class CSS).
        Biasanya tidak perlu diubah.


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/src/pages/
----------------------------------------------------------------
Berisi satu file per halaman website. INI YANG PALING SERING DIEDIT.

  home.tsx
    --> HALAMAN BERANDA ( / )
        Berisi hero section, 3 kartu layanan (Makalah, PPT, Artikel),
        dan section keunggulan layanan.
        Edit di sini untuk mengubah tampilan halaman utama.

  order.tsx
    --> HALAMAN FORM PEMESANAN ( /order )
        Berisi form input: Nama, WhatsApp, Jenis Tugas, Jumlah Halaman,
        Deadline, dan Catatan.
        Setelah submit berhasil, menampilkan Order ID ke user.
        Edit di sini untuk menambah/mengubah field form.

  track.tsx
    --> HALAMAN CEK STATUS ( /track )
        User memasukkan Order ID untuk melihat status pesanan.
        Menampilkan detail order dan badge status berwarna:
        - Kuning  : Menunggu Review (pending)
        - Biru    : Sedang Dikerjakan (proses)
        - Hijau   : Selesai
        Edit di sini untuk mengubah tampilan hasil tracking.

  admin.tsx
    --> HALAMAN DASHBOARD ADMIN ( /admin )
        Dilindungi password (default: admin123).
        Menampilkan semua pesanan dalam tabel lengkap.
        Admin bisa mengubah status order via dropdown di tabel.
        Edit di sini untuk mengubah tampilan atau fitur admin.
        CATATAN: Untuk mengubah password admin, cari string
        "admin123" di file ini dan ganti dengan password baru.

  not-found.tsx
    --> HALAMAN 404
        Tampil jika user membuka URL yang tidak ada.


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/src/hooks/
----------------------------------------------------------------
Berisi fungsi-fungsi yang menghubungkan frontend ke backend.

  use-orders.ts
    --> FILE TERPENTING UNTUK INTEGRASI API.
        Berisi 4 fungsi untuk komunikasi dengan Google Apps Script:
        - useCreateOrder()   : kirim order baru (POST)
        - useGetOrder(id)    : ambil 1 order by ID (GET)
        - useGetAllOrders()  : ambil semua order (GET)
        - useUpdateOrder()   : update status order (POST)
        Juga berisi definisi tipe data Order (TypeScript interface).
        Edit di sini jika ingin menambah field data atau endpoint baru.

  use-toast.ts
    --> Fungsi untuk menampilkan notifikasi toast (popup singkat).
        Dipakai di semua halaman untuk notifikasi sukses/error.

  use-mobile.tsx
    --> Fungsi untuk mendeteksi apakah user memakai layar kecil (mobile).


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/src/components/
----------------------------------------------------------------
Berisi komponen UI yang dipakai di banyak halaman.

  layout.tsx
    --> KOMPONEN WRAPPER UTAMA.
        Berisi navbar (header), warning banner jika VITE_GAS_URL
        belum diisi, area konten, dan footer.
        Edit di sini untuk mengubah navbar atau footer.

  ui/ (folder)
    --> Berisi ~50 komponen UI siap pakai dari library shadcn/ui.
        Contoh: Button, Input, Select, Table, Badge, Card, dll.
        Komponen-komponen ini JANGAN diedit langsung karena
        akan ditimpa jika library diupdate.
        Gunakan saja dengan mengimpornya di file pages/*.tsx.


----------------------------------------------------------------
VARIABEL LINGKUNGAN (Environment Variables)
----------------------------------------------------------------

  VITE_GAS_URL
    --> URL Google Apps Script setelah di-deploy.
        Contoh: https://script.google.com/macros/s/xxx.../exec
        Diatur di: Replit > Secrets/Environment Variables
        Wajib diisi agar aplikasi bisa terhubung ke backend.


----------------------------------------------------------------
ALUR KERJA SISTEM (End-to-End)
----------------------------------------------------------------

1. User buka /order  → isi form → klik "Kirim Order"
2. Frontend POST data ke Google Apps Script (VITE_GAS_URL)
3. Google Apps Script tulis baris baru ke Google Sheets
4. GAS return { order_id: "ORD-xxx" } ke frontend
5. Frontend tampilkan Order ID ke user

6. User buka /track  → masukkan Order ID → klik "Cari"
7. Frontend GET ke GAS dengan parameter order_id
8. GAS baca data dari Sheets, return detail order
9. Frontend tampilkan status dan detail pesanan

10. Admin buka /admin → masukkan password "admin123"
11. Frontend GET semua order dari GAS
12. Admin ubah status via dropdown
13. Frontend POST updateStatus ke GAS
14. GAS update kolom status di Sheets


----------------------------------------------------------------
CARA MENGEMBANGKAN LEBIH LANJUT
----------------------------------------------------------------

Menambah field baru di form order:
  1. Edit artifacts/jasa-tugas/src/pages/order.tsx
     (tambah field di form dan skema zod)
  2. Edit artifacts/jasa-tugas/src/hooks/use-orders.ts
     (tambah field di interface Order)
  3. Edit google-apps-script/Code.gs
     (tambah kolom baru di Sheets dan di fungsi handleCreateOrder)

Mengubah tampilan halaman:
  --> Edit file yang sesuai di folder src/pages/

Mengubah warna tema:
  --> Edit artifacts/jasa-tugas/src/index.css
      Ubah nilai --primary, --background, dll.

Menambah halaman baru:
  1. Buat file baru di src/pages/namahalaman.tsx
  2. Daftarkan di src/App.tsx dengan Route baru

================================================================
