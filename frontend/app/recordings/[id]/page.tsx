"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchRecording } from "@/lib/api";
import { Recording } from "@/lib/types";
import { ProgressStepper } from "@/components/ProgressStepper";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ArrowLeft, Clock, Calendar, CheckCircle2, FileText, Layers, RefreshCw } from "lucide-react";

export default function RecordingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        Ładowanie danych nagrania...
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="p-8 bg-white border border-border">
        <div className="text-red-600 text-xs font-semibold mb-2">Błąd</div>
        <p className="text-xs text-slate-700">{error || "Nagranie nie istnieje."}</p>
        <Link href="/" className="inline-block mt-4 text-xs font-semibold text-slate-900 underline">
          &larr; Wróć do listy nagrań
        </Link>
      </div>
    );
  }

  const isReady = recording.status_przetwarzania === "GOTOWE_DO_TRANSKRYPCJI" || recording.status_przetwarzania === "ZAKONCZONE";

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
          Odśwież
        </button>
      </div>

      {/* Nagłówek materiału */}
      <div className="bg-white border border-border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200">
                {recording.typ_nagrania}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {recording.id.slice(0, 8)}
              </span>
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
        {/* Kolumna lewa: Odtwarzacz wideo & podgląd */}
        <div className="lg:col-span-2 space-y-4">
          {isReady ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Podgląd wideo (Proxy 720p H.264)
                </span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                  Strumieniowanie aktywne
                </span>
              </div>
              <VideoPlayer recordingId={recording.id} />
            </div>
          ) : (
            <div className="aspect-video bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Layers className="w-10 h-10 text-slate-600 mb-3 animate-pulse" />
              <p className="text-xs font-semibold text-slate-300">
                Oczekiwanie na ukończenie transkodowania wideo...
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Po zakończeniu kroku transkodowania podgląd odtwarzacza pojawi się automatycznie.
              </p>
            </div>
          )}

          {/* Karta przejścia do kolejnych faz */}
          <div className="p-4 bg-white border border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900">
                  Status Fazy 1 (Szkielet & Media):{" "}
                  <span className={isReady ? "text-emerald-600" : "text-amber-600"}>
                    {recording.krok_postepu}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Wyodrębniono znormalizowane audio (16 kHz WAV) i przygotowano podgląd wideo.
                </p>
              </div>

              {isReady && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Gotowe na Fazę 2
                </div>
              )}
            </div>
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

          {/* Szczegóły techniczne Fazy 1 */}
          <div className="bg-white border border-border p-4 text-xs font-mono space-y-2">
            <div className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] pb-1 border-b border-border">
              Metadane potoku (Pipeline Specs)
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Wideo:</span>
              <span className="text-slate-900">720p H.264 faststart</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Ścieżka Audio:</span>
              <span className="text-slate-900">16kHz 16-bit Mono WAV</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Model Transkrypcji:</span>
              <span className="text-slate-900">faster-whisper (Faza 2)</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-600">
              <span>Diaryzacja:</span>
              <span className="text-slate-900">PyAnnote Audio (Faza 2)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
