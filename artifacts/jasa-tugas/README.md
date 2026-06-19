# Jasa Tugas — Dokumentasi Lengkap Proyek

Platform pemesanan jasa tugas akademik untuk mahasiswa Indonesia.
Customer dapat memesan, membayar, dan memantau status pengerjaan tugasnya secara online.
Admin mengelola seluruh alur order dari satu dashboard terpusat.

---

## Daftar Isi

1. [Gambaran Umum](#gambaran-umum)
2. [Tech Stack](#tech-stack)
3. [Arsitektur Sistem](#arsitektur-sistem)
4. [Struktur File Lengkap](#struktur-file-lengkap)
5. [Konfigurasi Penting](#konfigurasi-penting)
6. [Alur Order Lengkap](#alur-order-lengkap)
7. [Logika Harga](#logika-harga)
8. [File yang Bisa Dikembangkan](#file-yang-bisa-dikembangkan)
9. [Google Apps Script — Setup & Kolom Sheets](#google-apps-script)
10. [Menjalankan Proyek](#menjalankan-proyek)

---

## Gambaran Umum

Jasa Tugas adalah web app full-stack ringan tanpa server backend tradisional.
Frontend dibangun dengan React + Vite, backend menggunakan Google Apps Script (GAS)
yang terhubung ke Google Sheets sebagai database.

Fitur utama:

- Multi-step order form (data diri → detail tugas → konfirmasi)
- Tiga jenis tugas: Makalah, PPT, Artikel, Tugas Harian
- Tiga tipe layanan: Standar, Ekspres, Super Ekspres
- Upload bukti pembayaran (DP & pelunasan) langsung dari browser
- Pelacakan status real-time (auto-refresh setiap 15 detik untuk customer, 20 detik untuk admin)
- Revisi gratis 1 kali dengan upload catatan & file referensi
- Estimasi selesai otomatis berdasarkan tipe layanan
- Catatan order & revisi bisa diunduh sebagai file .txt di dashboard admin
- Dashboard admin dengan autentikasi password

---

## Tech Stack

| Layer            | Teknologi                     |
| ---------------- | ----------------------------- |
| Framework UI     | React 18 + TypeScript         |
| Build Tool       | Vite 5                        |
| Styling          | Tailwind CSS v4               |
| Komponen UI      | shadcn/ui (berbasis Radix UI) |
| Form & Validasi  | react-hook-form + Zod         |
| Data Fetching    | TanStack React Query v5       |
| Routing          | Wouter                        |
| Ikon             | Lucide React                  |
| Backend          | Google Apps Script (GAS)      |
| Database         | Google Sheets                 |
| Penyimpanan File | Google Drive                  |

---

## Arsitektur Sistem

```
Browser (React + Vite)
        │
        │  HTTP fetch (GET/POST)
        ▼
Google Apps Script Web App URL
        │
        ├── Baca/tulis data → Google Sheets (database)
        └── Upload file     → Google Drive (penyimpanan)
```

Tidak ada server Node.js atau database terpisah.
Semua data tersimpan di Google Sheets, semua file di Google Drive.

---

## Struktur File Lengkap

```
artifacts/jasa-tugas/
├── src/
│   ├── pages/
│   │   ├── home.tsx          — Halaman beranda / landing page
│   │   ├── order.tsx         — Form pemesanan multi-step (3 langkah)
│   │   ├── track.tsx         — Halaman pelacakan status order customer
│   │   ├── admin.tsx         — Dashboard admin (login + kelola order)
│   │   └── not-found.tsx     — Halaman 404
│   │
│   ├── hooks/
│   │   └── use-orders.ts     — Semua API call ke GAS + logika harga + helper estimasi
│   │
│   ├── components/
│   │   ├── layout.tsx        — Layout utama (header + footer + container)
│   │   └── ui/               — Komponen shadcn/ui (button, card, input, dll.)
│   │       ├── select.tsx    — Select dropdown (sudah di-patch untuk Tailwind v4)
│   │       └── ...           — 30+ komponen UI lainnya
│   │
│   ├── main.tsx              — Entry point React, setup QueryClient
│   ├── App.tsx               — Router utama (Wouter)
│   └── index.css             — Tailwind v4 config & CSS variables
│
├── public/
│   └── qris.png              — Gambar QRIS untuk pembayaran (perlu diupload manual)
│
├── index.html                — HTML shell
├── vite.config.ts            — Konfigurasi Vite (port, base path, alias)
├── tsconfig.json             — Konfigurasi TypeScript
├── package.json              — Dependencies
└── components.json           — Konfigurasi shadcn/ui

google-apps-script/
└── Code.gs                   — Seluruh backend (harus di-deploy ke GAS)
```

---

## Konfigurasi Penting

### 1. Password Admin

**File:** `artifacts/jasa-tugas/src/pages/admin.tsx`
**Baris:** Cari `if (password === "admin123")`

```tsx
// Ganti "admin123" dengan password yang diinginkan
if (password === "admin123") setIsAuthenticated(true);
```

### 2. URL Google Apps Script (Backend)

**File:** Environment variable di Replit — bukan di kode langsung

Nama variabel: `VITE_GAS_URL`

Cara ubah:

- Di Replit: buka tab **Secrets** (kunci/gembok) → edit nilai `VITE_GAS_URL`
- Isi dengan URL deployment GAS (format: `https://script.google.com/macros/s/XXXXXXX/exec`)

Digunakan di: `artifacts/jasa-tugas/src/hooks/use-orders.ts` baris:

```ts
const GAS_URL = import.meta.env.VITE_GAS_URL;
```

### 3. ID Google Spreadsheet

**File:** `google-apps-script/Code.gs`
**Baris pertama konstanta:**

```js
const SPREADSHEET_ID = "1M46VQj9eGn4_Pn_bg0u4IAcuqnaAekEAHo-yeVXV9Eo";
```

Ganti dengan ID spreadsheet Google Sheets milik Anda
(ambil dari URL sheets: `https://docs.google.com/spreadsheets/d/ID_INI/edit`)

### 4. Nama Sheet

**File:** `google-apps-script/Code.gs`

```js
const SHEET_NAME = "Orders";
```

### 5. Gambar QRIS Pembayaran

**File:** `artifacts/jasa-tugas/public/qris.png`

Upload file gambar QRIS ke folder `public/` dengan nama `qris.png`.
Tampilkan di `track.tsx` dengan mengubah placeholder:

```tsx
// Cari: <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-2" />
// Ganti dengan: <img src="/qris.png" alt="QRIS" className="mx-auto max-w-[200px]" />
```

### 6. Interval Auto-Refresh

**File:** `artifacts/jasa-tugas/src/hooks/use-orders.ts`

```ts
// Halaman tracking customer — refresh setiap 15 detik
refetchInterval: 15000,

// Dashboard admin — refresh setiap 20 detik
refetchInterval: 20000,
```

Ubah angka (dalam milidetik) sesuai kebutuhan. Nilai lebih kecil = lebih cepat tapi lebih banyak request ke GAS.

### 7. Biaya Layanan Ekspres

**File:** `artifacts/jasa-tugas/src/hooks/use-orders.ts`

```ts
export function biayaTambahan(tipeOrder: TipeOrder): number {
  if (tipeOrder === "super ekspres") return 15000; // ubah nominal
  if (tipeOrder === "ekspres") return 7000; // ubah nominal
  return 0;
}
```

### 8. Harga Dasar per Jenis Tugas

**File:** `artifacts/jasa-tugas/src/hooks/use-orders.ts`

```ts
export function hitungHarga(jenis: JenisTugas, halaman: number): number {
  if (jenis === "Makalah" || jenis === "Artikel") {
    const tier = Math.max(0, Math.ceil((halaman - 10) / 5));
    return 30000 + tier * 5000; // harga dasar 30rb, naik 5rb tiap 5 hal
  }
  if (jenis === "PPT") {
    return 20000 + Math.max(0, halaman - 5) * 3000; // dasar 20rb, +3rb/slide
  }
  if (jenis === "Tugas Harian") {
    return 20000 + Math.max(0, halaman - 2) * 4000; // dasar 20rb, +4rb/lembar
  }
}
```

### 9. Estimasi Hari Selesai per Tipe Layanan

**File:** `artifacts/jasa-tugas/src/hooks/use-orders.ts`

```ts
export function hitungEstimasiSelesai(tipeOrder, fromDate = new Date()): Date {
  const days = tipeOrder === "super ekspres" ? 1   // Super Ekspres: +1 hari
             : tipeOrder === "ekspres"       ? 2   // Ekspres: +2 hari
             :                                4;   // Standar: +4 hari
  ...
}
```

### 10. Batas Karakter Catatan

**File:** `artifacts/jasa-tugas/src/pages/order.tsx` — catatan order (saat ini: 1000)
**File:** `artifacts/jasa-tugas/src/pages/track.tsx` — catatan revisi (saat ini: 1000)

---

## Alur Order Lengkap

```
Customer pesan
      │
      ▼
[verifikasi tugas]        ← admin cek detail, klik "Verifikasi & Minta DP"
      │
      ▼
[pembayaran awal]         ← customer upload bukti DP (Rp 10.000)
      │
      ▼
[verifikasi pembayaran awal] ← admin cek bukti DP, klik "DP OK, Mulai Kerjakan"
      │                         → estimasi_selesai dihitung & disimpan
      ▼
[proses pengerjaan]       ← admin mengerjakan tugas
      │
      ▼ (admin upload file hasil)
[menunggu pelunasan]      ← customer upload bukti pelunasan (sisa bayar)
      │
      ▼
[menunggu verifikasi]     ← admin cek bukti pelunasan, aktifkan file
      │
      ▼
[cek file]                ← customer unduh & cek file hasil
      │
      ├──[Selesai]        ← customer konfirmasi → status: selesai
      │
      └──[Revisi]         ← customer ajukan revisi (1x gratis)
                              → estimasi_revisi = sekarang + 12 jam
                    │
                    ▼
              [revisi]    ← admin upload hasil revisi → langsung selesai
```

---

## Logika Harga

| Jenis             | Halaman/Slide/Lembar | Formula                                 |
| ----------------- | -------------------- | --------------------------------------- |
| Makalah & Artikel | mulai 10             | Rp 30.000 + (ceil((n-10)/5) × Rp 5.000) |
| PPT               | mulai 5 slide        | Rp 20.000 + ((n-5) × Rp 3.000)          |
| Tugas Harian      | mulai 2 lembar       | Rp 20.000 + ((n-2) × Rp 4.000)          |

Biaya tambahan tipe layanan:

- Standar: +Rp 0
- Ekspres: +Rp 7.000
- Super Ekspres: +Rp 15.000

DP default: Rp 10.000 (ubah di `Code.gs` → `handleCreateOrder`, baris `const dp = 10000`)

---

## File yang Bisa Dikembangkan

### Prioritas Tinggi (paling bermanfaat untuk dikembangkan)

#### `artifacts/jasa-tugas/src/pages/admin.tsx`

Saat ini hanya punya autentikasi password sederhana dan tabel order.
Potensi pengembangan:

- Tambah filter/pencarian order berdasarkan status, nama, atau tanggal
- Tambah fitur export seluruh data order ke CSV/Excel
- Notifikasi browser (Web Push Notifications) saat ada order baru
- Tampilan ringkasan pendapatan (total harga, total DP masuk, dll.)
- Histori log perubahan status per order

#### `artifacts/jasa-tugas/src/pages/track.tsx`

Saat ini hanya bisa dicari manual dengan Order ID.
Potensi pengembangan:

- Simpan Order ID ke localStorage agar customer tidak perlu ingat
- Kirim notifikasi WhatsApp otomatis ke customer saat status berubah (via WhatsApp API)
- Tampilkan riwayat lengkap perubahan status dengan timestamp
- Tombol "Bagikan status" menghasilkan link langsung ke halaman tracking

#### `artifacts/jasa-tugas/src/pages/order.tsx`

Potensi pengembangan:

- Tambah step 0: pilih dari template tugas populer
- Tambah upload file referensi saat order awal (bukan hanya saat revisi)
- Integrasi kalender untuk memilih deadline sendiri
- Simpan draft order di localStorage jika customer tutup browser

#### `artifacts/jasa-tugas/src/hooks/use-orders.ts`

File sentral semua logika bisnis.
Potensi pengembangan:

- Tambah hook `useOrderHistory` untuk riwayat semua order per nomor WA
- Tambah validasi duplikat order (cek apakah WA sudah ada order aktif)
- Tambah optimistic update agar UI terasa lebih responsif

### Prioritas Menengah

#### `artifacts/jasa-tugas/src/components/layout.tsx`

Potensi pengembangan:

- Tambah navigasi mobile (hamburger menu)
- Tambah nomor WA admin yang bisa diklik langsung (wa.me link)
- Tambah mode gelap (dark mode)

#### `artifacts/jasa-tugas/src/pages/home.tsx`

Potensi pengembangan:

- Tambah bagian testimoni customer
- Tambah FAQ (pertanyaan yang sering ditanyakan)
- Tambah portofolio contoh hasil tugas
- Tambah banner promo / diskon

### Infrastruktur & Backend

#### `google-apps-script/Code.gs`

Potensi pengembangan:

- Kirim email otomatis ke customer saat status berubah (GAS punya `MailApp.sendEmail()`)
- Tambah endpoint statistik (total order per hari, pendapatan per bulan)
- Tambah validasi lebih ketat (cek nomor WA format, cek duplikat order ID)
- Tambah fungsi backup otomatis ke sheet terpisah
- Rate limiting sederhana untuk mencegah spam order

#### `artifacts/jasa-tugas/src/index.css`

Potensi pengembangan:

- Ganti palet warna utama (ubah nilai `--primary` di `:root`)
- Tambah custom font Google Fonts
- Tambah animasi transisi halaman

---

## Google Apps Script — Setup & Kolom Sheets

### Cara Deploy Ulang Setelah Edit Code.gs

1. Buka [script.google.com](https://script.google.com)
2. Buat project baru atau buka project yang sudah ada
3. Copy-paste seluruh isi `google-apps-script/Code.gs`
4. Klik **Deploy → New Deployment**
5. Tipe: **Web App**
6. Execute as: **Me**
7. Who has access: **Anyone**
8. Klik **Deploy** → copy URL yang muncul
9. Paste URL tersebut ke Replit Secrets sebagai `VITE_GAS_URL`

### Struktur Kolom Google Sheets (Sheet: "Orders")

| Kolom  | Nama                | Keterangan                                   |
| ------ | ------------------- | -------------------------------------------- |
| A (1)  | order_id            | ID unik format ORD-timestamp-random          |
| B (2)  | nama                | Nama lengkap customer                        |
| C (3)  | wa                  | Nomor WhatsApp customer                      |
| D (4)  | jenis               | Makalah / PPT / Artikel / Tugas Harian       |
| E (5)  | halaman             | Jumlah halaman/slide/lembar                  |
| F (6)  | deadline            | Deadline dari customer (opsional)            |
| G (7)  | note                | Catatan order dari customer (maks 1000 kar.) |
| H (8)  | status              | Status order saat ini                        |
| I (9)  | tipe_order          | standar / ekspres / super ekspres            |
| J (10) | harga               | Total harga                                  |
| K (11) | dp                  | Nominal DP (default Rp 10.000)               |
| L (12) | sisa_bayar          | Sisa yang harus dibayar                      |
| M (13) | file_tugas_url      | URL file tugas dari customer (tidak dipakai) |

---

## Menjalankan Proyek

### Development (Replit)

Workflow sudah terkonfigurasi. Klik tombol Run atau jalankan:

```
PORT=24771 BASE_PATH=/ pnpm --filter @workspace/jasa-tugas run dev
```

### Build untuk Production

```
pnpm --filter @workspace/jasa-tugas run build
```

### Environment Variables yang Dibutuhkan

| Nama           | Keterangan                            |
| -------------- | ------------------------------------- |
| `VITE_GAS_URL` | URL deployment Google Apps Script     |
| `PORT`         | Port server (default 24771 di Replit) |
| `BASE_PATH`    | Base path URL (default `/`)           |
