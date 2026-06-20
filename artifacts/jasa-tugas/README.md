# Jasa Tugas — Dokumentasi Lengkap Proyek

Dokumentasi ini menjelaskan end-to-end proses pemesanan jasa tugas akademik untuk customer, termasuk detail status order, struktur data di Google Sheets, aturan transisi, hook & API action yang dipanggil, serta fitur tiap halaman.

---

## 1) Gambaran Umum Project

### Nama Project

**Jasa Tugas**

### Tujuan

Menyediakan platform pemesanan dan pengerjaan tugas akademik dengan alur status yang transparan bagi customer, serta kontrol terpusat oleh admin.

### Tech Stack

| Layer                          | Teknologi                                                  |
| ------------------------------ | ---------------------------------------------------------- |
| Frontend                       | React 18 + TypeScript (Vite)                               |
| UI                             | Tailwind CSS v4 + shadcn/ui (Radix UI)                     |
| Form & Validasi                | react-hook-form + Zod                                      |
| Data Fetching                  | TanStack React Query v5                                    |
| Routing                        | wouter                                                     |
| Backend                        | Google Apps Script (GAS) sebagai Web App                   |
| Database                       | Google Sheets                                              |
| File Storage                   | Google Drive                                               |
| Proxy/Payment API (serverless) | Vercel Serverless Functions (proxy, webhook, payment link) |

---

## 2) Alur Lengkap dari User sampai Selesai (Step-by-step)

Semua status order tersimpan di Google Sheets kolom `status`.

### Daftar status order (internal)

| Status (`status`)        | Label UI (kurang lebih) | Keterangan singkat                                               |
| ------------------------ | ----------------------- | ---------------------------------------------------------------- |
| `verifikasi tugas`       | Menunggu Verifikasi     | Order dibuat, menunggu admin verifikasi                          |
| `menunggu pembayaran dp` | Menunggu Pembayaran DP  | Menunggu pembayaran DP (33%)                                     |
| `proses pengerjaan`      | Sedang Dikerjakan       | DP sudah paid, admin mengerjakan                                 |
| `menunggu pelunasan`     | Menunggu Pelunasan      | Hasil pertama sudah diupload, menunggu pelunasan                 |
| `pelunasan diterima`     | Pelunasan Diterima      | Pelunasan paid (gateway webhook), file siap menuju cek           |
| `cek file`               | Cek File                | Customer mengunduh & konfirmasi / ajukan revisi                  |
| `revisi`                 | Sedang Direvisi         | Customer mengajukan revisi (maks 1x gratis), admin upload revisi |
| `selesai`                | Selesai                 | Final state                                                      |

### Aturan transisi status: siapa memicu apa

> Rujukan implementasi utama ada di `google-apps-script/Code.gs` dan UI di `src/pages/*`.

#### (A) Customer: membuat order

1. Customer membuka halaman **`/order`**.
2. Customer mengisi data diri & detail tugas.
3. Customer mengirim order.

**Request frontend → GAS**

- `useCreateOrder()` memanggil serverless proxy publik (`/api/proxy`), lalu menuju GAS:
  - `POST` dengan payload: `{ action: 'createOrder', data }`

**Backend (GAS) menyimpan order**

- Membuat `order_id` baru.
- Menghitung `dp` dan `sisa_bayar` dari `harga`.
- Menulis baris baru ke Sheets dengan `status = 'verifikasi tugas'`.

**Transisi**

- (awal) → `verifikasi tugas`

**Dipicu oleh:** Customer → GAS (`createOrder`)

#### (B) Admin: verifikasi order dan meminta DP

1. Admin login ke halaman **`/admin`**.
2. Admin mencari order status `verifikasi tugas`.
3. Admin menekan tombol **“Verifikasi & Minta DP”**.

**Request frontend (admin) → GAS (admin proxy)**

- `useUpdateOrder()` memanggil `/api/admin/proxy` dengan action:
  - `POST` `{ action: 'updateStatus', order_id, status, estimasi_selesai }`

**Backend (GAS)**

- `handleUpdateStatus(order_id, status, estimasi_selesai)`
- Memvalidasi `status` terhadap `VALID_STATUSES`.
- Jika status yang di-set adalah `proses pengerjaan`, dan ada `estimasi_selesai`, maka kolom estimasi diset.

**Transisi**

- `verifikasi tugas` → `menunggu pembayaran dp`

**Dipicu oleh:** Admin → GAS (`updateStatus`)

#### (C) Customer: bayar DP (QRIS otomatis via Mayar)

