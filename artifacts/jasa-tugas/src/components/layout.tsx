import React from "react";
import { Link } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl transition-opacity hover:opacity-80"
          >
            <img src="/favicon.svg" alt="Tugasly" className="w-7 h-7" />
            <span className="text-primary">Tugasly</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
            >
              Beranda
            </Link>
            <Link
              href="/order"
              className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
            >
              Order Baru
            </Link>
            <Link
              href="/track"
              className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
            >
              Cek Status
            </Link>
            <Link
              href="/akun"
              className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
            >
              Akun
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} Tugasly. Platform terpercaya
          mahasiswa Indonesia.
        </p>
        <p className="mt-2">
          <Link href="/terms" className="hover:text-white transition-colors">
            Syarat & Ketentuan
          </Link>
        </p>
      </footer>
      <a
        className="fixed bottom-6 right-6 z-50"
        href={`https://wa.me/62881012465621?text=${encodeURIComponent("Halo Tugasly, saya ingin bertanya")}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
          alt="WA"
          className="w-14 h-14"
        />
      </a>
    </div>
  );
}
