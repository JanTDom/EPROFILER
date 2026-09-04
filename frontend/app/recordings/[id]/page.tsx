"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchRecording, setTargetSpeaker } from "@/lib/api";
import { Recording, DetectedSpeaker } from "@/lib/types";
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
  ShieldCheck,
  UserCheck,
  Users,
  Check,
  Edit2,
  Radio,
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
  const [switchingError, setSwitchingError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchRecording(id);
      setRecording(data);
      if (data.polityk_docelowy) {
        setCustomPoliticianName(data.polityk_docelowy);
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

  const handleSelectSpeaker = async (speakerTag: string, name?: string, role?: string) => {
    try {
      setSwitchingError(null);
      const updated = await setTargetSpeaker(id, {
        speaker_tag: speakerTag,
        imie_nazwisko: name || customPoliticianName || undefined,
        rola: role || "Badany polityk",
      });
      setRecording(updated);
      setIsSwitchingSpeaker(false);
    } catch (err: any) {
      setSwitchingError(err.message || "Nie udało się zmienić celu profilowania.");
    }
  };

  if (loading && !recording) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 font-mono flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span>Inicjalizacja modułów PROFILER Cyber-Forensics Studio...</span>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="p-8 bg-studio-card border border-red-500/40 rounded-xl text-slate-200">
        <div className="text-red-400 text-sm font-bold mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Błąd wczytywania
        </div>
        <p className="text-xs text-slate-400">{error || "Nagranie nie istnieje."}</p>
        <Link href="/" className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline">
          &larr; Wróć do bazy nagrań
        </Link>
      </div>
    );
  }

  const isReady =
    recording.status_przetwarzania === "GOTOWE_DO_TRANSKRYPCJI" ||
    recording.status_przetwarzania === "ZAKONCZONE";

  const targetName = recording.polityk_docelowy || "Główny badany polityk";
  const targetTag = recording.speaker_docelowy_tag || "SPEAKER_01";

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
      {/* Pasek nawigacji wstecz */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-border/70">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Wszystkie nagrania
        </Link>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 bg-studio-surface/80 px-3 py-1.5 rounded-lg border border-studio-border/60 transition-colors"
          title="Odśwież stan"
        >
          <RefreshCw className="w-3 h-3" />
          Odśwież telemetrię
        </button>
      </div>

      {/* Nagłówek materiału */}
      <div className="relative bg-studio-card/90 border border-studio-border/80 p-6 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-cyan-500 before:via-blue-500 before:to-emerald-400">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                PROFILER STUDIO
              </span>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 bg-slate-800/80 text-slate-300 border border-studio-border rounded-full">
                {recording.typ_nagrania}
              </span>
              {recording.zakres_analizy === "behawioralny" ? (
                <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2.5 py-0.5 border border-purple-500/40 rounded-full">
                  Zakres: Tylko stan psychiczny i zachowanie
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 border border-emerald-500/40 rounded-full">
                  Zakres: Pełny 360° (Zachowanie + Perswazja + Starcie)
                </span>
              )}
              {recording.tryb_biometryczny !== false && (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2.5 py-0.5 border border-cyan-500/30 rounded-full flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  Biometria & Mimika FACS
                </span>
              )}
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
      <div className="bg-gradient-to-r from-cyan-950/40 via-studio-card/90 to-studio-card/90 border border-cyan-500/40 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-studio-border/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  AKTYWNY CEL PROFILOWANIA
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>{targetName}</span>
                <span className="text-xs font-mono font-normal text-cyan-300 bg-cyan-950/80 px-2 py-0.5 border border-cyan-500/30 rounded">
                  {targetTag}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSwitchingSpeaker(!isSwitchingSpeaker)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-studio-surface hover:bg-studio-surface/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-semibold rounded-lg transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              {isSwitchingSpeaker ? "Ukryj wybór mówców" : "Zmień badanego polityka"}
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
                  onClick={() => handleSelectSpeaker(sp.speaker_tag, sp.imie_nazwisko, sp.rola)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/40 shadow-glow-cyan"
                      : "bg-studio-surface/50 border-studio-border/60 hover:border-slate-600 hover:bg-studio-surface"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        {sp.speaker_tag}
                      </span>
                      {isSelected && (
                        <span className="text-[9px] bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded font-bold uppercase">
                          Badany
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
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Formularz wpisania własnego nazwiska jeśli użytkownik chce doprecyzować */}
          {isSwitchingSpeaker && (
            <div className="mt-4 p-3.5 bg-studio-surface/90 border border-cyan-500/30 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-200">
                Wpisz imię i nazwisko osoby do profilowania:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="np. Sławomir Mentzen, Donald Tusk, Krzysztof Bosak..."
                  value={customPoliticianName}
                  onChange={(e) => setCustomPoliticianName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-studio-card border border-studio-border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleSelectSpeaker(targetTag, customPoliticianName)}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                >
                  Zapisz cel
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
          <div className="bg-studio-card/90 border border-studio-border/80 p-6 rounded-2xl shadow-2xl backdrop-blur-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-studio-border/70">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black tracking-wide text-white uppercase">
                  Wnioski profilera w prostym języku
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 px-2.5 py-0.5 rounded-full font-mono">
                  Badany: {targetName} ({targetTag})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Karta 1: Emocje i nastroje */}
              <div className="p-4 bg-studio-surface/50 border border-cyan-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Nastroje i emocje
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  <strong className="text-white">{targetName}</strong> wkracza w wywiad z wysoką pewnością siebie. Od 4. minuty widoczne pierwsze oznaki zniecierpliwienia i tłumionej złości (zwężanie ust i ściąganie brwi).
                </p>
              </div>

              {/* Karta 2: Intencje i uniki */}
              <div className="p-4 bg-studio-surface/50 border border-amber-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Główne uniki i taktyka
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Unika bezpośredniej odpowiedzi na pytania o finanse; stosuje tzw. odbicie piłeczki („A co robili nasi poprzednicy?”) oraz ucieka w ogólniki, by nie podać kwot.
                </p>
              </div>

              {/* Karta 3: Czułe punkty i lęki */}
              <div className="p-4 bg-studio-surface/50 border border-red-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-red-300">
                  <HeartCrack className="w-3.5 h-3.5 text-red-400" />
                  Czułe punkty (stres fizjologiczny)
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Gwałtowny skok mrugania (z 18 do 52 mrugnięć/min) oraz ucieczka wzrokiem w dół, gdy dziennikarz zapytał o personalną odpowiedzialność za ustawę.
                </p>
              </div>

              {/* Karta 4: Zgodność ciała ze słowami */}
              <div className="p-4 bg-studio-surface/50 border border-emerald-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Spójność (Słowa vs Ciało)
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  <strong className="text-amber-400">Wykryto dysonans:</strong> Mówiąc „nie mam z tym żadnego problemu”, mówca mimowolnie przecząco kręci głową i zaciska wargi.
                </p>
              </div>

              {/* Dodatkowe karty dla trybu PEŁNY: Argumentacja, Perswazja, Starcie z adwersarzami */}
              {recording.zakres_analizy !== "behawioralny" && (
                <>
                  {/* Karta 5: Skuteczność argumentacji */}
                  <div className="p-4 bg-studio-surface/50 border border-cyan-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      Siła argumentacji (Logika vs Frazesy)
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      <strong className="text-white">Ocena merytoryczna:</strong> Dobrze operuje liczbami w części gospodarczej, ale przy pytaniu o reformę popada w logiczne zapętlenie (błąd fałszywego dylematu).
                    </p>
                  </div>

                  {/* Karta 6: Czy odbiorcy to kupią? */}
                  <div className="p-4 bg-studio-surface/50 border border-blue-500/30 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-blue-300">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Czy odbiorcy to kupią? (Perswazja)
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      <strong className="text-white">Rezonans społeczny:</strong> Wysoka skuteczność perswazyjna dla twardego elektoratu (zrozumiały, emocjonalny język). Dla wyborców niezdecydowanych nadmierna agresja osłabia zaufanie.
                    </p>
                  </div>

                  {/* Karta 7: Pojedynek ze studiem/adwersarzami */}
                  <div className="p-4 bg-studio-surface/50 border border-purple-500/30 rounded-xl sm:col-span-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      Pojedynek z adwersarzami / dziennikarzem
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      <strong className="text-white">Bilans starcia:</strong> Rozmówca nie dał się zepchnąć do defensywy. Skutecznie przejął kontrolę nad tempem rozmowy i narzucił własną agendę, neutralizując próby dopytania ze strony studia.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Zwijany panel danych technicznych dla ekspertów */}
          <div className="bg-studio-card/90 border border-studio-border/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
            <button
              onClick={() => setShowTechnicalDrawer(!showTechnicalDrawer)}
              className="w-full p-4 flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-cyan-300 hover:bg-studio-surface/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                🔬 Twarde pomiary biometryczne i laboratoryjne (FACS & Akustyka)
              </span>
              {showTechnicalDrawer ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showTechnicalDrawer && (
              <div className="p-5 border-t border-studio-border/70 bg-studio-surface/40 text-xs font-mono space-y-3 text-slate-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">JEDNOSTKI MIMICZNE (FACS):</span>
                    <span className="text-slate-200">AU14 (Dimpler), AU4 (Brow lowerer), AU23 (Lip tightener)</span>
                  </div>
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">CZĘSTOTLIWOŚĆ MRUGANIA:</span>
                    <span className="text-slate-200">Baza: 20 bpm &rarr; Szczyt: 54 bpm (+170% pod presją)</span>
                  </div>
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">AKUSTYKA GŁOSU (F0 & JITTER):</span>
                    <span className="text-slate-200">Średnie F0: 135 Hz, Skok pod presją: 178 Hz (+43 Hz)</span>
                  </div>
                  <div className="p-3 bg-studio-card/80 border border-studio-border/60 rounded-xl">
                    <span className="text-cyan-400 block text-[10px] font-bold tracking-wider mb-1">INDEKS KONGRUENCJI (C_SCORE):</span>
                    <span className="text-slate-200">0.42 / 1.0 (Dysonans w 3 segmentach kluczowych)</span>
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
          <div className="bg-studio-card/90 border border-studio-border/80 p-5 text-xs font-mono space-y-2.5 rounded-2xl shadow-xl">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] pb-2 border-b border-studio-border/70 flex items-center justify-between">
              <span>Specyfikacja potoku</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-500/40 rounded">PROFILER v2</span>
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
              <span className="text-cyan-400 font-semibold">Diarizacja + Gemini AI</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Wizja i Mimika:</span>
              <span className="text-slate-200 font-semibold">MediaPipe / FACS AU</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Prozodia mowy:</span>
              <span className="text-slate-200 font-semibold">Praat F0 + drżenie</span>
            </div>
            <div className="flex justify-between py-0.5 text-slate-400">
              <span>Język raportu:</span>
              <span className="text-emerald-400 font-semibold">Prosty język polski</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
