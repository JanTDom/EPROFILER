"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Swords,
  ArrowLeft,
  Award,
  ShieldAlert,
  Flame,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  User,
  Activity,
  Zap,
  TrendingUp,
  BrainCircuit,
  Scale,
} from "lucide-react";
import { fetchRecordings } from "@/lib/api";
import { Recording } from "@/lib/types";

interface DuelCategory {
  zwyciezca: "A" | "B";
  ocena_a_1_10: number;
  ocena_b_1_10: number;
  uzasadnienie: string;
}

interface DuelResult {
  zwyciezca_starcia: "KANDYDAT_A" | "KANDYDAT_B" | "REMIS_ZE_WSKAZANIEM_NA_A" | "REMIS_ZE_WSKAZANIEM_NA_B";
  nazwa_zwyciezcy: string;
  przewaga_procentowa_a: number;
  przewaga_procentowa_b: number;
  tytul_pojedynku: string;
  podsumowanie_starcia: string;
  kluczowy_moment_przelamania: string;
  kategorie: {
    opanowanie_emocjonalne: DuelCategory;
    sila_argumentacji: DuelCategory;
    kontrola_narracji: DuelCategory;
    odpornosc_na_presje: DuelCategory;
  };
  rekomendacja_dla_sztabu_a: string;
  rekomendacja_dla_sztabu_b: string;
}

interface DuelCandidateData {
  id: string;
  name: string;
  title: string;
  score: number;
  verdict: string;
  hits: any[];
  blunders: any[];
  lapses: any[];
}

