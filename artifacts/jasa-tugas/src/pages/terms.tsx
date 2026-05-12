import { Layout } from "@/components/layout";

export default function TermsPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 prose prose-slate">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Syarat & Ketentuan
        </h1>
        <p className="text-slate-500 mb-8">Terakhir diperbarui: Mei 2026</p>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">
            1. Kondisi Penggunaan
          </h2>
          <p className="text-slate-600">
            Tugasly adalah platform jasa pengerjaan tugas akademik yang
            ditawarkan kepada Anda dengan syarat penerimaan ketentuan yang
            tercantum di sini. Dengan menggunakan layanan ini, Anda dianggap
            telah menyetujui seluruh syarat dan ketentuan yang berlaku.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">2. Pemesanan</h2>
          <p className="text-slate-600">
            Anda wajib memberikan informasi yang akurat saat melakukan
            pemesanan, termasuk nama, nomor WhatsApp, jenis tugas, dan deadline.
            Tugasly tidak bertanggung jawab atas kesalahan akibat informasi yang
            tidak akurat dari pelanggan.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">
            3. Kebijakan Refund
          </h2>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            <li>
              Refund 100% jika pesanan dibatalkan sebelum pengerjaan dimulai
            </li>
            <li>
              Refund 50% jika pengerjaan sudah dimulai namun belum selesai
            </li>
            <li>Tidak ada refund jika tugas sudah selesai dikerjakan</li>
            <li>Refund diproses maksimal 3 hari kerja</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">4. Privasi</h2>
          <p className="text-slate-600">
            Informasi pribadi Anda hanya digunakan untuk keperluan pengerjaan
            dan komunikasi terkait pesanan. Tugasly tidak menjual atau
            membagikan data Anda kepada pihak ketiga.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">
            5. Tanggung Jawab
          </h2>
          <p className="text-slate-600">
            Tugasly tidak bertanggung jawab atas penggunaan hasil tugas oleh
            pelanggan. Pelanggan sepenuhnya bertanggung jawab atas penggunaan
            layanan ini sesuai dengan peraturan institusi masing-masing.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">
            6. Perubahan Ketentuan
          </h2>
          <p className="text-slate-600">
            Tugasly berhak mengubah ketentuan ini sewaktu-waktu. Dengan terus
            menggunakan layanan setelah perubahan, Anda dianggap menyetujui
            perubahan tersebut.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">
            7. Hukum yang Berlaku
          </h2>
          <p className="text-slate-600">
            Ketentuan ini diatur oleh hukum yang berlaku di Indonesia.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-700">
            8. Pertanyaan
          </h2>
          <p className="text-slate-600">
            Untuk pertanyaan, hubungi kami melalui WhatsApp yang tertera di
            website.
          </p>
        </section>
      </div>
    </Layout>
  );
}
