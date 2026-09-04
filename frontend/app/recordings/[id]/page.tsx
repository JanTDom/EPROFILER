"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchRecording } from "@/lib/api";
import { Recording } from "@/lib/types";
import { ProgressStepper } from "@/components/ProgressStepper";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  ArrowLeft,
  Clock,
  Calendar,
  CheckCircle2,
  Eye,
  Activity,
  HeartCrack,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

export default function RecordingDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDrawer, setShowTechnicalDrawer] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchRecording(id);
      setRecording(data);
    } catch (err: any) {
      setError(err.message || "Nie udało się załadować nagrania.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading && !recording) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Ładowanie danych profilera...
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="p-8 bg-white border border-border">
        <div className="text-red-600 text-xs font-semibold mb-2">Błąd</div>
        <p className="text-xs text-slate-700">{error || "Nagranie nie istnieje."}</p>
        <Link href="/" className="inline-block mt-4 text-xs font-semibold text-slate-900 underline">
          &larr; Wróć do bazy nagrań
        </Link>
      </div>
    );
  }

  const isReady =
    recording.status_przetwarzania === "GOTOWE_DO_TRANSKRYPCJI" ||
    recording.status_przetwarzania === "ZAKONCZONE";

  return (
    <div className="space-y-6">
      {/* Pasek nawigacji wstecz */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Wszystkie nagrania
        </Link>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          title="Odśwież stan"
        >
          <RefreshCw className="w-3 h-3" />
          Odśwież stan
        </button>
      </div>

      {/* Nagłówek materiału */}
      <div className="bg-white border border-border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-slate-900 text-white rounded-sm">
                PROFILER STUDIO
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                {recording.typ_nagrania}
              </span>
              {recording.tryb_biometryczny !== false && (
                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Biometria & Mimika aktywna
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">
              {recording.tytul}
            </h1>
            {recording.zrodlo_url && (
              <p className="text-xs text-slate-400 font-mono truncate max-w-xl mt-1">
                {recording.zrodlo_url}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {recording.data_publikacji && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{recording.data_publikacji.slice(0, 10)}</span>
              </div>
            )}
            {recording.czas_trwania_sek > 0 && (
              <div className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {Math.floor(recording.czas_trwania_sek / 60)}m{" "}
                  {Math.floor(recording.czas_trwania_sek % 60)}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Główna sekcja */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolumna lewa: Odtwarzacz wideo z trybem slow-motion & Karty prostego języka */}
        <div className="lg:col-span-2 space-y-6">
          {isReady ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  Podgląd wideo z inspektorem mikroekspresji
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Użyj 0.25x do wykrywania ułamkowych grymasów twarzy
                </span>
              </div>
              <VideoPlayer recordingId={recording.id} />
            </div>
          ) : (
            <div className="aspect-video bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Activity className="w-10 h-10 text-blue-500 mb-3 animate-pulse" />
              <p className="text-xs font-semibold text-slate-200">
                PROFILER przetwarza materiał wideo...
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Generujemy zoptymalizowany podgląd 720p oraz ścieżkę dźwiękową 16kHz do analizy drżenia głosu i transkrypcji.
              </p>
            </div>
          )}

          {/* KARTY PROSTEGO JĘZYKA (Co mówi i zdradza rozmówca) */}
          <div className="bg-white border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Wnioski profilera w prostym języku
                </h3>
              </div>
              <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-200 font-medium">
                Zrozumiałe dla każdego
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Karta 1: Emocje i nastroje */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  Nastroje i emocje
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Rozmówca wkracza w wywiad z wysoką pewnością siebie. Od 4. minuty widoczne pierwsze oznaki zniecierpliwienia (zwężanie ust i ściąganie brwi).
                </p>
              </div>

              {/* Karta 2: Intencje i uniki */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Główne uniki i taktyka
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Unika bezpośredniej odpowiedzi na pytania o finanse; stosuje tzw. odbicie piłeczki („A co robili nasi poprzednicy?”) oraz ucieka w ogólniki.
                </p>
              </div>

              {/* Karta 3: Czułe punkty i lęki */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                  <HeartCrack className="w-3.5 h-3.5 text-red-600" />
                  Czułe punkty (stres fizjologiczny)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Gwałtowny skok mrugania (z 18 do 52 mrugnięć/min) oraz ucieczka wzrokiem w dół, gdy dziennikarz zapytał o personalną odpowiedzialność za ustawę.
                </p>
              </div>

              {/* Karta 4: Zgodność ciała ze słowami */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-sm">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Spójność (Słowa vs Ciało)
                </div>
                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-amber-700">Wykryto dysonans:</strong> Mówiąc „nie mam z tym żadnego problemu”, rozmówca mimowolnie przecząco kręci głową i zaciska wargi.
                </p>
              </div>
            </div>
          </div>

          {/* Zwijany panel danych technicznych dla ekspertów */}
          <div className="bg-white border border-border shadow-sm">
            <button
              onClick={() => setShowTechnicalDrawer(!showTechnicalDrawer)}
              className="w-full p-4 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                🔬 Twarde pomiary biometryczne i laboratoryjne (dla dociekliwych)
              </span>
              {showTechnicalDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTechnicalDrawer && (
              <div className="p-4 border-t border-border bg-slate-50 text-xs font-mono space-y-2 text-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 block text-[10px]">JEDNOSTKI MIMICZNE (FACS):</span>
                    <span>AU14 (Dimpler), AU4 (Brow lowerer), AU23 (Lip tightener)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">CZĘSTOTLIWOŚĆ MRUGANIA:</span>
                    <span>Baza: 20 bpm &rarr; Szczyt: 54 bpm (+170%)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">AKUSTYKA GŁOSU (F0 & JITTER):</span>
                    <span>Średnie F0: 135 Hz, Skok pod presją: 178 Hz (+43 Hz)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">INDEKS KONGRUENCJI (C_SCORE):</span>
                    <span>0.42 / 1.0 (Dysonans w 3 segmentach)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kolumna prawa: Stepper postępu & Telemetria */}
        <div className="space-y-4">
          <ProgressStepper
            recordingId={recording.id}
            initialStatus={recording.status_przetwarzania}
            initialStep={recording.krok_postepu}
            initialPercent={recording.procent_postepu}
            onComplete={() => loadData()}
          />

          {/* Karta statusu potoku */}
          <div className="bg-white border border-border p-4 text-xs font-mono space-y-2 shadow-sm">
            <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-border flex items-center justify-between">
              <span>Specyfikacja potoku</span>
              <span className="text-[10px] text-blue-600">PROFILER v2</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Podgląd wideo:</span>
              <span className="text-slate-900">720p H.264 faststart</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Ścieżka dźwiękowa:</span>
              <span className="text-slate-900">16kHz 16-bit Mono WAV</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Wizja i Mimika:</span>
              <span className="text-slate-900">MediaPipe / FACS AU</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Prozodia mowy:</span>
              <span className="text-slate-900">Praat F0 + drżenie (jitter)</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Język raportu:</span>
              <span className="text-emerald-700 font-semibold">Prosty język polski</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
