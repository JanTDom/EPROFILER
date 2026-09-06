"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { LegalNotice } from "@/components/LegalNotice";

export const AppFooter: React.FC = () => {
  const pathname = usePathname();

  // Całkowicie ukryj stopkę na ekranie logowania - czysty, skupiony ekran autoryzacji
  if (pathname?.startsWith("/login")) {
    return null;
  }

  return (
    <footer className="bg-[#0b0f19] border-t border-slate-800/80 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <LegalNotice compact />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-900">
          <span>
            E-PROFILER LABS © 2026 // © Copyright by{" "}
            <a
              href="https://multinewsroom.pl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
            >
              Multinewsroom (multinewsroom.pl)
            </a>
          </span>
          <span className="text-cyan-500/80">NEURAL CORE AI • EKMAN FACS • PRAAT DSP • WHISPERX</span>
        </div>
      </div>
    </footer>
  );
};
