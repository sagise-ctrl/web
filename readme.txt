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
        6. Simpan URL sebagai environment variable GAS_URL di Vercel
           (BUKAN VITE_GAS_URL — URL tidak boleh terekspos ke frontend)


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/
----------------------------------------------------------------
Berisi seluruh kode frontend (tampilan website).

  package.json
    --> Daftar semua library yang dipakai frontend.
        Termasuk React, Tailwind, shadcn, TanStack Query, dll.
        Juga berisi: bcryptjs, jsonwebtoken, cookie, @vercel/node
        untuk keperluan autentikasi admin.

  vite.config.ts
    --> Konfigurasi build tool Vite.
        JANGAN diubah kecuali kamu paham konfigurasi Vite.

  tsconfig.json
    --> Konfigurasi TypeScript untuk project frontend dan API.
        Sudah dikonfigurasi untuk include folder api/.

  vercel.json
    --> Konfigurasi routing Vercel.
        Rewrite catch-all ke index.html (kecuali /api/*).

  components.json
    --> Konfigurasi shadcn/ui.


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/api/
----------------------------------------------------------------
Berisi Vercel Serverless Functions sebagai perantara keamanan.
Semua request dari frontend ke GAS wajib lewat sini.

  proxy.ts
    --> Proxy publik untuk user biasa.
        Meneruskan request ke GAS tanpa perlu autentikasi.
        Dipakai oleh halaman /order dan /track.

  auth/login.ts
    --> Endpoint login admin.
        Menerima password, verifikasi dengan bcrypt,
        lalu return JWT token dalam cookie HttpOnly.
        Password admin disimpan sebagai hash di Vercel env vars.

  admin/proxy.ts
    --> Proxy khusus admin.
        Cek JWT cookie sebelum meneruskan request ke GAS.
        Dipakai oleh halaman /admin.

  ALUR KEAMANAN:
    Browser → /api/proxy         → GAS (untuk user)
    Browser → /api/auth/login    → verifikasi bcrypt → JWT cookie
    Browser → /api/admin/proxy   → cek JWT → GAS (untuk admin)


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/src/
----------------------------------------------------------------

  main.tsx        --> Titik masuk React. Merender App.tsx.
  App.tsx         --> Routing semua halaman termasuk /terms.
  index.css       --> CSS global, warna tema.
  lib/utils.ts    --> Fungsi utilitas kecil.


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/src/pages/
----------------------------------------------------------------

  home.tsx
    --> HALAMAN BERANDA ( / )
        Hero section, kartu layanan, section keunggulan.

  order.tsx
    --> HALAMAN FORM PEMESANAN ( /order )
        Form: Nama, WhatsApp, Jenis Tugas, Jumlah Halaman,
        Deadline, Catatan.
        Request dikirim ke /api/proxy (bukan langsung ke GAS).

  track.tsx
    --> HALAMAN CEK STATUS ( /track )
        User masukkan Order ID untuk lihat status pesanan.
        Request dikirim ke /api/proxy.
        Ada tombol hubungi CS via WhatsApp.

  admin.tsx
    --> HALAMAN DASHBOARD ADMIN ( /admin )
        Dilindungi login JWT (bukan password hardcoded).
        Login via /api/auth/login, data diambil via /api/admin/proxy.
        Admin bisa ubah status order via dropdown.

  terms.tsx
    --> HALAMAN SYARAT & KETENTUAN ( /terms )
        Berisi kebijakan penggunaan layanan Tugasly.
        Dapat diakses publik. Link ada di footer.

  not-found.tsx   --> Halaman 404.


----------------------------------------------------------------
FOLDER: artifacts/jasa-tugas/src/components/
----------------------------------------------------------------

  layout.tsx
    --> KOMPONEN WRAPPER UTAMA.
        Berisi navbar, footer (dengan link Syarat & Ketentuan),
        dan tombol WhatsApp CS di pojok kanan bawah.

  ui/ (folder)
    --> Komponen UI dari shadcn/ui. JANGAN diedit langsung.


----------------------------------------------------------------
ENVIRONMENT VARIABLES (Vercel Dashboard)
----------------------------------------------------------------

  GAS_URL
    --> URL Google Apps Script.
        Disimpan di server, tidak terekspos ke browser.

  JWT_SECRET
    --> Secret key untuk sign dan verify JWT token admin.
        Generate dengan: openssl rand -base64 32

  ADMIN_PASSWORD_HASH
    --> Hash bcrypt dari password admin.
        Generate dengan: node -e "const b=require('bcryptjs');
        b.hash('passwordmu',10).then(console.log)"

  CATATAN: Ketiga env vars ini diatur di Vercel Dashboard
  (Settings → Environment Variables), bukan di file .env


----------------------------------------------------------------
ALUR KERJA SISTEM (End-to-End)
----------------------------------------------------------------

ORDER BARU:
  1. User buka /order → isi form → klik "Kirim Order"
  2. Frontend POST ke /api/proxy
  3. Proxy meneruskan ke GAS
  4. GAS simpan ke Google Sheets, return order_id
  5. Frontend tampilkan Order ID ke user

CEK STATUS:
  1. User buka /track → masukkan Order ID → klik "Cari"
  2. Frontend GET ke /api/proxy
  3. Proxy meneruskan ke GAS
  4. GAS baca Sheets, return detail order
  5. Frontend tampilkan status pesanan

ADMIN:
  1. Admin buka /admin → masukkan password
  2. Frontend POST ke /api/auth/login
  3. Server verifikasi bcrypt → return JWT dalam cookie HttpOnly
  4. Frontend GET semua order via /api/admin/proxy
  5. Server cek JWT → teruskan ke GAS
  6. Admin ubah status → POST via /api/admin/proxy


----------------------------------------------------------------
CARA MENGEMBANGKAN LEBIH LANJUT
----------------------------------------------------------------

Menambah field baru di form order:
  1. Edit src/pages/order.tsx (tambah field dan skema zod)
  2. Edit src/hooks/use-orders.ts (tambah field di interface Order)
  3. Edit google-apps-script/Code.gs (tambah kolom di Sheets)

Mengubah password admin:
  1. Generate hash baru:
     node -e "const b=require('bcryptjs');b.hash('passwordbaru',10).then(console.log)"
  2. Update ADMIN_PASSWORD_HASH di Vercel Dashboard
  3. Redeploy

Mengubah tampilan:
  --> Edit file di src/pages/ atau src/components/layout.tsx

Mengubah warna tema:
  --> Edit src/index.css, ubah nilai --primary, --background, dll.

Menambah halaman baru:
  1. Buat file baru di src/pages/namahalaman.tsx
  2. Daftarkan di src/App.tsx dengan Route baru

================================================================