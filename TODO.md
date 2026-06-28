# TODO

## Task

Ubah `handleUpdatePaymentStatus` di `google-apps-script/Code.gs`:

- Cari dua pemanggilan `sendAdminNotification`.
- Di dalam object `data` yang dikirim (parameter ketiga), ganti semua:
  - `javascriptorder_id: String(order_id)`
    menjadi
  - `javascriptorder_id: String(data.order_id)`
- Harus diubah di dua tempat: blok `data.tipe === "dp"` dan blok `data.tipe === "final"`.
- Jangan ubah bagian lain.

## Plan steps

1. Verifikasi isi `handleUpdatePaymentStatus` dan kedua pemanggilan `sendAdminNotification`.
2. Edit `google-apps-script/Code.gs` mengganti field yang diminta di kedua blok.
3. Jalankan quick sanity check (search hasil perubahan) untuk memastikan hanya target yang berubah.
4. Selesaikan dengan ringkasan perubahan.
