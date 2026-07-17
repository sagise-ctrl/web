import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import {
  FileText,
  Presentation,
  FilePenLine,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Star,
  Users,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ClipboardList,
  Download,
  CreditCard,
} from "lucide-react";
import { formatRupiah } from "@/hooks/use-orders";

const LAYANAN = [
  {
    icon: <FileText className="w-8 h-8" />,
    color: "bg-blue-50 text-blue-600",
    nama: "Makalah",
    deskripsi: "Makalah rapi, struktur jelas, referensi aman dipakai.",
    hargaMulai: 30000,
    satuan: "halaman",
    minOrder: 10,
  },
  {
    icon: <Presentation className="w-8 h-8" />,
    color: "bg-orange-50 text-orange-600",
    nama: "Presentasi PPT",
    deskripsi: "PPT yang enak dilihat, tidak membosankan, tetap profesional.",
    hargaMulai: 20000,
    satuan: "slide",
    minOrder: 5,
  },
  {
    icon: <FilePenLine className="w-8 h-8" />,
    color: "bg-green-50 text-green-600",
    nama: "Artikel Ilmiah",
    deskripsi: "Artikel ilmiah yang serius tapi tetap enak dibaca.",
    hargaMulai: 30000,
    satuan: "halaman",
    minOrder: 10,
  },
  {
    icon: <BookOpen className="w-8 h-8" />,
    color: "bg-purple-50 text-purple-600",
    nama: "Tugas Harian",
    deskripsi: "Tugas harian, laporan, atau soal essay dikerjakan tuntas.",
    hargaMulai: 20000,
    satuan: "lembar",
    minOrder: 2,
  },
];

const CARA_KERJA = [
  {
    icon: <ClipboardList className="w-6 h-6" />,
    step: "1",
    judul: "Isi Form Order",
    deskripsi:
      "Pilih jenis tugas, jumlah halaman, dan tipe layanan. Estimasi harga langsung muncul.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    step: "2",
    judul: "Verifikasi & Bayar DP",
    deskripsi: "Admin verifikasi pesanan, lalu kamu bayar DP 33% via QRIS.",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    step: "3",
    judul: "Pengerjaan",
    deskripsi:
      "Tim kami mengerjakan tugas sesuai estimasi waktu yang sudah disepakati.",
  },
  {
    icon: <Download className="w-6 h-6" />,
    step: "4",
    judul: "Terima File",
    deskripsi:
      "Bayar pelunasan, cek file, dan unduh hasilnya. Ada 1x revisi gratis.",
  },
];