1. Customer membuka **`/track?id=ORDER_ID`**.
2. Jika `order.status === 'menunggu pembayaran dp'`, UI menampilkan tombol **“Bayar DP”**.
3. Tombol memanggil endpoint pembayaran QRIS via serverless (Mayar otomatis).
4. Gateway Mayar mengembalikan event pembayaran via webhook serverless.
5. Serverless webhook meneruskan update ke GAS.

**Request serverless webhook → GAS**

- `POST` `{ action: 'updatePaymentStatus', data: { order_id, tipe, mayar_transaction_id } }`

**Catatan:** Di `google-apps-script/Code.gs`, handler `doPost` memproses `updatePaymentStatus` melalui `handleUpdatePaymentStatus`.

**Transisi**

- `menunggu pembayaran dp` → `proses pengerjaan`

**Dipicu oleh:** Webhook Mayar (serverless) → GAS (`updatePaymentStatus`)

> Selain itu, saat `tipe === 'dp'`, GAS menghitung `estimasi_selesai` berdasarkan `jenis`, `halaman`, `tipe_order` lalu mengisi:

- `estimasi_selesai`
- `payment_dp_id`
- `snap_token` di-clear

#### (D) Admin: upload hasil pertama (minta pelunasan)

1. Ketika status `proses pengerjaan`, admin mengerjakan tugas.
2. Setelah tugas selesai (hasil pertama), admin membuka tombol **“Upload Hasil & Minta Pelunasan”**.
3. Admin upload file.

**Request frontend (admin) → GAS**

- `useUploadBukti()` dengan `tipe: 'hasil'`.
- `POST` action: `uploadFile`.

**Backend (GAS upload)**

- Menulis URL ke kolom `hasil_url`.
- Jika `currentStatus === 'proses pengerjaan'` maka mengubah status menjadi `menunggu pelunasan`.

**Transisi**

- `proses pengerjaan` → `menunggu pelunasan`

**Dipicu oleh:** Admin → GAS (`uploadFile`)

#### (E) Customer: bayar pelunasan (final) (QRIS otomatis via Mayar)

1. Customer melihat status `menunggu pelunasan` pada **`/track`**.
2. Customer menekan tombol **“Bayar Pelunasan”**.
3. Gateway Mayar memproses pembayaran via QRIS.
4. Pembayaran sukses → webhook serverless → update ke GAS.

**Transisi**

- `menunggu pelunasan` → `cek file`

**Dipicu oleh:** Webhook Mayar → GAS (`updatePaymentStatus`)

#### (F) Customer: cek file, lalu konfirmasi selesai atau revisi

Pada status `cek file`, customer dapat:

- Unduh `hasil_url`.
- Menekan tombol **“Selesai, Terima Hasil”**.
- Menekan tombol **“Ajukan Revisi (Gratis 1x)”**.

**Transisi 1 (selesai)**

- `cek file` → `selesai`

**Dipicu oleh:** Customer → GAS (`markSelesai`)

**Transisi 2 (revisi)**

- `cek file` → `revisi`

**Dipicu oleh:** Customer → GAS (`submitRevisi`)

Pada `submitRevisi`:

- Validasi `revisi_count < 1` (maks 1 kali gratis)
- Menulis `revisi_catatan`, `revisi_file_urls`
- Menulis `revisi_count += 1`
- Menulis `estimasi_revisi = now + 12 jam`

#### (G) Admin: upload hasil revisi

Saat status `revisi`, admin upload hasil revisi melalui tombol **“Upload Hasil Revisi”**.

**Transisi**

- `revisi` → `cek file`

**Dipicu oleh:** Admin → GAS (`uploadFile` tipe `hasil`)

> Jika status saat upload adalah `revisi`, GAS mengubah status menjadi `cek file`.

---

## 3) Struktur File & Folder (plus relasi panggilan)

### 3.1 Frontend (React/Vite)

**Root:** `artifacts/jasa-tugas/`

| Path                           | Fungsi                                              |
| ------------------------------ | --------------------------------------------------- |
| `src/main.tsx`                 | Entry point + QueryClientProvider                   |
| `src/App.tsx`                  | Router (`wouter`)                                   |
| `src/pages/home.tsx`           | Halaman landing                                     |
| `src/pages/order.tsx`          | Form order multi-step + pricing preview             |
| `src/pages/track.tsx`          | Tracking status + pembayaran + revisi + unduh hasil |
| `src/pages/admin.tsx`          | Login admin + dashboard daftar order                |
| `src/pages/payment-finish.tsx` | (jika dipakai) halaman selesai payment              |
| `src/pages/terms.tsx`          | halaman Terms                                       |
| `src/pages/not-found.tsx`      | 404                                                 |
| `src/hooks/use-orders.ts`      | **Core**: hook API + pricing/estimasi helper        |
| `src/components/layout.tsx`    | Layout UI                                           |

