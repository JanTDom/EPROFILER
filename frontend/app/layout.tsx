import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LegalNotice } from "@/components/LegalNotice";
import { Eye, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "PROFILER — Multimodalna Analiza Wypowiedzi i Mowy Ciała",
  description: "Zaawansowany system badania dyskursu, mikroekspresji, intencji i emocji osób publicznych opisany w prostym języku.",
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
                <div className="w-7 h-7 bg-slate-950 text-white flex items-center justify-center font-mono font-black text-sm rounded">
                  P
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-black tracking-wider text-slate-950 leading-none">
                    PROFILER
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono tracking-tight">
                    INTELLIGENCE STUDIO
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Baza nagrań
                </Link>
                <Link href="/recordings/new" className="hover:text-slate-900 transition-colors">
                  Nowe profilowanie
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/recordings/new"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5 rounded-sm"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                + Profiluj wideo
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
              PROFILER © 2026 — Multimodal Behavioral Intelligence & Speech Analysis.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
