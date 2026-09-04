"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, User, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { createRecordingFromUrl, sanitizeVideoUrl } from "@/lib/api";
import { getClientProfile, getClientCustomGeminiKey } from "@/lib/profile";

export const QuickIngestBar: React.FC = () => {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [targetPolitician, setTargetPolitician] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const activeProfile = getClientProfile();
      const customKey = getClientCustomGeminiKey() || undefined;
      const cleanUrl = sanitizeVideoUrl(url);

      const rec = await createRecordingFromUrl({
        url: cleanUrl,
        polityk_docelowy: targetPolitician.trim() || undefined,
        rola_polityka: "Badany polityk",
        typ_nagrania: "wywiad",
        zakres_analizy: "pelny",
        tryb_biometryczny: true,
        profile_id: activeProfile,
        gemini_api_key: customKey,
      });

      // Natychmiastowe przejście do podglądu nagrania
      window.location.href = `/recordings/${rec.id}`;
    } catch (err: any) {
      setError(err?.message || "Nie udało się rozpocząć analizy. Sprawdź format linku.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#0d1322]/90 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(0,240,255,0.15)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            Błyskawiczne profilowanie wideo
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          System sam rozpozna polityka z rozmowy, jeśli nie wpiszesz nazwiska
        </span>
      </div>

      <form onSubmit={handleQuickSubmit} className="flex flex-col lg:flex-row items-stretch gap-3">
        {/* Pole 1: Link URL */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Link2 className="w-4 h-4 text-cyan-400" />
          </div>
          <input
            type="url"
            required
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Wklej link YouTube, wywiad lub debatę (np. https://youtube.com/watch?v=...)"
            className="w-full pl-10 pr-4 py-3 bg-[#070b14] border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all"
          />
        </div>

        {/* Pole 2: Osoba badana (opcjonalnie) */}
        <div className="lg:w-72 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={targetPolitician}
            onChange={(e) => setTargetPolitician(e.target.value)}
            placeholder="Osoba badana (opcjonalnie)"
            className="w-full pl-10 pr-4 py-3 bg-[#070b14] border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 font-mono transition-all"
          />
        </div>

        {/* Przycisk akcji */}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Inicjalizacja...</span>
            </>
          ) : (
            <>
              <span>Profiluj wideo</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 p-2.5 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-xs font-mono">
          [!] {error}
        </div>
      )}
    </div>
  );
};