### 3.2 GAS Backend

**Root:** `google-apps-script/Code.gs`

Berisi semua handler:

- `doGet(e)`
- `doPost(e)`
- fungsi-fungsi `handleCreateOrder`, `handleUpdateStatus`, `handleUploadFile`, dll.

### 3.3 Relasi pemanggilan utama (siapa memanggil siapa)

| Caller             | Target              | Action/Endpoint                                         |
| ------------------ | ------------------- | ------------------------------------------------------- |
| `order.tsx`        | `useCreateOrder()`  | Serverless proxy → GAS `doPost` `action=createOrder`    |
| `order.tsx`        | `useCheckWa()`      | Proxy → GAS `doGet` `action=checkWa`                    |
| `admin.tsx`        | `useUpdateOrder()`  | Admin proxy → GAS `doPost` `action=updateStatus`        |
| `admin.tsx`        | `useUploadBukti()`  | Admin/Customer proxy → GAS `doPost` `action=uploadFile` |
| `track.tsx`        | `useGetOrder()`     | Proxy → GAS `doGet` `action=getOrder`                   |
| `track.tsx`        | `useMarkSelesai()`  | Proxy → GAS `doPost` `action=markSelesai`               |
| `track.tsx`        | `useSubmitRevisi()` | Proxy → GAS `doPost` `action=submitRevisi`              |
| serverless webhook | GAS `doPost`        | `action=updatePaymentStatus`                            |

---

## 4) Struktur Data

### 4.1 Field `Order` (Frontend type)

Sumber: `artifacts/jasa-tugas/src/hooks/use-orders.ts`

| Field               | Tipe data     | Keterangan                            |
| ------------------- | ------------- | ------------------------------------- |
| `order_id`          | `string`      | ID unik order (`ORD-...`)             |
| `nama`              | `string`      | Nama customer                         |
| `wa`                | `string`      | WhatsApp customer                     |
| `jenis`             | `JenisTugas`  | Makalah/PPT/Artikel/Tugas Harian/Test |
| `halaman`           | `number`      | Jumlah halaman/slide/lembar           |
| `deadline?`         | `string`      | opsional                              |
| `note`              | `string`      | Catatan order                         |
| `status`            | `OrderStatus` | status internal                       |
| `tipe_order?`       | `TipeOrder`   | standar/ekspres/super ekspres         |
| `harga?`            | `number`      | total harga                           |
| `dp?`               | `number`      | nominal DP                            |
| `sisa_bayar?`       | `number`      | sisa bayar                            |
| `file_tugas_url?`   | `string`      | URL file pendukung (opsional)         |
| `hasil_url?`        | `string`      | URL hasil tugas admin                 |
| `created_at?`       | `string`      | ISO time                              |
| `revisi_catatan?`   | `string`      | catatan revisi                        |
| `revisi_file_urls?` | `string`      | URL revisi (dipisah koma)             |
| `revisi_count?`     | `number`      | jumlah revisi dipakai (maks 1 gratis) |
| `estimasi_selesai?` | `string`      | ISO estimasi selesai                  |
| `estimasi_revisi?`  | `string`      | ISO estimasi revisi selesai           |
| `payment_dp_id?`    | `string`      | transaksi DP                          |
| `payment_final_id?` | `string`      | transaksi pelunasan                   |

### 4.2 Struktur Kolom Google Sheets (Orders)

Sumber: `google-apps-script/Code.gs` (`COLUMNS` + `appendRow`).

Urutan kolom sesuai `COLUMNS` (23 kolom A sampai W). Tidak ada `bukti_dp_url` dan `bukti_pelunasan_url`.

| Urutan | Kolom | Field            |
| -----: | :---: | ---------------- |
|      1 |   A   | order_id         |
|      2 |   B   | nama             |
|      3 |   C   | wa               |
|      4 |   D   | jenis            |
|      5 |   E   | halaman          |
|      6 |   F   | deadline         |
|      7 |   G   | note             |
|      8 |   H   | status           |
|      9 |   I   | tipe_order       |
|     10 |   J   | harga            |
|     11 |   K   | dp               |
|     12 |   L   | sisa_bayar       |
|     13 |   M   | file_tugas_url   |
|     14 |   N   | hasil_url        |
|     15 |   O   | created_at       |
|     16 |   P   | revisi_catatan   |
|     17 |   Q   | revisi_file_urls |
|     18 |   R   | revisi_count     |
|     19 |   S   | estimasi_selesai |
|     20 |   T   | estimasi_revisi  |
|     21 |   U   | snap_token       |
|     22 |   V   | payment_dp_id    |
|     23 |   W   | payment_final_id |

