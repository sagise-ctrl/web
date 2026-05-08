import React from "react";
import { Link } from "wouter";
import { BookOpen } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-xl transition-opacity hover:opacity-80">
            <BookOpen className="w-6 h-6" />
            <span>Jasa Tugas</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Beranda</Link>
            <Link href="/order" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Order Baru</Link>
            <Link href="/track" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Cek Status</Link>
          </nav>
        </div>
      </header>
      
      {!import.meta.env.VITE_GAS_URL && (
        <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-800 px-4 py-3 text-sm text-center">
          <strong>Perhatian:</strong> Konfigurasi <code>VITE_GAS_URL</code> belum diatur. Aplikasi tidak dapat terhubung ke backend.
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Jasa Tugas. Platform terpercaya mahasiswa Indonesia.</p>
        <div className="mt-4 flex justify-center gap-4">
          <Link href="/admin" className="hover:text-white transition-colors">Admin Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
