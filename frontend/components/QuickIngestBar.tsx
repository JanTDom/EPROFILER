"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, User, ArrowRight, Loader2, Sparkles, Target, ShieldCheck } from "lucide-react";
import { createRecordingFromUrl, sanitizeVideoUrl } from "@/lib/api";
import { getClientProfile, getClientCustomGeminiKey } from "@/lib/profile";
import { PoliticianRelation } from "@/lib/types";

export const QuickIngestBar: React.FC = () => {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [targetPolitician, setTargetPolitician] = useState("");
  const [relation, setRelation] = useState<PoliticianRelation>("sojusznik");
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
        relacja_polityka: relation,
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
        {/* Przełącznik relacji: Sojusznik vs Przeciwnik */}
        <div className="flex items-center p-1 bg-[#070b14] border border-slate-700/80 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setRelation("sojusznik")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              relation === "sojusznik"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Tryb audytu: wzmocnienie kandydata, eliminacja błędów i dyrektywy sztabowe"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sojusznik</span>
          </button>
          <button
            type="button"
            onClick={() => setRelation("przeciwnik")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              relation === "przeciwnik"
                ? "bg-rose-500/25 text-rose-200 border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
            title="Tryb wywiadu ofensywnego: słabości, destabilizacja psychiczna, pytania-pułapki i amunicja spotowa"
          >
            <Target className="w-3.5 h-3.5 text-rose-400" />
            <span>Przeciwnik</span>
          </button>
        </div>

        {/* Pole 1: Link URL */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Link2 className={`w-4 h-4 ${relation === "przeciwnik" ? "text-rose-400" : "text-cyan-400"}`} />
          </div>
          <input
            type="url"
            required
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Wklej link YouTube, wywiad lub debatę (np. https://youtube.com/watch?v=...)"
            className={`w-full pl-10 pr-4 py-3 bg-[#070b14] border rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono transition-all ${
              relation === "przeciwnik"
                ? "border-rose-900/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                : "border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            }`}
          />
        </div>

        {/* Pole 2: Osoba badana (opcjonalnie) */}
        <div className="lg:w-64 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={targetPolitician}
            onChange={(e) => setTargetPolitician(e.target.value)}
            placeholder={relation === "przeciwnik" ? "Oponent (polityk / dziennikarz)" : "Osoba badana (opcjonalnie)"}
            className={`w-full pl-10 pr-4 py-3 bg-[#070b14] border rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono transition-all ${
              relation === "przeciwnik"
                ? "border-rose-900/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                : "border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            }`}
          />
        </div>

        {/* Przycisk akcji */}
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className={`px-5 py-3 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
            relation === "przeciwnik"
              ? "bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)]"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className={`w-4 h-4 animate-spin ${relation === "przeciwnik" ? "text-white" : "text-slate-950"}`} />
              <span>Inicjalizacja...</span>
            </>
          ) : (
            <>
              <span>{relation === "przeciwnik" ? "Namierz wektory" : "Profiluj wideo"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Pasek statusu trybu */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono">
        {relation === "przeciwnik" ? (
          <span className="text-rose-400/90 flex items-center gap-1.5">
            <Target className="w-3 h-3 text-rose-400 animate-pulse" />
            Tryb oponenta: opposition research, destabilizacja psychiczna, pytania-pułapki i amunicja spotowa
          </span>
        ) : (
          <span className="text-emerald-400/90 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Tryb sojusznika: audyt sztabowy, wzmocnienie kandydata i wygaszanie błędów
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 p-2.5 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-xs font-mono">
          [!] {error}
        </div>
      )}
    </div>
  );
};