---

## 5) Logika Bisnis Penting

### 5.1 Rumus kalkulasi harga & biaya tambahan

Sumber: `artifacts/jasa-tugas/src/hooks/use-orders.ts`

#### `hitungHarga(jenis, halaman)`

| Jenis                 | Rumus                                   |
| --------------------- | --------------------------------------- |
| `Makalah` / `Artikel` | `30000 + ceil((halaman - 10)/5) * 5000` |
| `PPT`                 | `20000 + max(0, halaman - 5) * 3000`    |
| `Tugas Harian`        | `20000 + max(0, halaman - 2) * 4000`    |
| `Test`                | `5000`                                  |

#### `biayaTambahan(tipe_order)`

| tipe_order      | Tambahan |
| --------------- | -------: |
| `standar`       |        0 |
| `ekspres`       |     7000 |
| `super ekspres` |    15000 |

### 5.2 Rumus DP dan sisa bayar

DP:

- **DP = 33% dari total harga (Math.ceil(harga \* 0.33))**

Sisa bayar:

- `sisa_bayar = harga - dp`

### 5.3 Rumus estimasi selesai

Ketika `tipe === 'dp'` dan status awal valid `menunggu pembayaran dp`, dihitung berdasarkan `jenis` dan `halaman`, lalu dikoreksi berdasarkan `tipe_order`.

---

## 6) API & Hooks

### 6.1 GAS actions (doGet & doPost)

Sumber: `google-apps-script/Code.gs`.

---

## API Endpoints (Vercel)

> Bagian ini khusus endpoint Vercel.

Base: `POST /api/payment/*`

### POST /api/payment/create

- Membuat payment link Mayar.
- Input: `order_id, nama, wa, harga, jenis, tipe`.
- Output: `payment_link, transaction_id`.

### POST /api/payment/qris

- Mengambil QR string dari Mayar via GraphQL.
- Input: `transaction_id`.
- Output: `qr_string, expires_at`.

### Environment variable

- `MAYAR_API_KEY`

---

## 7) Fitur per Halaman

### 7.1 order.tsx (customer)

Customer:

- Buat order via `useCreateOrder()`
- (opsional) upload file pendukung via `useUploadBukti()` dengan `tipe='file_tugas'`
- Menampilkan ringkasan harga dan DP (33%)

### 7.2 track.tsx (customer)

- `menunggu pembayaran dp` → tombol **Bayar DP** (QRIS otomatis via Mayar)
- `menunggu pelunasan` → tombol **Bayar Pelunasan** (QRIS otomatis via Mayar)
- `cek file` → unduh `hasil_url`, selesai atau ajukan revisi

### 7.3 admin.tsx (admin)

- Verifikasi order
- Upload hasil pertama untuk memicu pelunasan
- Upload hasil revisi

---

## 8) Catatan Teknis

- Status order adalah sumber kebenaran: kolom `status` di Sheets.

---

## Lampiran: Lokasi kode terkait

| Konsep                        | Lokasi                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Validasi status & handler GAS | `google-apps-script/Code.gs`                                                             |
| Type `Order` dan hook API     | `artifacts/jasa-tugas/src/hooks/use-orders.ts`                                           |
| UI order form                 | `artifacts/jasa-tugas/src/pages/order.tsx`                                               |
| UI tracking & revisi          | `artifacts/jasa-tugas/src/pages/track.tsx`                                               |
| UI admin & aksi per status    | `artifacts/jasa-tugas/src/pages/admin.tsx`                                               |
| Proxy publik/admin            | `artifacts/jasa-tugas/api/proxy.ts`, `artifacts/jasa-tugas/api/admin/proxy.ts`           |
| Payment link & QRIS           | `artifacts/jasa-tugas/api/payment/create.ts`, `artifacts/jasa-tugas/api/payment/qris.ts` |
| Webhook payment               | `artifacts/jasa-tugas/api/webhook.ts`                                                    |
| Auth admin                    | `artifacts/jasa-tugas/api/auth/login.ts`                                                 |
