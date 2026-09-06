"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserNav } from "@/components/UserNav";
import { Eye } from "lucide-react";

export const AppHeader: React.FC = () => {
  const pathname = usePathname();

  // Całkowicie ukryj górne menu na ekranie logowania - dostęp wyłącznie przez hasło!
  if (pathname?.startsWith("/login")) {
    return null;
  }

  return (
    <header className="bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 lg:gap-8 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(0,240,255,0.35)] border border-cyan-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
              <Image
                src="/logo.png"
                alt="E-PROFILER"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col whitespace-nowrap flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-base font-black tracking-widest text-white leading-none">
                  E-PROFILER
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 rounded">
                  AI 3.6
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 hidden xl:inline">
                Multimodal forensic intelligence
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-4 lg:gap-6 text-xs font-mono font-medium text-slate-400 whitespace-nowrap flex-shrink-0">
            <Link
              href="/"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              <span className="text-slate-600">//</span> Repozytorium
            </Link>
            <Link
              href="/duel"
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-amber-300/90 font-bold whitespace-nowrap flex-shrink-0"
            >
              <span className="text-slate-600">//</span> Pojedynek 1-na-1
            </Link>
            <Link
              href="/help"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
            >
              <span className="text-slate-600">//</span> Pomoc
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0 whitespace-nowrap">
          {/* Telemetria statusu */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded text-[11px] font-mono text-slate-300 whitespace-nowrap flex-shrink-0">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping flex-shrink-0" />
            <span className="whitespace-nowrap">Silnik online</span>
          </div>

          {/* Status profilu i przycisk wylogowania */}
          <UserNav />

          <Link
            href="/recordings/new"
            className="relative group px-3.5 sm:px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wider transition-all rounded shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center gap-2 whitespace-nowrap flex-shrink-0"
          >
            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">+ Nowa analiza</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
