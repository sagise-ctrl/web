# TODO - Perubahan Kalkulasi Harga Server-Side

- [x] Tambahkan fungsi kalkulasi harga di bagian atas `google-apps-script/Code.gs` (setelah konstanta, sebelum fungsi pertama).
- [x] Di `handleCreateOrder`, ganti seluruh logika kalkulasi harga/dp/sisa_bayar dengan kalkulasi server-side seperti instruksi.
- [x] Di `sheet.appendRow`, pastikan kolom `poin_dipakai` dan `kategori_order` memakai variabel server-side (`poinDipakai`, `kategoriOrder`).
- [ ] Verifikasi tidak ada variabel/label yang tertinggal dari implementasi lama (mis. `order_id` harus didefinisikan).
