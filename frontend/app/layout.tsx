import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LegalNotice } from "@/components/LegalNotice";

export const metadata: Metadata = {
  title: "DYSKURS — System Analizy Wypowiedzi Publicznych",
  description: "Aplikacja do obiektywnej analizy retoryki, unikania odpowiedzi i prozodii w wypowiedziach polityków.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        {/* Pasek nawigacji */}
        <header className="bg-white border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <span className="font-mono text-base font-black tracking-wider text-slate-950">
                  DYSKURS
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200">
                  v1.0 Faza 1
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Przegląd nagrań
                </Link>
                <Link href="/recordings/new" className="hover:text-slate-900 transition-colors">
                  Nowa analiza
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/recordings/new"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
              >
                + Dodaj materiał
              </Link>
            </div>
          </div>
        </header>

        {/* Zawartość strony */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Stopka */}
        <footer className="bg-white border-t border-border py-4 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <LegalNotice compact />
            <div className="mt-2 text-center text-[11px] text-slate-400 font-mono">
              DYSKURS © 2026 — Rygorystyczna analiza dyskursu publicznego.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