function DuelContent() {
  const searchParams = useSearchParams();
  const preselectedA = searchParams.get("candidateA");

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [selectedIdA, setSelectedIdA] = useState<string>(preselectedA || "");
  const [selectedIdB, setSelectedIdB] = useState<string>("");

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [duelData, setDuelData] = useState<{
    duel: DuelResult;
    candidateA: DuelCandidateData;
    candidateB: DuelCandidateData;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoadingRecordings(true);
        const data = await fetchRecordings();
        // Filtrujemy nagrania, które mają psychometric_profile
        const withProfile = data.filter((r) => r.psychometric_profile);
        setRecordings(withProfile.length > 0 ? withProfile : data);

        if (preselectedA) {
          setSelectedIdA(preselectedA);
          // Jeśli drugie nagranie istnieje, wybierz inne niż A
          const other = withProfile.find((r) => r.id !== preselectedA);
          if (other) setSelectedIdB(other.id);
        } else if (withProfile.length >= 2) {
          setSelectedIdA(withProfile[0].id);
          setSelectedIdB(withProfile[1].id);
        }
      } catch (err: any) {
        console.error("Błąd ładowania nagrań:", err);
      } finally {
        setLoadingRecordings(false);
      }
    }
    init();
  }, [preselectedA]);

  const handleRunDuel = async () => {
    if (!selectedIdA || !selectedIdB) {
      setError("Wybierz dwóch polityków do pojedynku.");
      return;
    }
    if (selectedIdA === selectedIdB) {
      setError("Wybierz dwa różne nagrania lub polityków.");
      return;
    }

    setError(null);
    setIsSynthesizing(true);
    setDuelData(null);

    try {
      const res = await fetch("/api/duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordingIdA: selectedIdA,
          recordingIdB: selectedIdB,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || `Błąd serwera (${res.status})`);
      }

      setDuelData(json);
    } catch (err: any) {
      console.error("Błąd syntezy pojedynku:", err);
      setError(err.message || "Nie udało się wygenerować werdyktu pojedynku.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const candidateARec = recordings.find((r) => r.id === selectedIdA);
  const candidateBRec = recordings.find((r) => r.id === selectedIdB);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Pasek powrotu i statusu */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-studio-border/70">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Baza audytów
        </Link>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-mono tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            HEAD-TO-HEAD DUEL STUDIO
          </span>
        </div>
      </div>

      {/* Nagłówek Studia Pojedynków */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-3">
          <Swords className="w-8 h-8 text-amber-400" />
          Starcie 1-na-1: Pojedynek Polityczny
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Bezkompromisowa ocena starcia dwóch kandydatów, debat telewizyjnych i kontrastu wizerunkowego.
          System wyłania zwycięzcę, mierzy wagę dominacji (Tug-of-War) oraz punktuje kluczowe momenty przełamania.
        </p>
      </div>

      {/* Selektor Zawodników A i B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* ZAWODNIK A - NAROŻNIK CYJAN */}
        <div className="bg-studio-card/85 border-2 border-cyan-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1 bg-cyan-500/20 text-cyan-300 font-mono text-[10px] uppercase font-bold tracking-wider rounded-bl-xl border-l border-b border-cyan-500/30">
            Narożnik A
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-cyan-400 font-mono font-bold uppercase tracking-wider">
                Pierwszy polityk / debata
              </span>
              <h3 className="text-base font-bold text-white">
                {candidateARec?.polityk_docelowy || candidateARec?.tytul || "Wybierz kandydata"}
              </h3>
            </div>
          </div>

          <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
            Wybierz nagranie z bazy E-PROFILER:
          </label>
          <select
            value={selectedIdA}
            onChange={(e) => setSelectedIdA(e.target.value)}
            disabled={loadingRecordings || isSynthesizing}
            className="w-full bg-slate-900 border border-studio-border hover:border-cyan-500/60 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-200 outline-none transition-all font-mono"
          >
            <option value="">-- Wybierz nagranie Zawodnika A --</option>
            {recordings.map((r) => (
              <option key={`a-${r.id}`} value={r.id}>
                {r.polityk_docelowy ? `${r.polityk_docelowy} — ` : ""}
                {r.tytul.slice(0, 55)}...
              </option>
            ))}
          </select>

          {candidateARec && (
            <div className="mt-4 pt-4 border-t border-studio-border/60 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Ocena wizerunkowa:</span>
              <span className="text-cyan-300 font-bold">
                {candidateARec.psychometric_profile?.dane_marketingowe?.ocena_punktowa_1_10 ||
                  candidateARec.psychometric_profile?.wynik_ogolny ||
                  "Brak"}
                /10
              </span>
            </div>
          )}
        </div>

        {/* IKONA CENTRALNA VS */}
        <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-slate-950 border-2 border-amber-500/60 shadow-xl items-center justify-center text-amber-400 font-black text-sm">
          VS
        </div>

        {/* ZAWODNIK B - NAROŻNIK BURSZTYN/CZERWIEŃ */}
        <div className="bg-studio-card/85 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold tracking-wider rounded-bl-xl border-l border-b border-amber-500/30">
            Narożnik B
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-amber-400 font-mono font-bold uppercase tracking-wider">
                Drugi polityk / oponent
              </span>
              <h3 className="text-base font-bold text-white">
                {candidateBRec?.polityk_docelowy || candidateBRec?.tytul || "Wybierz oponenta"}
              </h3>
            </div>
          </div>

          <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
            Wybierz nagranie z bazy E-PROFILER:
          </label>
          <select
            value={selectedIdB}
            onChange={(e) => setSelectedIdB(e.target.value)}
            disabled={loadingRecordings || isSynthesizing}
            className="w-full bg-slate-900 border border-studio-border hover:border-amber-500/60 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 outline-none transition-all font-mono"
          >
            <option value="">-- Wybierz nagranie Zawodnika B --</option>
            {recordings.map((r) => (
              <option key={`b-${r.id}`} value={r.id}>
                {r.polityk_docelowy ? `${r.polityk_docelowy} — ` : ""}
                {r.tytul.slice(0, 55)}...
              </option>
            ))}
          </select>

          {candidateBRec && (
            <div className="mt-4 pt-4 border-t border-studio-border/60 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Ocena wizerunkowa:</span>
              <span className="text-amber-300 font-bold">
                {candidateBRec.psychometric_profile?.dane_marketingowe?.ocena_punktowa_1_10 ||
                  candidateBRec.psychometric_profile?.wynik_ogolny ||
                  "Brak"}
                /10
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Przycisk uruchomienia starcia */}
      <div className="flex flex-col items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRunDuel}
          disabled={!selectedIdA || !selectedIdB || selectedIdA === selectedIdB || isSynthesizing}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-amber-500 to-red-600 hover:from-cyan-400 hover:via-amber-400 hover:to-red-500 disabled:opacity-40 text-black font-black text-sm tracking-wide flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          <Swords className="w-5 h-5 fill-current" />
          <span>{isSynthesizing ? "TRWA SYNTETYZOWANIE STARCIU AI..." : "ROZPOCZNIJ STARCE 1-NA-1"}</span>
        </button>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2 max-w-md">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Stan ładowania syntezy */}
      {isSynthesizing && (
        <div className="p-12 text-center bg-studio-card/80 border border-studio-border/80 rounded-2xl flex flex-col items-center justify-center gap-4 backdrop-blur-xl">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white font-mono">
              ARBITRAŻ RETORYCZNY I PORÓWNANIE PSYCHOMETRYCZNE W TOKU...
            </h4>
            <p className="text-xs text-slate-400 max-w-md">
              Silnik E-PROFILER zestawia luki logiczne, odporność na presję oraz kontrolę narracji obu polityków.
            </p>
          </div>
        </div>
      )}

      {/* WYNIKI POJEDYNKU */}
      {duelData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* TUG-OF-WAR DOMINANCE GAUGE */}
          <div className="bg-studio-card/90 border border-studio-border/90 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Wskaźnik Przewagi Dominacji (Tug-of-War)
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">Suma bilansu: 100%</span>
            </div>

            {/* Pasek siły */}
            <div className="relative h-12 bg-slate-950 rounded-2xl overflow-hidden border border-studio-border flex p-1">
              <div
                style={{ width: `${duelData.duel.przewaga_procentowa_a}%` }}
                className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl flex items-center justify-start px-4 text-xs font-black text-white transition-all duration-1000 shadow-lg"
              >
                <span className="truncate">{duelData.candidateA.name} ({duelData.duel.przewaga_procentowa_a}%)</span>
              </div>
              <div
                style={{ width: `${duelData.duel.przewaga_procentowa_b}%` }}
                className="h-full bg-gradient-to-r from-amber-600 to-red-600 rounded-xl flex items-center justify-end px-4 text-xs font-black text-white transition-all duration-1000 shadow-lg ml-auto"
              >
                <span className="truncate">({duelData.duel.przewaga_procentowa_b}%) {duelData.candidateB.name}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-400">
              <span className="text-cyan-400">{duelData.candidateA.name}</span>
              <span className="text-amber-400">{duelData.candidateB.name}</span>
            </div>
          </div>

          {/* WERDYKT ARBITRAŻU (HERO BANNER) */}
          <div className="bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                <Award className="w-4 h-4 text-amber-400" />
                OFICJALNY WERDYKT STARCIU
              </div>
              <span className="text-xs font-mono text-slate-400">
                Arbitraż E-PROFILER Cyber-Forensics
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Zwycięzca:{" "}
                <span className="text-amber-400 underline decoration-amber-500/50 underline-offset-4">
                  {duelData.duel.nazwa_zwyciezcy}
                </span>
              </h2>
              <h3 className="text-sm font-semibold text-cyan-300 mt-1">
                {duelData.duel.tytul_pojedynku}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
              {duelData.duel.podsumowanie_starcia}
            </p>

            {/* Kluczowy moment przełamania */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-start gap-3">
              <Target className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                  Kluczowy Moment Przełamania:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {duelData.duel.kluczowy_moment_przelamania}
                </p>
              </div>
            </div>
          </div>

          {/* 4-RUNDOWA MATRYCA STARCIU (RHETORICAL CLASH MATRIX) */}
          <div className="bg-studio-card/85 border border-studio-border/90 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-studio-border/70">
              <BrainCircuit className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Matryca Bezpośredniego Starcia w 4 Kategoriach
                </h3>
                <p className="text-[11px] text-slate-400">
                  Punktacja (1-10) i arbitraż sztabowy w poszczególnych dyscyplinach
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Opanowanie emocjonalne */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-studio-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Opanowanie emocjonalne
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      duelData.duel.kategorie.opanowanie_emocjonalne.zwyciezca === "A"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    Wygrywa: {duelData.duel.kategorie.opanowanie_emocjonalne.zwyciezca === "A" ? duelData.candidateA.name : duelData.candidateB.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-cyan-400">{duelData.candidateA.name}: {duelData.duel.kategorie.opanowanie_emocjonalne.ocena_a_1_10}/10</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400">{duelData.candidateB.name}: {duelData.duel.kategorie.opanowanie_emocjonalne.ocena_b_1_10}/10</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {duelData.duel.kategorie.opanowanie_emocjonalne.uzasadnienie}
                </p>
              </div>

              {/* 2. Siła argumentacji */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-studio-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Siła argumentacji i logiki
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      duelData.duel.kategorie.sila_argumentacji.zwyciezca === "A"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    Wygrywa: {duelData.duel.kategorie.sila_argumentacji.zwyciezca === "A" ? duelData.candidateA.name : duelData.candidateB.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-cyan-400">{duelData.candidateA.name}: {duelData.duel.kategorie.sila_argumentacji.ocena_a_1_10}/10</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400">{duelData.candidateB.name}: {duelData.duel.kategorie.sila_argumentacji.ocena_b_1_10}/10</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {duelData.duel.kategorie.sila_argumentacji.uzasadnienie}
                </p>
              </div>

              {/* 3. Kontrola narracji */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-studio-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Kontrola narracji i agendy
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      duelData.duel.kategorie.kontrola_narracji.zwyciezca === "A"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    Wygrywa: {duelData.duel.kategorie.kontrola_narracji.zwyciezca === "A" ? duelData.candidateA.name : duelData.candidateB.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-cyan-400">{duelData.candidateA.name}: {duelData.duel.kategorie.kontrola_narracji.ocena_a_1_10}/10</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400">{duelData.candidateB.name}: {duelData.duel.kategorie.kontrola_narracji.ocena_b_1_10}/10</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {duelData.duel.kategorie.kontrola_narracji.uzasadnienie}
                </p>
              </div>

              {/* 4. Odporność na presję */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-studio-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-400" />
                    Odporność na presję i riposty
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      duelData.duel.kategorie.odpornosc_na_presje.zwyciezca === "A"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    Wygrywa: {duelData.duel.kategorie.odpornosc_na_presje.zwyciezca === "A" ? duelData.candidateA.name : duelData.candidateB.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-cyan-400">{duelData.candidateA.name}: {duelData.duel.kategorie.odpornosc_na_presje.ocena_a_1_10}/10</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-400">{duelData.candidateB.name}: {duelData.duel.kategorie.odpornosc_na_presje.ocena_b_1_10}/10</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {duelData.duel.kategorie.odpornosc_na_presje.uzasadnienie}
                </p>
              </div>
            </div>
          </div>

          {/* DYREKTYWY DLA OBU SZTABÓW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                Dyrektywa sztabowa dla: {duelData.candidateA.name}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {duelData.duel.rekomendacja_dla_sztabu_a}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 block">
                Dyrektywa sztabowa dla: {duelData.candidateB.name}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {duelData.duel.rekomendacja_dla_sztabu_b}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DuelPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-xs text-slate-400 font-mono flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>Inicjalizacja Studia Pojedynków 1-na-1 E-PROFILER...</span>
        </div>
      }
    >
      <DuelContent />
    </Suspense>
  );
}
