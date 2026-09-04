import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { LegalNotice } from "@/components/LegalNotice";
import { Eye, Shield, Radio, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "PROFILER — Forensic Video & Speech Intelligence System",
  description: "Zaawansowana analiza wideo, intencji, mikroekspresji FACS, mowy ciała i perswazji osób publicznych w prostym języku.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className="dark">
      <body className="min-h-screen bg-[#080a0f] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
        {/* Pasek nawigacji HUD */}
        <header className="bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.35)] border border-cyan-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                  <Image
                    src="/logo.png"
                    alt="PROFILER"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-base font-black tracking-widest text-white leading-none">
                      PROFILER
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                      AI 3.6
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
                    MULTIMODAL FORENSIC INTELLIGENCE
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-medium text-slate-400">
                <Link
                  href="/"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-slate-600">//</span> REPOZYTORIUM
                </Link>
                <Link
                  href="/recordings/new"
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-slate-600">//</span> NOWA ANALIZA
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {/* Telemetria statusu */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded text-[11px] font-mono text-slate-300">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                <span>SILNIK ONLINE</span>
              </div>

              <Link
                href="/recordings/new"
                className="relative group px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all rounded shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center gap-2"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>+ Profiluj wideo</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Główna przestrzeń robocza */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Stopka */}
        <footer className="bg-[#0b0f19] border-t border-slate-800/80 py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <LegalNotice compact />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-900">
              <span>PROFILER LABS © 2026 // SYSTEM PROFILOWANIA BEHAWIORALNEGO I DYSKURSU</span>
              <span className="text-cyan-500/80">GEMINI 3.6 FLASH • EKMAN FACS • PRAAT DSP • WHISPERX</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