const FAQS = [
  {
    q: "Berapa lama pengerjaan tugas?",
    a: "Tergantung jenis dan jumlah halaman. Untuk Makalah 10 halaman standar, estimasi 3 hari. Bisa lebih cepat dengan layanan Ekspres atau Super Ekspres.",
  },
  {
    q: "Apakah ada jaminan revisi?",
    a: "Ya, setiap order mendapat 1x revisi gratis. Jika hasil tidak sesuai, kamu bisa ajukan revisi sebelum menandai order selesai.",
  },
  {
    q: "Bagaimana cara pembayaran?",
    a: "Pembayaran via QRIS yang bisa di-scan dari aplikasi e-wallet atau mobile banking apapun. DP 33% dibayar di awal, sisanya setelah tugas selesai.",
  },
  {
    q: "Apakah data saya aman?",
    a: "Ya, identitas dan detail tugas kamu dijaga kerahasiaannya. Kami tidak menyebarkan informasi apapun ke pihak lain.",
  },
  {
    q: "Apa itu sistem poin?",
    a: "Setiap order senilai Rp 15.000 menghasilkan 1 poin (= Rp 1.000 diskon). Daftar akun User ID gratis dan mulai kumpulkan poin dari setiap order.",
  },
  {
    q: "Bagaimana cara jadi affiliate?",
    a: "Daftar di halaman Affiliate, tunggu verifikasi admin, lalu bagikan kode referral kamu. Dapatkan komisi 30% dari order pertama setiap user yang kamu referensikan.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-slate-800 text-sm">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col gap-16 py-8">
        {/* Hero Section */}
        <section className="flex flex-col md:flex-row items-center gap-10 max-w-5xl mx-auto">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
              <Star className="w-3 h-3" /> Dipercaya ratusan mahasiswa Indonesia
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Fokus belajar aja, <br className="hidden sm:inline" />
              <span className="text-primary">
                tugasnya biar kami yang handle
              </span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Bantuan tugas buat mahasiswa yang pengen tetap santai tapi
              deadline aman. Makalah, PPT, sampai artikel ilmiah, kita kerjain
              rapi dan tepat waktu.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 pt-4 flex-wrap">
              <Link
                href="/order"
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Order Sekarang
              </Link>
              <Link
                href="/track"
                className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Cek Status
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full max-w-md">
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
              <img
                src="/hero-student.png"
                alt="Mahasiswa mengerjakan tugas"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </section>

        {/* Cara Order */}
        <section className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Cara Order
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Proses simpel, hasil maksimal
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {CARA_KERJA.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {item.step}
                </div>
                <h4 className="font-semibold text-slate-800">{item.judul}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {item.deskripsi}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Layanan & Fee */}
        <section className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Layanan & Fee
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Harga transparan, tidak ada biaya tersembunyi
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {LAYANAN.map((l, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-14 h-14 rounded-full ${l.color} flex items-center justify-center`}
                >
                  {l.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{l.nama}</h3>
                  <p className="text-slate-500 text-xs mt-1">{l.deskripsi}</p>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">Mulai dari</p>
                  <p className="text-primary font-bold text-lg">
                    {formatRupiah(l.hargaMulai)}
                  </p>
                  <p className="text-xs text-slate-400">
                    untuk {l.minOrder} {l.satuan}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/order"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Order Sekarang
            </Link>
          </div>
        </section>

        {/* Kenapa Tugasly */}
        <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8">
            Kenapa Tugasly?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex flex-col items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-primary" />
              <h4 className="font-semibold text-lg">Aman & Rahasia</h4>
              <p className="text-slate-400 text-sm">
                Identitas dan data tugas Anda dijamin kerahasiaannya.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Clock className="w-10 h-10 text-primary" />
              <h4 className="font-semibold text-lg">Tepat Waktu</h4>
              <p className="text-slate-400 text-sm">
                Jaminan penyelesaian sesuai dengan deadline yang disepakati.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-primary" />
              <h4 className="font-semibold text-lg">Kualitas Terbaik</h4>
              <p className="text-slate-400 text-sm">
                Dikerjakan oleh tim yang paham bidangnya dengan standar akademik
                yang rapi.
              </p>
            </div>
          </div>
        </section>

        {/* Sistem Poin */}
        <section className="max-w-5xl mx-auto w-full">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-medium">
                  <Star className="w-3 h-3" /> Sistem Poin
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Kumpulkan Poin, Hemat Lebih Banyak
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Setiap order senilai Rp 15.000 menghasilkan{" "}
                  <strong>1 poin</strong> yang bisa ditukar jadi{" "}
                  <strong>Rp 1.000 diskon</strong> di order berikutnya. Semakin
                  sering order, semakin hemat.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/register-user"
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                  >
                    Daftar Akun Gratis
                  </Link>
                  <Link
                    href="/login-user"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-primary text-primary px-6 text-sm font-medium transition-colors hover:bg-primary/5"
                  >
                    Sudah Punya Akun
                  </Link>
                </div>
              </div>
              <div className="flex-shrink-0 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-primary">1 Poin</p>
                  <p className="text-xs text-slate-500 mt-1">
                    per Rp 15.000 order
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold text-green-600">Rp 1.000</p>
                  <p className="text-xs text-slate-500 mt-1">nilai per poin</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-sm col-span-2">
                  <p className="text-lg font-bold text-slate-800">
                    Gratis selamanya
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    tidak ada biaya pendaftaran
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Jadi Affiliate */}
        <section className="max-w-5xl mx-auto w-full">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                  <Users className="w-3 h-3" /> Program Affiliate
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Dapat Komisi dari Setiap Referral
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Bagikan kode referral kamu ke teman-temanmu. Setiap kali
                  mereka order, kamu dapat komisi hingga <strong>30%</strong>{" "}
                  dari nilai order, berlaku sampai order ke-10 per user. Semakin
                  banyak teman yang kamu ajak, semakin besar total komisi yang
                  kamu kumpulkan, tidak ada batas jumlah user yang bisa kamu
                  referensikan.
                </p>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: "Order ke-1", value: "30%" },
                    { label: "Order ke-5", value: "18%" },
                    { label: "Order ke-10", value: "3%" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl p-3 text-center shadow-sm"
                    >
                      <p className="text-lg font-bold text-green-600">
                        {item.value}
                      </p>
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register-affiliate"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white px-6 text-sm font-medium shadow transition-colors mt-2"
                >
                  Daftar Affiliate Sekarang
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Pertanyaan Umum
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Ada yang ingin ditanyakan?
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
