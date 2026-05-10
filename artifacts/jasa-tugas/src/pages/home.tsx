import React from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  FileText,
  Presentation,
  FilePenLine,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col gap-16 py-8">
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Fokus belajar aja, <br className="hidden sm:inline" />
            <span className="text-primary">tugasnya biar kami yang handle</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Bantuan tugas buat mahasiswa yang pengen tetap santai tapi deadline aman. Makalah, PPT, sampai artikel ilmiah, kita kerjain rapi dan tepat waktu.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/order"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Order Sekarang
            </Link>
            <Link
              href="/track"
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Cek Status
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Makalah</h3>
            <p className="text-slate-600 text-sm">
              Makalah rapi, struktur jelas, referensi aman dipakai.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mb-2">
              <Presentation className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Presentasi PPT</h3>
            <p className="text-slate-600 text-sm">
              PPT yang enak dilihat, nggak ngebosenin, tapi tetap profesional.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 mb-2">
              <FilePenLine className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Artikel Ilmiah</h3>
            <p className="text-slate-600 text-sm">
              Artikel ilmiah yang serius tapi tetap enak dibaca, bukan asal jadi.
            </p>
          </div>
        </section>

        <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center my-8">
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
      </div>
    </Layout>
  );
}
