# Jasa Tugas

Platform pemesanan jasa tugas akademik untuk mahasiswa Indonesia — order makalah, PPT, dan artikel ilmiah dengan tracking status real-time.

## Run & Operate

- `pnpm --filter @workspace/jasa-tugas run dev` — jalankan frontend (port dari env PORT)
- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 5000, tidak dipakai aktif)
- `pnpm run typecheck` — full typecheck semua package
- `pnpm run build` — typecheck + build semua package

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Routing: wouter
- Forms: react-hook-form + zod
- Data fetching: TanStack Query
- Backend: Google Apps Script + Google Sheets (eksternal)

## Where things live

- `artifacts/jasa-tugas/src/pages/` — halaman utama (home, order, track, admin)
- `artifacts/jasa-tugas/src/hooks/use-orders.ts` — semua fungsi API call ke Google Apps Script
- `artifacts/jasa-tugas/src/components/layout.tsx` — navbar, footer, warning banner
- `google-apps-script/Code.gs` — kode backend Google Apps Script (deploy manual ke GAS)
- `VITE_GAS_URL` — env var untuk URL Google Apps Script (diisi setelah deploy GAS)

## Architecture decisions

- Backend eksternal via Google Apps Script — tidak perlu server/database Replit, data tersimpan di Google Sheets
- Semua API call menggunakan raw `fetch` (bukan Orval hooks) karena endpoint eksternal
- Admin auth disederhanakan dengan password lokal (hardcoded "admin123") — cukup untuk MVP
- VITE_GAS_URL sebagai env var agar URL GAS bisa diganti tanpa rebuild

## Product

- `/` — Landing page dengan CTA
- `/order` — Form pemesanan tugas (nama, WA, jenis, halaman, deadline, catatan)
- `/track` — Cek status order berdasarkan order_id
- `/admin` — Dashboard admin untuk lihat semua order dan update status (password: admin123)

## User preferences

- Bahasa Indonesia di seluruh UI
- Fokus MVP: order, track, admin — tanpa payment/upload file

## Gotchas

- Sebelum app bisa dipakai end-to-end, HARUS deploy Google Apps Script dulu dan isi `VITE_GAS_URL`
- Google Apps Script harus di-deploy dengan akses "Anyone" agar bisa diakses dari browser
- CORS di GAS sudah ditangani otomatis oleh ContentService
- Setelah ganti `VITE_GAS_URL`, restart workflow frontend agar env var terbaca

## Setup Google Apps Script (Langkah-langkah)

1. Buka https://script.google.com → buat project baru
2. Copy paste isi `google-apps-script/Code.gs`
3. Ganti `SPREADSHEET_ID` dengan ID Google Sheets kamu
4. Klik **Deploy** → **New deployment** → tipe: **Web app**
5. Execute as: **Me**, Who has access: **Anyone**
6. Klik **Deploy**, copy URL-nya
7. Di Replit: buka **Secrets/Env vars** → set `VITE_GAS_URL` = URL tersebut
8. Restart workflow frontend
