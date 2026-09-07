"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchRecording, setTargetSpeaker, retryRecording, getRecordingPdfUrl } from "@/lib/api";
import { Recording, DetectedSpeaker, PoliticianRelation } from "@/lib/types";
import { ProgressStepper } from "@/components/ProgressStepper";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AudioPlayer } from "@/components/AudioPlayer";
import { LegalNotice } from "@/components/LegalNotice";
import { DeleteRecordingButton } from "@/components/DeleteRecordingButton";
import { ForensicChat } from "@/components/ForensicChat";
import { AdversaryAttackDossier } from "@/components/AdversaryAttackDossier";
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
  ShieldCheck,
  UserCheck,
  Users,
  Check,
  Edit2,
  Radio,
  Download,
  Award,
  ThumbsUp,
  ThumbsDown,
  Flame,
  Target,
  Compass,
  Swords,
  Mic,
} from "lucide-react";

export default function RecordingDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnicalDrawer, setShowTechnicalDrawer] = useState(false);
  const [isSwitchingSpeaker, setIsSwitchingSpeaker] = useState(false);
  const [customPoliticianName, setCustomPoliticianName] = useState("");
  const [modalRelation, setModalRelation] = useState<PoliticianRelation>("sojusznik");
  const [switchingError, setSwitchingError] = useState<string | null>(null);
  const [seekToTimeSec, setSeekToTimeSec] = useState<number | null>(null);

  const handleSeekFromChat = (seconds: number) => {
    setSeekToTimeSec(seconds);
    const container = document.getElementById("video-player-container");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchRecording(id);
      setRecording(data);
      if (data.polityk_docelowy) {
        setCustomPoliticianName(data.polityk_docelowy);
      }
      if (data.relacja_polityka) {
        setModalRelation(data.relacja_polityka);
      }
    } catch (err: any) {
      setError(err.message || "Nie udało się załadować nagrania.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleToggleRelation = async (newRelation: PoliticianRelation) => {
    // 1. Natychmiastowa aktualizacja stanu lokalnego (brak opóźnień w interfejsie)
    setRecording((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        relacja_polityka: newRelation,
      };
    });
    setModalRelation(newRelation);

    // 2. Trwały zapis w bazie
    try {
      const updated = await setTargetSpeaker(id, {
        speaker_tag: targetTag,
        imie_nazwisko: targetName,
        rola: recording?.rola_polityka || "Badany polityk",
        relacja: newRelation,
      });
      if (updated) {
        setRecording(updated);
      }
    } catch (err: any) {
      console.warn("Błąd zapisu nowej relacji na serwerze:", err);
    }
  };

  const handleSelectSpeaker = async (speakerTag: string, name?: string, role?: string, relation?: PoliticianRelation) => {
    try {
      setSwitchingError(null);
      const effectiveRelation = relation || modalRelation;
      const updated = await setTargetSpeaker(id, {
        speaker_tag: speakerTag,
        imie_nazwisko: name || customPoliticianName || undefined,
        rola: role || "Badany polityk",
        relacja: effectiveRelation,
      });
      setRecording(updated);
      setIsSwitchingSpeaker(false);
    } catch (err: any) {
      setSwitchingError(err.message || "Nie udało się zmienić celu profilowania.");
    }
  };

  const handleRetry = async () => {
    try {
      const updated = await retryRecording(id);
      setRecording(updated);
    } catch (err: any) {
      setError(err.message || "Nie udało się wznowić przetwarzania.");
    }
  };

  if (loading && !recording) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 font-mono flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span>Inicjalizacja modułów E-PROFILER Cyber-Forensics Studio...</span>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="p-8 bg-studio-card border border-red-500/40 rounded-xl text-slate-200 space-y-3">
        <div className="text-red-400 text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Błąd wczytywania nagrania
        </div>
        <p className="text-xs text-slate-300 font-mono leading-relaxed">{error || "Nagranie nie istnieje lub zostało usunięte."}</p>
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => { setError(null); loadData(); }}
            className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-semibold font-mono transition-colors"
          >
            Spróbuj ponownie
          </button>
          <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-200 underline">
            &larr; Wróć do bazy nagrań
          </Link>
        </div>
      </div>
    );
  }

  const isReady =
    recording.status_przetwarzania === "GOTOWE_DO_TRANSKRYPCJI" ||
    recording.status_przetwarzania === "ZAKONCZONE";

  const targetName = recording.polityk_docelowy || "Główny badany polityk";
  const targetTag = recording.speaker_docelowy_tag || "SPEAKER_01";
  const isAdversary = recording.relacja_polityka === "przeciwnik";

  // Domyślna lista mówców jeśli nagranie jeszcze nie ma diaryzacji
  const speakersList: DetectedSpeaker[] = recording.rozpoznani_mowcy && recording.rozpoznani_mowcy.length > 0
    ? recording.rozpoznani_mowcy
    : [
        {
          speaker_tag: "SPEAKER_00",
          imie_nazwisko: "Dziennikarz / Prowadzący",
          rola: "Prowadzący wywiad",
          jest_celem: false,
        },
        {
          speaker_tag: targetTag,
          imie_nazwisko: targetName,
          rola: recording.rola_polityka || "Badany polityk",
          jest_celem: true,
        },
      ];

  return (
    <div className="space-y-6">
      {/* Pasek nawigacji wstecz i akcji */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-studio-border/70">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Wszystkie nagrania
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Przycisk przejścia do pojedynku 1-na-1 */}
          <Link
            href={`/duel?candidateA=${recording.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-all shadow-sm"
            title="Przejdź do studia pojedynku 1-na-1 z tym nagraniem"
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Pojedynek 1-na-1</span>
          </Link>

          {/* Przycisk pobierania eleganckiego raportu PDF */}
          <a
            href={getRecordingPdfUrl(recording.id)}
            download
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all ${
              isAdversary
                ? "text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]"
                : "text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 shadow-glow-cyan"
            }`}
            title={isAdversary ? "Pobierz raport wywiadu ofensywnego i wektorów ataku w formacie PDF" : "Pobierz elegancki raport audytu politycznego w formacie PDF"}
          >
            <Download className="w-3.5 h-3.5" />
            {isAdversary ? "Raport oponenta PDF (Wektory ataku)" : "Raport sojusznika PDF (Audyt)"}
          </a>

          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 bg-studio-surface/80 px-3 py-1.5 rounded-lg border border-studio-border/60 transition-colors"
            title="Odśwież stan"
          >
            <RefreshCw className="w-3 h-3" />
            Odśwież telemetrię
          </button>

          <DeleteRecordingButton
            recordingId={recording.id}
            recordingTitle={recording.tytul}
            redirectOnDelete={true}
          />
        </div>
      </div>

      {/* Nagłówek materiału */}
      <div className={`relative bg-studio-card/90 border p-6 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-1 ${
        isAdversary
          ? "border-rose-500/40 before:bg-gradient-to-r before:from-rose-600 before:via-red-500 before:to-amber-500 shadow-[0_0_30px_rgba(244,63,94,0.12)]"
          : "border-studio-border/80 before:bg-gradient-to-r before:from-cyan-500 before:via-blue-500 before:to-emerald-400"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                isAdversary
                  ? "bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                  : "bg-cyan-950/70 text-cyan-300 border border-cyan-500/40"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAdversary ? "bg-rose-400 animate-pulse" : "bg-cyan-400 animate-pulse"}`} />
                {isAdversary ? "OPPONENT INTELLIGENCE // WYWIAD OFENSYWNY" : "PROFILER STUDIO"}
              </span>

              {/* Status Relacji */}
              {isAdversary ? (
                <span className="text-[10px] font-mono text-rose-300 bg-rose-950/90 px-2.5 py-0.5 border border-rose-500/60 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                  <Target className="w-3 h-3 text-rose-400" />
                  STATUS: PRZECIWNIK (WEKTORY ATAKU)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 border border-emerald-500/40 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  STATUS: SOJUSZNIK (AUDYT SZTABOWY)
                </span>
              )}

              <span className="text-[10px] font-mono px-2.5 py-0.5 bg-slate-800/80 text-slate-300 border border-studio-border rounded-full">
                {recording.typ_nagrania}
              </span>
              {recording.zakres_analizy === "behawioralny" ? (
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2.5 py-0.5 border border-purple-500/40 rounded-full">
                  Zakres: tylko stan psychiczny i zachowanie
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 border border-emerald-500/40 rounded-full">
                  Zakres: pełny 360° (zachowanie, perswazja, starcie)
                </span>
              )}
              {recording.format_materialu === "audio" ? (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/40 px-2.5 py-0.5 border border-amber-500/40 rounded-full flex items-center gap-1">
                  <Mic className="w-3 h-3 text-amber-400" />
                  Format: audio / podcast
                </span>
              ) : recording.tryb_biometryczny !== false ? (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2.5 py-0.5 border border-cyan-500/30 rounded-full flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  Biometria i mimika FACS
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {recording.tytul}
            </h1>
            {recording.zrodlo_url && (
              <p className="text-xs text-slate-500 font-mono truncate max-w-xl mt-1.5">
                {recording.zrodlo_url}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            {recording.data_publikacji && (
              <div className="flex items-center gap-1.5 bg-studio-surface/60 px-3 py-1.5 rounded-lg border border-studio-border/50">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{recording.data_publikacji.slice(0, 10)}</span>
              </div>
            )}
            {recording.czas_trwania_sek > 0 && (
              <div className="flex items-center gap-1.5 font-mono bg-studio-surface/60 px-3 py-1.5 rounded-lg border border-studio-border/50">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {Math.floor(recording.czas_trwania_sek / 60)}m{" "}
                  {Math.floor(recording.czas_trwania_sek % 60)}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HUD BADANEGO POLITYKA & ROZPOZNAWANIE MÓWCÓW */}
      <div className={`border rounded-2xl p-5 shadow-xl transition-all ${
        isAdversary
          ? "bg-gradient-to-r from-rose-950/40 via-studio-card/90 to-studio-card/90 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]"
          : "bg-gradient-to-r from-cyan-950/40 via-studio-card/90 to-studio-card/90 border-cyan-500/40"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-studio-border/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
              isAdversary
                ? "bg-rose-500/15 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                : "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-glow-cyan"
            }`}>
              {isAdversary ? <Target className="w-5 h-5 text-rose-400 animate-pulse" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                  isAdversary ? "text-rose-400" : "text-cyan-400"
                }`}>
                  {isAdversary ? "NAMIERZONY OPONENT // WEKTORY ATAKU" : "AKTYWNY CEL PROFILOWANIA"}
                </span>
                <span className={`w-2 h-2 rounded-full ${isAdversary ? "bg-rose-400 animate-ping" : "bg-cyan-400 animate-ping"}`} />
              </div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>{targetName}</span>
                <span className={`text-xs font-mono font-normal px-2 py-0.5 border rounded ${
                  isAdversary
                    ? "text-rose-300 bg-rose-950/80 border-rose-500/40"
                    : "text-cyan-300 bg-cyan-950/80 border-cyan-500/30"
                }`}>
                  {targetTag}
                </span>
              </h2>
            </div>
          </div>

          {/* GŁÓWNY PRZEŁĄCZNIK RELACJI: SOJUSZNIK VS PRZECIWNIK */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center p-1 bg-[#060a14] border border-slate-700/90 rounded-xl shadow-xl">
              <button
                type="button"
                onClick={() => handleToggleRelation("sojusznik")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  !isAdversary
                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/40"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
                title="Tryb audytu: wzmocnienie kandydata, wygaszanie błędów i dyrektywy sztabowe"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>🛡️ Sojusznik (Audyt)</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleRelation("przeciwnik")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isAdversary
                    ? "bg-rose-500/30 text-rose-200 border border-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.4)] ring-1 ring-rose-500/60"
                    : "text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
                title="Tryb wywiadu ofensywnego: słabości, destabilizacja psychiczna, pytania-pułapki i amunicja spotowa"
              >
                <Target className="w-4 h-4 text-rose-400" />
                <span>🎯 Przeciwnik (Wektory ataku)</span>
              </button>
            </div>

            <button
              onClick={() => setIsSwitchingSpeaker(!isSwitchingSpeaker)}
              className={`flex items-center gap-1.5 px-3 py-2 bg-studio-surface text-xs font-semibold rounded-lg transition-all border cursor-pointer ${
                isAdversary
                  ? "border-rose-500/40 hover:border-rose-400 text-rose-300 hover:bg-rose-950/30"
                  : "border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:bg-studio-surface/80"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {isSwitchingSpeaker ? "Ukryj wybór mówców" : "Wskaż innego mówcę"}
            </button>
          </div>
        </div>

        {/* Lista wykrytych mówców / Przełącznik celów */}
        <div className="pt-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Rozpoznani mówcy w nagraniu ({speakersList.length}):</span>
            <span className="text-[10px] text-slate-500 font-mono">Kliknij mówcę, aby przenieść na niego analizę</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {speakersList.map((sp) => {
              const isSelected = sp.speaker_tag === targetTag || sp.jest_celem;
              return (
                <div
                  key={sp.speaker_tag}
                  onClick={() => handleSelectSpeaker(sp.speaker_tag, sp.imie_nazwisko, sp.rola, modalRelation)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? isAdversary
                        ? "bg-rose-950/40 border-rose-400 ring-1 ring-rose-400/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                        : "bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/40 shadow-glow-cyan"
                      : "bg-studio-surface/50 border-studio-border/60 hover:border-slate-600 hover:bg-studio-surface"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-mono font-bold ${isAdversary ? "text-rose-400" : "text-cyan-400"}`}>
                        {sp.speaker_tag}
                      </span>
                      {isSelected && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isAdversary ? "bg-rose-500 text-white" : "bg-cyan-400 text-slate-950"
                        }`}>
                          {isAdversary ? "Oponent" : "Badany"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-100 truncate">
                      {sp.imie_nazwisko || "Nieznany mówca"}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {sp.rola || "Uczestnik rozmowy"}
                    </div>
                  </div>

                  {isSelected ? (
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isAdversary ? "text-rose-400" : "text-cyan-400"}`} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Formularz wpisania własnego nazwiska oraz wyboru relacji */}
          {isSwitchingSpeaker && (
            <div className="mt-4 p-4 bg-studio-surface/90 border border-slate-700/80 rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Wpisz imię i nazwisko osoby do profilowania:
                  </label>
                  <input
                    type="text"
                    placeholder="np. Sławomir Mentzen, Donald Tusk, Krzysztof Bosak..."
                    value={customPoliticianName}
                    onChange={(e) => setCustomPoliticianName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-studio-card border border-studio-border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    Relacja ze sztabem (strategia analizy):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalRelation("sojusznik")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
                        modalRelation === "sojusznik"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "bg-slate-900 text-slate-400 border border-slate-700/60 hover:text-slate-200"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sojusznik (Audyt)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalRelation("przeciwnik")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
                        modalRelation === "przeciwnik"
                          ? "bg-rose-500/25 text-rose-200 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                          : "bg-slate-900 text-slate-400 border border-slate-700/60 hover:text-slate-200"
                      }`}
                    >
                      <Target className="w-3.5 h-3.5 text-rose-400" />
                      <span>Przeciwnik (Atak)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectSpeaker(targetTag, customPoliticianName, undefined, modalRelation)}
                  className={`px-5 py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all ${
                    modalRelation === "przeciwnik"
                      ? "bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                  }`}
                >
                  Zapisz i przelicz profil
                </button>
              </div>

              {switchingError && (
                <div className="text-xs text-red-400">{switchingError}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Główna sekcja */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolumna lewa: Odtwarzacz wideo z trybem slow-motion & Karty prostego języka */}
        <div className="lg:col-span-2 space-y-6">
          {isReady ? (
            <div id="video-player-container" className="scroll-mt-6">
              {recording.format_materialu === "audio" ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-cyan-400" />
                      Ścieżka dźwiękowa z analizatorem prozodii i drżenia głosu
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Tryb analizy akustycznej: fale F0, stabilność fonacji i intonacja
                    </span>
                  </div>
                  <AudioPlayer
                    recordingId={recording.id}
                    sourceUrl={recording.zrodlo_url}
                    seekToTimeSec={seekToTimeSec}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      Podgląd wideo z inspektorem mikroekspresji
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Użyj 0.25x do wykrywania ułamkowych grymasów twarzy
                    </span>
                  </div>
                  <VideoPlayer
                    recordingId={recording.id}
                    sourceUrl={recording.zrodlo_url}
                    sourceType={recording.zrodlo_typ}
                    seekToTimeSec={seekToTimeSec}
                  />
                </>
              )}
            </div>
          ) : recording.status_przetwarzania === "BLAD" ? (
            <div className="aspect-video bg-studio-card/95 border border-red-500/50 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-300 shadow-2xl backdrop-blur-xl">
              <AlertTriangle className="w-12 h-12 text-red-400 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-red-300">
                Wystąpił problem podczas przetwarzania
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed font-mono">
                {recording.blad || "Błąd pobierania lub transkodowania materiału."}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Wznów przetwarzanie (Retry)
              </button>
            </div>
          ) : (
            <div className="aspect-video bg-studio-card/90 border border-studio-border/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400 shadow-xl backdrop-blur-xl">
              <Activity className="w-10 h-10 text-cyan-400 mb-3 animate-pulse" />
              <p className="text-xs font-semibold text-slate-200">
                E-PROFILER przetwarza materiał wideo...
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Generujemy zoptymalizowany podgląd 720p oraz ścieżkę dźwiękową 16kHz do analizy drżenia głosu i transkrypcji.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 px-3 py-1.5 bg-studio-surface hover:bg-studio-surface/80 border border-studio-border hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-[11px] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Wznów jeśli proces uległ przerwaniu
              </button>
            </div>
          )}

          {/* SZTABOWY CZAT AI Z NAGRANIEM (FORENSIC VIDEO CHAT) */}
          {recording.psychometric_profile && (
            <ForensicChat
              recordingId={recording.id}
              politicianName={targetName}
              onSeek={handleSeekFromChat}
            />
          )}

          {/* DOSSIER WEKTORÓW ATAKU NA PRZECIWNIKA (OPONENT) LUB AUDYT SZTABOWY (SOJUSZNIK) */}
          {recording.psychometric_profile && (
            <div className="space-y-4">
              {/* WYRAŹNE ZAKŁADKI WYBORU TRYBU RAPORTU WIDOCZNE W SAMYM RAPORCIE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0b101e]/95 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-slate-400 uppercase font-bold tracking-wider">
                    Sekcja analityczna dla:
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-500/30">
                    {targetName} ({targetTag})
                  </span>
                </div>

                <div className="flex items-center gap-2 p-1 bg-[#06080f] border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleToggleRelation("sojusznik")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      !isAdversary
                        ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>🛡️ Audyt sztabowy (Sojusznik)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleRelation("przeciwnik")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      isAdversary
                        ? "bg-rose-500/30 text-rose-200 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                        : "text-slate-400 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <Target className="w-4 h-4 text-rose-400" />
                    <span>🎯 Dossier ataku (Przeciwnik)</span>
                  </button>
                </div>
              </div>

              {isAdversary ? (
                <AdversaryAttackDossier
                  recording={recording}
                  targetName={targetName}
                  onSeek={handleSeekFromChat}
                  onToggleRelation={handleToggleRelation}
                />
              ) : (
                <div className="bg-studio-card/90 border border-studio-border/80 p-6 rounded-2xl shadow-2xl backdrop-blur-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-studio-border/70">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Bilans wizerunkowy i marketing polityczny
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ocena skuteczności, błędy narracyjne, nośność medialna i rekomendacje sztabowe
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center p-1 bg-[#060a14] border border-slate-700/80 rounded-xl shadow-lg">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sojusznik (Audyt)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleRelation("przeciwnik")}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 transition-all cursor-pointer"
                      title="Przełącz ten raport na analizę przeciwnika (Opposition Research) i wektory ataku"
                    >
                      <Target className="w-3.5 h-3.5 text-rose-400" />
                      <span>Przełącz na: Przeciwnik</span>
                    </button>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                    Badany: {targetName}
                  </span>
                </div>
              </div>

              {/* Werdykt i ocena punktowa 1-10 */}
              {(() => {
                const marketing = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny;
                const score = marketing?.ocena_punktowa_1_10 ?? (recording.psychometric_profile?.wynik_ogolny ? Math.round(recording.psychometric_profile.wynik_ogolny / 10) : 7);
                const verdict = marketing?.werdykt || "Występ poprawny / Realizacja założeń partyjnych";
                const rationale = marketing?.uzasadnienie_werdyktu || recording.psychometric_profile?.podsumowanie_ai_proste;
                
                const scoreColor = score >= 8 
                  ? "from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300"
                  : score >= 5
                  ? "from-amber-500/20 to-yellow-500/10 border-amber-500/40 text-amber-300"
                  : "from-rose-500/20 to-red-500/10 border-rose-500/40 text-rose-300";

                return (
                  <div className={`p-5 rounded-xl border bg-gradient-to-br ${scoreColor} space-y-3`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                          Werdykt profilera
                        </span>
                        <h4 className="text-base font-bold text-white">
                          {verdict}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-center px-4 py-2 bg-slate-950/70 border border-white/10 rounded-xl shadow-inner">
                        <span className="text-[11px] text-slate-400 uppercase font-semibold">Ocena:</span>
                        <span className="text-2xl font-black font-mono tracking-tight text-white">
                          {score}<span className="text-sm font-normal text-slate-400">/10</span>
                        </span>
                      </div>
                    </div>
                    {rationale && (
                      <p className="text-xs text-slate-200 leading-relaxed pt-2 border-t border-white/10">
                        {rationale}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Dwie kolumny: Co zadziałało (plusy) vs Co zaszkodziło i popełnione błędy (minusy) */}
              {(() => {
                const marketing = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny;
                const plusy = (marketing?.glowne_plusy && marketing.glowne_plusy.length > 0)
                  ? marketing.glowne_plusy
                  : (recording.psychometric_profile?.mocne_strony ?? []);
                const minusy = (marketing?.popelnione_bledy_i_minusy && marketing.popelnione_bledy_i_minusy.length > 0)
                  ? marketing.popelnione_bledy_i_minusy
                  : (recording.psychometric_profile?.czule_punkty_i_leki ?? []);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Kolumna Plusy */}
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs pb-2 border-b border-emerald-500/20">
                        <ThumbsUp className="w-4 h-4 text-emerald-400" />
                        <span>Co zadziałało na korzyść (plusy)</span>
                      </div>
                      <div className="space-y-3">
                        {plusy.length > 0 ? (
                          plusy.map((item: any, idx: number) => {
                            let title = "Atut wizerunkowy";
                            let quote = "";
                            let reason = "";

                            if (typeof item === "object" && item !== null) {
                              title = item.nazwa_atutu || item.tytul || item.punkt || "Atut wizerunkowy";
                              quote = item.cytat_lub_moment || item.cytat || "";
                              reason = item.dlaczego_to_plus || item.wyjasnienie || item.efekt_wizerunkowy || "";
                            } else {
                              const str = String(item || "");
                              const qm = str.match(/[:\s][„"']([^"”']{6,})[”"']/);
                              quote = qm ? qm[1] : "";
                              const parts = str.split(/[:–—]/);
                              title = parts.length > 1 ? parts[0].replace(/^\d+[\.\)]\s*/, "").trim() : "Mocny element przekazu";
                              reason = parts.length > 1 ? parts.slice(1).join(":").trim() : str;
                            }

                            return (
                              <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-emerald-500/20 space-y-2.5">
                                <div className="flex items-start gap-2">
                                  <span className="p-1 rounded bg-emerald-500/20 text-emerald-300 flex-shrink-0 mt-0.5">
                                    <Check className="w-3.5 h-3.5" />
                                  </span>
                                  <div className="min-w-0">
                                    <span className="text-[10px] uppercase font-mono font-bold text-emerald-400/80 block">
                                      Atut #{idx + 1}
                                    </span>
                                    <h5 className="text-xs font-bold text-slate-100 leading-snug">
                                      {title}
                                    </h5>
                                  </div>
                                </div>

                                {quote && (
                                  <div className="pl-3 border-l-2 border-cyan-500/50 bg-cyan-950/20 p-2 rounded-r-lg">
                                    <span className="text-[9px] font-mono uppercase text-cyan-400 font-bold block mb-0.5">
                                      Cytat z nagrania:
                                    </span>
                                    <blockquote className="text-[11px] text-slate-200 italic leading-relaxed">
                                      „{quote}”
                                    </blockquote>
                                  </div>
                                )}

                                {reason && (
                                  <div className="space-y-1 bg-emerald-950/25 p-2.5 rounded-lg border border-emerald-500/15">
                                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3 text-emerald-400" />
                                      Dlaczego to zadziałało (analiza werdyktu):
                                    </span>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                      {reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 italic">Brak wyraźnych przewag wizerunkowych.</p>
                        )}
                      </div>
                    </div>

                    {/* Kolumna Minusy i błędy */}
                    <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 font-bold text-rose-300 text-xs pb-2 border-b border-rose-500/20">
                        <ThumbsDown className="w-4 h-4 text-rose-400" />
                        <span>Co zaszkodziło i popełnione błędy (minusy)</span>
                      </div>
                      <div className="space-y-3">
                        {minusy.length > 0 ? (
                          minusy.map((item: any, idx: number) => {
                            let title = "Uchybienie wizerunkowe";
                            let quote = "";
                            let reason = "";

                            if (typeof item === "object" && item !== null) {
                              title = item.nazwa_bledu || item.tytul || item.blad || "Błąd lub ryzyko wizerunkowe";
                              quote = item.cytat_lub_moment || item.cytat || "";
                              reason = item.dlaczego_to_minus || item.wyjasnienie || item.ryzyko_polityczne || "";
                            } else {
                              const str = String(item || "");
                              const qm = str.match(/[:\s][„"']([^"”']{6,})[”"']/);
                              quote = qm ? qm[1] : "";
                              const parts = str.split(/[:–—]/);
                              title = parts.length > 1 ? parts[0].replace(/^\d+[\.\)]\s*/, "").trim() : "Uchybienie w wypowiedzi";
                              reason = parts.length > 1 ? parts.slice(1).join(":").trim() : str;
                            }

                            return (
                              <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-rose-500/20 space-y-2.5">
                                <div className="flex items-start gap-2">
                                  <span className="p-1 rounded bg-rose-500/20 text-rose-400 flex-shrink-0 mt-0.5">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </span>
                                  <div className="min-w-0">
                                    <span className="text-[10px] uppercase font-mono font-bold text-rose-400/80 block">
                                      Błąd #{idx + 1}
                                    </span>
                                    <h5 className="text-xs font-bold text-slate-100 leading-snug">
                                      {title}
                                    </h5>
                                  </div>
                                </div>

                                {quote && (
                                  <div className="pl-3 border-l-2 border-amber-500/50 bg-amber-950/20 p-2 rounded-r-lg">
                                    <span className="text-[9px] font-mono uppercase text-amber-400 font-bold block mb-0.5">
                                      Cytat z nagrania:
                                    </span>
                                    <blockquote className="text-[11px] text-slate-200 italic leading-relaxed">
                                      „{quote}”
                                    </blockquote>
                                  </div>
                                )}

                                {reason && (
                                  <div className="space-y-1 bg-rose-950/25 p-2.5 rounded-lg border border-rose-500/15">
                                    <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                                      <Flame className="w-3 h-3 text-rose-400" />
                                      Dlaczego to zaszkodziło (analiza werdyktu):
                                    </span>
                                    <p className="text-[11px] text-slate-300 leading-relaxed">
                                      {reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 italic">Brak rażących błędów lub utraty panowania nad przekazem.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Ostrzeżenia sztabowe: Niepożądane emocje i mowa ciała */}
              {(() => {
                const emocje = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.niepozadane_emocje_i_mowa_ciala;
                if (!emocje || emocje.length === 0) return null;

                return (
                  <div className="p-4 bg-red-950/20 border border-red-500/40 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-red-300 text-xs pb-2 border-b border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Niepożądane emocje i wycieki mowy ciała (ostrzeżenia sztabowe)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {emocje.map((item: any, idx: number) => (
                        <div key={idx} className="bg-slate-900/70 p-3.5 rounded-xl border border-red-500/20 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span>{item.reakcja_lub_emocja}</span>
                          </div>
                          {item.cytat_lub_moment && (
                            <blockquote className="text-[11px] text-slate-300 italic border-l-2 border-red-500/40 pl-2">
                              „{item.cytat_lub_moment}”
                            </blockquote>
                          )}
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-red-400 font-medium">Dlaczego to błąd: </strong>
                            {item.dlaczego_to_szkodliwe}
                          </p>
                          <div className="p-2 bg-slate-950/60 rounded border border-white/5 text-[11px] text-emerald-300">
                            <strong>Zalecenie sztabowe: </strong> {item.zalecenie_sztabowe}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Audyt nielogiczności i luk w argumentacji */}
              {(() => {
                const luki = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.nielogicznosci_i_luki_argumentacyjne;
                if (!luki || luki.length === 0) return null;

                return (
                  <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-xs pb-2 border-b border-amber-500/20">
                      <Target className="w-4 h-4 text-amber-400" />
                      <span>Audyt nielogiczności i luk w argumentacji (luki dowodowe)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {luki.map((item: any, idx: number) => (
                        <div key={idx} className="bg-slate-900/70 p-3.5 rounded-xl border border-amber-500/20 space-y-2">
                          <h5 className="text-xs font-bold text-amber-200">{item.luka_lub_sprzecznosc}</h5>
                          {item.cytat_lub_moment && (
                            <blockquote className="text-[11px] text-slate-300 italic border-l-2 border-amber-500/40 pl-2">
                              „{item.cytat_lub_moment}”
                            </blockquote>
                          )}
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-amber-400 font-medium">Diagnoza logiczna: </strong>
                            {item.diagnoza_logiczna}
                          </p>
                          <div className="p-2 bg-slate-950/60 rounded border border-white/5 text-[11px] text-rose-300">
                            <strong>Ryzyko kontrataku: </strong> {item.ryzyko_kontrataku}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Skrypty korekcyjne (Zamiast X -> Mów Y) */}
              {(() => {
                const skrypty = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.gotowe_riposty_zamiast_bledow;
                if (!skrypty || skrypty.length === 0) return null;

                return (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs pb-2 border-b border-indigo-500/20">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>Skrypty korekcyjne sztabu („Zamiast... Powiedz...”)</span>
                    </div>
                    <div className="space-y-3">
                      {skrypty.map((item: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-slate-900/70 border border-indigo-500/20 rounded-xl space-y-2">
                          <div className="text-[10px] font-mono text-indigo-400 font-semibold uppercase">
                            Kontekst / trudne pytanie: {item.kontekst_pytania}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-lg">
                              <span className="text-[10px] text-rose-400 uppercase font-bold block mb-1">Co powiedział (błąd):</span>
                              <p className="text-slate-300 italic">„{item.co_powiedzial}”</p>
                            </div>
                            <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                              <span className="text-[10px] text-emerald-400 uppercase font-bold block mb-1">Rekomendowana riposta sztabowa:</span>
                              <p className="text-emerald-100 font-medium">„{item.rekomendowana_riposta}”</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Amunicja dla oponentów */}
              {(() => {
                const ammo = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.amunicja_dla_oponentow;
                if (!ammo || ammo.length === 0) return null;

                return (
                  <div className="p-4 bg-studio-surface/50 border border-rose-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-rose-300 text-xs">
                      <Flame className="w-4 h-4 text-rose-400" />
                      <span>Amunicja dla oponentów (ryzyko wycięć i ataków w social mediach)</span>
                    </div>
                    <div className="space-y-2">
                      {ammo.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-900/70 border border-rose-500/20 rounded-lg space-y-1.5">
                          <blockquote className="text-xs text-rose-200 italic">
                            „{item.cytat_ryzykowny}”
                          </blockquote>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-rose-400">Jak uderzy opozycja: </strong>
                            {item.potencjalne_uderzenie_opozycji}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Warsztat mowy i emisji głosu */}
              {(() => {
                const warsztat = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.warsztat_mowy_i_dykcji;
                if (!warsztat) return null;

                return (
                  <div className="p-4 bg-slate-900/60 border border-teal-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 font-bold text-teal-300 text-xs">
                      <Radio className="w-4 h-4 text-teal-400" />
                      <span>Warsztat wystąpień publicznych i emisja głosu</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {warsztat}
                    </p>
                  </div>
                );
              })()}

              {/* Nośność medialna i soundbites */}
              {(() => {
                const soundbitesRaw = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.nosnosc_medialna_soundbites;
                if (!soundbitesRaw || (Array.isArray(soundbitesRaw) && soundbitesRaw.length === 0)) return null;
                const soundbites = Array.isArray(soundbitesRaw) ? soundbitesRaw : [soundbitesRaw];

                return (
                  <div className="p-4 bg-studio-surface/50 border border-amber-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Nośność medialna i „setki” do wycięć telewizyjnych</span>
                    </div>
                    <div className="space-y-2">
                      {soundbites.map((sb: any, idx: number) => {
                        const quote = typeof sb === "string" ? sb : (sb.cytat || JSON.stringify(sb));
                        return (
                          <div key={idx} className="p-3 bg-slate-900/70 border border-amber-500/20 rounded-lg space-y-1">
                            <div className="text-[10px] font-mono text-amber-400/80 font-semibold">
                              Setka telewizyjna / cytat #{idx + 1}
                            </div>
                            <p className="text-xs text-slate-100 italic leading-relaxed">
                              „{quote}”
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Rezonans u grup wyborców */}
              {(() => {
                const wplyw = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.wplyw_na_elektorat;
                if (!wplyw) return null;
                return (
                  <div className="p-4 bg-studio-surface/50 border border-cyan-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>Rezonans u grup wyborców (czy to kupią?)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-900/60 border border-emerald-500/20 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          Twardy elektorat (zwolennicy)
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {wplyw.twardy_elektorat || "Brak danych"}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-900/60 border border-cyan-500/20 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                          Wyborcy niezdecydowani (centrum)
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {wplyw.niezdecydowani || "Brak danych"}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-900/60 border border-rose-500/20 rounded-lg space-y-1">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                          Oponenci polityczni
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {wplyw.przeciwnicy || "Brak danych"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Rekomendacje sztabowe */}
              {(() => {
                const reks = recording.psychometric_profile?.surowe_wnioski_ai?.marketing_polityczny?.rekomendacje_sztabowe;
                if (!reks || reks.length === 0) return null;
                return (
                  <div className="p-4 bg-studio-surface/50 border border-indigo-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      <span>Rekomendacje sztabowe przed kolejnymi występami</span>
                    </div>
                    <ul className="space-y-2">
                      {reks.map((rek, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-lg border border-indigo-500/20">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{rek}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
            )}
            </div>
          )}

          {/* KARTY PROSTEGO JĘZYKA (Wnioski profilera w prostym języku) */}
          <div className="bg-studio-card/90 border border-studio-border/80 p-6 rounded-2xl shadow-2xl backdrop-blur-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-studio-border/70">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold tracking-wide text-white">
                  Wnioski profilera w prostym języku
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full font-mono">
                  Badany: {targetName} ({targetTag})
                </span>
                {recording.psychometric_profile?.surowe_wnioski_ai?.temat_rozmowy && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full truncate max-w-xs">
                    Temat: {recording.psychometric_profile.surowe_wnioski_ai.temat_rozmowy}
                  </span>
                )}
              </div>
            </div>

            {/* Dynamiczne karty profilu lub stan analizowania na żywo */}
            {recording.psychometric_profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Karta 1: Nastroje i emocje */}
                <div className="p-4 bg-studio-surface/50 border border-cyan-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Nastroje i emocje
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    <strong className="text-white">{targetName}:</strong>{" "}
                    {recording.psychometric_profile.nastroj_glowny_prosty}
                  </p>
                </div>

                {/* Karta 2: Główne uniki i taktyka */}
                <div className="p-4 bg-studio-surface/50 border border-amber-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Główne uniki i taktyka
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {recording.psychometric_profile.glowne_uniki_i_taktyka ||
                      recording.psychometric_profile.styl_komunikacji_prosty}
                  </p>
                </div>

                {/* Karta 3: Czułe punkty (stres fizjologiczny) */}
                <div className="p-4 bg-studio-surface/50 border border-red-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-red-300">
                    <HeartCrack className="w-3.5 h-3.5 text-red-400" />
                    Czułe punkty (stres fizjologiczny)
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {recording.psychometric_profile.surowe_wnioski_ai?.wnioski?.czule_punkty_stres ||
                      (typeof recording.psychometric_profile.czule_punkty_i_leki?.[0] === "object"
                        ? (recording.psychometric_profile.czule_punkty_i_leki[0] as any)?.dlaczego_to_minus || (recording.psychometric_profile.czule_punkty_i_leki[0] as any)?.nazwa_bledu
                        : recording.psychometric_profile.czule_punkty_i_leki?.[0]) ||
                      "Brak gwałtownych skoków napięcia lub drżenia głosu w badanym materiale."}
                  </p>
                </div>

                {/* Karta 4: Spójność (słowa a ciało i głos) */}
                <div className="p-4 bg-studio-surface/50 border border-emerald-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Spójność (słowa a ciało i głos)
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {recording.psychometric_profile.spojnosc_mowy_ze_slowami ||
                      "Wypowiedź i intonacja głosu pozostają spójne z treścią deklaracji."}
                  </p>
                </div>

                {/* Dodatkowe karty dla trybu PEŁNY: Argumentacja, Perswazja, Starcie z adwersarzami */}
                {recording.zakres_analizy !== "behawioralny" && (
                  <>
                    {/* Karta 5: Siła argumentacji (logika a frazesy) */}
                    <div className="p-4 bg-studio-surface/50 border border-cyan-500/30 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Siła argumentacji (logika a frazesy)
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {recording.psychometric_profile.skutecznosc_argumentacji ||
                          recording.psychometric_profile.surowe_wnioski_ai?.wnioski?.sila_argumentacji ||
                          (typeof recording.psychometric_profile.mocne_strony?.[0] === "object"
                            ? (recording.psychometric_profile.mocne_strony[0] as any)?.dlaczego_to_plus || (recording.psychometric_profile.mocne_strony[0] as any)?.nazwa_atutu
                            : recording.psychometric_profile.mocne_strony?.[0]) ||
                          "Brak wystarczającej liczby kontrargumentów do pełnej oceny logiki."}
                      </p>
                    </div>

                    {/* Karta 6: Czy odbiorcy to kupią? (perswazja) */}
                    <div className="p-4 bg-studio-surface/50 border border-blue-500/30 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-blue-300">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        Czy odbiorcy to kupią? (perswazja)
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {recording.psychometric_profile.perswazyjnosc_odbiorcow ||
                          recording.psychometric_profile.surowe_wnioski_ai?.wnioski?.czy_odbiorcy_to_kupia ||
                          "Wiarygodność przekazu zależna od sympatii partyjnych odbiorców."}
                      </p>
                    </div>

                    {/* Karta 7: Pojedynek z adwersarzami lub dziennikarzem */}
                    <div className="p-4 bg-studio-surface/50 border border-purple-500/30 rounded-xl sm:col-span-2 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-purple-300">
                        <Activity className="w-3.5 h-3.5 text-purple-400" />
                        Pojedynek z adwersarzami lub dziennikarzem
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {recording.psychometric_profile.radzenie_z_adwersarzami ||
                          recording.psychometric_profile.surowe_wnioski_ai?.wnioski?.pojedynek_z_adwersarzami ||
                          "Relacja ze studiem zbalansowana, bez bezpośrednich starć."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="p-8 bg-studio-surface/40 border border-cyan-500/30 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-bold text-slate-100">
                  E-PROFILER AI analizuje treść i zachowanie w tym nagraniu...
                </div>
                <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
                  {recording.krok_postepu || "Trwa przetwarzanie ścieżki dźwiękowej i mimiki twarzy."} ({recording.procent_postepu}%)
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-1 rounded-full">
                    Cel profilowania: {targetName} ({targetTag})
                  </span>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="text-[10px] bg-studio-surface hover:bg-slate-800 border border-studio-border text-slate-300 hover:text-white px-2.5 py-1 rounded-full transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Wymuś odświeżenie analizy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Zwijany panel danych technicznych dla ekspertów */}
          <div className="bg-studio-card/90 border border-studio-border/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
            <button
              onClick={() => setShowTechnicalDrawer(!showTechnicalDrawer)}
              className="w-full p-4 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-cyan-300 hover:bg-studio-surface/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                🔬 Twarde pomiary E-PROFILERA (parametry behawioralne i akustyczne)
              </span>
              {showTechnicalDrawer ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showTechnicalDrawer && (
              <div className="p-5 border-t border-studio-border/70 bg-studio-surface/40 text-xs font-mono space-y-3 text-slate-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">Badana osoba:</span>
                    <span className="text-slate-200">{targetName} ({targetTag})</span>
                  </div>
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">Styl komunikacji:</span>
                    <span className="text-slate-200">{recording.psychometric_profile?.styl_komunikacji_prosty || "W trakcie kalibracji..."}</span>
                  </div>
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">Mocne strony i argumenty:</span>
                    <span className="text-slate-200">
                      {typeof recording.psychometric_profile?.mocne_strony?.[0] === "object"
                        ? (recording.psychometric_profile.mocne_strony[0] as any)?.nazwa_atutu || (recording.psychometric_profile.mocne_strony[0] as any)?.punkt
                        : recording.psychometric_profile?.mocne_strony?.[0] || recording.psychometric_profile?.skutecznosc_argumentacji || "Analiza w toku"}
                    </span>
                  </div>
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">Czułe punkty:</span>
                    <span className="text-slate-200">
                      {typeof recording.psychometric_profile?.czule_punkty_i_leki?.[0] === "object"
                        ? (recording.psychometric_profile.czule_punkty_i_leki[0] as any)?.nazwa_bledu || (recording.psychometric_profile.czule_punkty_i_leki[0] as any)?.blad
                        : recording.psychometric_profile?.czule_punkty_i_leki?.[0] || "W normie (brak skoków)"}
                    </span>
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
            onRetry={handleRetry}
          />

          {/* Karta statusu potoku */}
          <div className="bg-studio-card/90 border border-studio-border/80 p-5 text-xs font-mono space-y-2.5 rounded-2xl shadow-xl">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] pb-2 border-b border-studio-border/70 flex items-center justify-between">
              <span>Specyfikacja potoku</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-500/40 rounded">E-PROFILER v2</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Podgląd wideo:</span>
              <span className="text-slate-200 font-semibold">720p H.264 faststart</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Ścieżka dźwiękowa:</span>
              <span className="text-slate-200 font-semibold">16kHz 16-bit Mono WAV</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Rozpoznanie osób:</span>
              <span className="text-cyan-400 font-semibold">Diarizacja + Neural Core AI</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Wizja i Mimika:</span>
              <span className="text-slate-200 font-semibold">Analiza ekspresji i mowy ciała</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Prozodia mowy:</span>
              <span className="text-slate-200 font-semibold">Modulacja tonu i tempo mowy</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Język raportu:</span>
              <span className="text-emerald-400 font-semibold">Prosty język polski</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nota prawna i etyczna */}
      <div className="mt-8 pt-6 border-t border-studio-border/70">
        <LegalNotice />
      </div>
    </div>
  );
}
