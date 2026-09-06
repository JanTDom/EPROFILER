"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  HelpCircle, 
  Key, 
  Film, 
  Mic, 
  MonitorPlay, 
  MessageSquare, 
  Swords, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Eye, 
  FileText, 
  ChevronRight,
  ChevronDown,
  ArrowRight,
  BookOpen
} from "lucide-react";

export default function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>("wprowadzenie");

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 px-4 sm:px-6">
      {/* Nagłówek główny instrukcji */}
      <div className="relative bg-studio-card/85 border border-cyan-500/30 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-cyan-500 before:via-blue-500 before:to-emerald-400">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-950/60 px-2.5 py-1 border border-cyan-500/40 rounded-full flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            Centrum pomocy i instrukcja obsługi
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 border border-emerald-500/40 rounded-full">
            Wersja systemu: 2026.1
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
          Instrukcja obsługi systemu E-PROFILER
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
          Kompleksowy przewodnik krok po kroku po wszystkich funkcjach platformy: od konfiguracji profilu i darmowego klucza AI, przez analizę wideo i nagrań audio, po interpretację audytu sztabowego, czat ze znacznikami czasu oraz pojedynki kandydatów.
        </p>

        {/* Szybki spis treści */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => toggleSection("wprowadzenie")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            1. Wprowadzenie
          </button>
          <button
            type="button"
            onClick={() => toggleSection("logowanie-api")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            2. Profile i darmowy klucz API
          </button>
          <button
            type="button"
            onClick={() => toggleSection("metody-wprowadzania")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            3. Cztery metody wprowadzania
          </button>
          <button
            type="button"
            onClick={() => toggleSection("wideo-vs-audio")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            4. Wideo vs nagrania audio
          </button>
          <button
            type="button"
            onClick={() => toggleSection("raport-audytu")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            5. Czytanie raportu audytu
          </button>
          <button
            type="button"
            onClick={() => toggleSection("czat-ze-znacznikami")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            6. Czat AI i znaczniki czasu
          </button>
          <button
            type="button"
            onClick={() => toggleSection("pojedynek-1na1")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            7. Pojedynki 1-na-1
          </button>
        </div>
      </div>

      {/* MODUŁ 1: Wprowadzenie do systemu */}
      <div className="bg-studio-card/75 border border-studio-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div 
          onClick={() => toggleSection("wprowadzenie")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                1. Czym jest E-PROFILER i jak działa
              </h2>
              <p className="text-xs text-slate-400">
                Misja systemu, automatyczne rozpoznawanie mówców i brak laurek
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "wprowadzenie" ? "rotate-180 text-cyan-400" : ""}`} />
        </div>

        {openSection === "wprowadzenie" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              E-PROFILER to multimodalna platforma wywiadu behawioralnego i audytu sztabowego. Służy do pogłębionej analizy wystąpień publicznych polityków, kandydatów, rzeczników prasowych oraz osób uczestniczących w wywiadach telewizyjnych, radiowych czy debatach.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Automatyczny focus na celu
                </span>
                <p className="text-[11px] text-slate-400">
                  System sam odróżnia dziennikarza prowadzącego od badanego gościa na podstawie powitań i dynamiki pytań.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Bezwzględna szczerość (zero laurek)
                </span>
                <p className="text-[11px] text-slate-400">
                  Sztab wyborczy nie potrzebuje pochlebstw. Silnik punktuje słabości, nielogiczności i momenty utraty panowania.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
                <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Gotowe skrypty naprawcze
                </span>
                <p className="text-[11px] text-slate-400">
                  Do każdego błędu i trudnego pytania system generuje gotową formułę sztabową: „Zamiast X mów Y”.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 2: Logowanie i darmowy klucz Google AI Studio */}
      <div className="bg-studio-card/75 border border-studio-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div 
          onClick={() => toggleSection("logowanie-api")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                2. Profile użytkownika i darmowy klucz API
              </h2>
              <p className="text-xs text-slate-400">
                Logowanie hasłem, profil główny, profil niezależny oraz instrukcja krok po kroku
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "logowanie-api" ? "rotate-180 text-purple-400" : ""}`} />
        </div>

        {openSection === "logowanie-api" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="p-4 bg-purple-950/30 border border-purple-800/60 rounded-xl space-y-2">
              <h3 className="font-bold text-purple-200 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Dwa profile dostępu w systemie
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Profil główny (hasło sztabowe):</strong> Domyślny profil z centralnym kluczem API. Po zalogowaniu możesz od razu analizować materiały.<br />
                <strong>Profil niezależny (własny klucz API):</strong> Umożliwia wprowadzenie prywatnego, darmowego klucza API, dzięki czemu Twoje analizy są odseparowane i nie obciążają limitów ogólnych.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider text-cyan-400">
                Instrukcja krok po kroku: jak bezpłatnie uzyskać własny klucz API
              </h4>
              <ol className="space-y-3 list-decimal list-inside text-slate-300 text-xs leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <li>
                  Wejdź na oficjalną stronę <strong>Google AI Studio</strong> pod adresem:{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline font-semibold inline-flex items-center gap-1"
                  >
                    https://aistudio.google.com/app/apikey
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  Zaloguj się swoim zwykłym kontem Google (np. Gmail). Usługa jest całkowicie bezpłatna dla użytku analitycznego.
                </li>
                <li>
                  W prawym górnym rogu kliknij niebieski przycisk <strong>„Create API key”</strong> (Utwórz klucz API).
                </li>
                <li>
                  W okienku zaznacz <strong>„Create API key in new project”</strong> (Utwórz klucz w nowym projekcie) i zaakceptuj warunki.
                </li>
                <li>
                  Skopiuj wygenerowany ciąg znaków (zaczyna się zwykle od liter <code>AIzaSy...</code>).
                </li>
                <li>
                  Wróć do E-PROFILER, przełącz profil na <strong>„Profil niezależny”</strong>, wklej klucz w pole i kliknij <strong>„Zapisz klucz na stałe”</strong>. Klucz zostanie bezpiecznie zapamiętany w Twojej przeglądarce i nie wygaśnie po odświeżeniu strony.
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 3: Cztery metody wprowadzania materiału */}
      <div className="bg-studio-card/75 border border-studio-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div 
          onClick={() => toggleSection("metody-wprowadzania")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                3. Cztery metody wprowadzania materiału
              </h2>
              <p className="text-xs text-slate-400">
                Link URL, plik wideo, plik audio oraz rejestrator chronionych stron VOD
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "metody-wprowadzania" ? "rotate-180 text-blue-400" : ""}`} />
        </div>

        {openSection === "metody-wprowadzania" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center font-mono text-[11px]">1</span>
                  <span>Bezpośredni link URL (YouTube)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Wklej adres publicznego wywiadu z YouTube (np. z Kanału Zero, RMF FM, TVN24, Onet itp.). Silnik natychmiast pobiera kontekst i przeprowadza profilowanie bez konieczności ściągania pliku na Twój komputer.
                </p>
              </div>

              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-500/50 flex items-center justify-center font-mono text-[11px]">2</span>
                  <span>Plik wideo z dysku komputera</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Obsługiwane formaty: <code>.mp4, .webm, .mov, .mkv</code>. Idealne rozwiązanie do analizy surowych nagrań ze sztabu, prób przed wystąpieniem w studiu lub nagrań konferencji prasowych.
                </p>
              </div>

              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-500/50 flex items-center justify-center font-mono text-[11px]">3</span>
                  <span>Plik audio / podcast z dysku</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Obsługiwane formaty: <code>.mp3, .wav, .m4a, .aac, .ogg, .flac, .opus</code>. Przeznaczone do wywiadów radiowych, podcastów politycznych i nagrań z dyktafonu. System przełącza się w dedykowany tryb akustyczny.
                </p>
              </div>

              <div className="p-4 bg-slate-900/80 border border-purple-800/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold">
                  <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-500/50 flex items-center justify-center font-mono text-[11px]">4</span>
                  <span>Karta / DRM (asystent VOD)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pozwala rejestrować materiały z serwisów chronionych DRM (np. TVN24 GO, TVP VOD, Polsat Box Go). Wpisujesz link, logujesz się w nowej karcie i nagrywasz fragment z dźwiękiem bezpośrednio do analizy.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 4: Wideo vs Audio */}
      <div className="bg-studio-card/75 border border-studio-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div 
          onClick={() => toggleSection("wideo-vs-audio")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                4. Różnice w profilowaniu: nagrania wideo a audio
              </h2>
              <p className="text-xs text-slate-400">
                Dlaczego w nagraniach audio wyłączona jest analiza mimiki i na czym skupia się silnik
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "wideo-vs-audio" ? "rotate-180 text-amber-400" : ""}`} />
        </div>

        {openSection === "wideo-vs-audio" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>W nagraniach wideo (analiza 360°)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  <li><strong>Jednostki FACS (Ekman):</strong> Uśmieszki wyższości (AU14), tłumiony gniew (AU4/AU24), grymasy strachu (AU1+AU2+AU4).</li>
                  <li><strong>Mikroekspresje:</strong> Ułamkowe wycieki emocjonalne trwające poniżej 200 ms.</li>
                  <li><strong>Kontakt wzrokowy:</strong> Uciekanie wzrokiem w dół lub w bok przy trudnych pytaniach.</li>
                  <li><strong>Niewerbalna mowa ciała:</strong> Pozycje obronne, zaciskanie dłoni, wiercenie się na fotelu.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Mic className="w-4 h-4 text-amber-400" />
                  <span>W nagraniach audio / podcastach</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                  <li><strong>Brak halucynacji:</strong> Silnik nie zmyśla mimiki twarzy ani ruchów ciała.</li>
                  <li><strong>Prozodia i intonacja:</strong> Drżenie głosu (jitter), załamania krtani, niepewność fonacyjna.</li>
                  <li><strong>Częstotliwość F0:</strong> Skoki wysokości głosu pod wpływem stresu lub prowokacji dziennikarza.</li>
                  <li><strong>Dykcja i tempo mowy:</strong> Pauzy retoryczne, natrętne wypełniacze („eee”, „yyy”), potoki słów.</li>
                  <li><strong>Treść i uniki:</strong> Luki logiczne, niespełnialne obietnice, agresywny ton, amunicja dla konkurencji.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 5: Jak czytać raport audytu */}
      <div className="bg-studio-card/75 border border-studio-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div 
          onClick={() => toggleSection("raport-audytu")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                5. Jak czytać wygenerowany raport audytu
              </h2>
              <p className="text-xs text-slate-400">
                Werdykt, ocena 1-10, amunicja dla oponentów, skrypty naprawcze i raport PDF
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "raport-audytu" ? "rotate-180 text-emerald-400" : ""}`} />
        </div>

        {openSection === "raport-audytu" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Raport audytu składa się z kilku sekcji ułożonych w logicznym porządku:
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                <strong className="text-white block mb-1">Werdykt i ocena punktowa (1-10):</strong>
                <p className="text-xs text-slate-400">
                  Ocena jest celowo kalibrowana ku środkowi skali (zwykle 4-7/10). Wystąpienie pod ogniem pytań prawie nigdy nie jest „idealne 10”, ani „całkowitą katastrofą 1”. Ocena odzwierciedla realną odporność psychiczną polityka.
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                <strong className="text-white block mb-1">Główne atuty i błędy z cytatami:</strong>
                <p className="text-xs text-slate-400">
                  Każdy wniosek zawiera dosłowny cytat z wypowiedzi, dzięki czemu sztab od razu wie, o który moment rozmowy chodzi.
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                <strong className="text-white block mb-1">Amunicja dla oponentów (tzw. samobóje):</strong>
                <p className="text-xs text-slate-400">
                  Najważniejsza sekcja wczesnego ostrzegania: wyłapuje niefortunne zdania, które konkurencyjny sztab wytnie na rolki w mediach społecznościowych lub spoty wyborcze.
                </p>
              </div>

              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                <strong className="text-white block mb-1">Gotowe riposty zamiast błędów:</strong>
                <p className="text-xs text-slate-400">
                  Konkretne szablony komunikacyjne opracowane przez spin doktorów, które polityk powinien wdrożyć przed kolejnym wystąpieniem.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 6: Sztabowy czat ze znacznikami czasu */}
      <div className="bg-studio-card/75 border border-studio-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div 
          onClick={() => toggleSection("czat-ze-znacznikami")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                6. Interaktywny czat AI z nagraniem i klikalne znaczniki czasu
              </h2>
              <p className="text-xs text-slate-400">
                Rozmowa z asystentem sztabowym i automatyczne przewijanie odtwarzacza
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "czat-ze-znacznikami" ? "rotate-180 text-cyan-400" : ""}`} />
        </div>

        {openSection === "czat-ze-znacznikami" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Pod raportem audytu znajduje się <strong>sztabowy czat AI</strong>. Możesz w nim zadawać dowolne pytania dotyczące nagrania, np.:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <span className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                „Wskaż najgorszy moment i największą wpadkę badanego polityka”
              </span>
              <span className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                „Przygotuj 3 riposty na zarzut o deficyt budżetowy”
              </span>
              <span className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                „Czy polityk przekonująco odpowiadał na pytanie o podatki?”
              </span>
            </div>
            <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-xs space-y-2 text-cyan-200">
              <div className="flex items-center gap-2 font-bold text-white">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Klikalne znaczniki czasu w formacie [MM:SS]</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Gdy w odpowiedzi czatu pojawi się znacznik czasu (np. <code>[04:12]</code>), wystarczy w niego kliknąć. Odtwarzacz wideo lub audio natychmiast przewinie nagranie do tego ułamka sekundy, abyś mógł na własne oczy i uszy zweryfikować zachowanie polityka!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 7: Pojedynki 1-na-1 */}
      <div className="bg-studio-card/75 border border-studio-border/80 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <div 
          onClick={() => toggleSection("pojedynek-1na1")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                7. Pojedynek 1-na-1 (starcie kandydatów)
              </h2>
              <p className="text-xs text-slate-400">
                Porównanie dwóch wystąpień, wskaźnik dominacji i przeciąganie liny
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "pojedynek-1na1" ? "rotate-180 text-amber-400" : ""}`} />
        </div>

        {openSection === "pojedynek-1na1" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Zakładka <strong>„Pojedynek 1-na-1”</strong> w górnym menu pozwala bezpośrednio zestawić ze sobą dwa nagrania — np. tego samego kandydata przed szkoleniem i po szkoleniu, albo dwóch rywali w debacie prezydenckiej.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <span className="font-bold text-white text-xs">Wskaźnik przeciągania liny (Tug-of-War):</span>
                <p className="text-xs text-slate-400">
                  Dynamiczny pasek dominacji pokazuje, który z kandydatów zachował większą kontrolę nad rozmową, wykazał się wyższym opanowaniem i popełnił mniej błędów wizerunkowych.
                </p>
              </div>

              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <span className="font-bold text-white text-xs">Tabela porównawcza parametrów:</span>
                <p className="text-xs text-slate-400">
                  Zestawienie punkt po punkcie: opanowanie, logiczność argumentacji, nośność medialna setek oraz podatność na manipulacje przeciwnika.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 8: Zgodność prawna i etyczna */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-xs text-slate-400 space-y-2 leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Nota prawna i standardy etyczne (AI Act & RODO)</span>
        </div>
        <p>
          System E-PROFILER przetwarza wyłącznie publicznie dostępne materiały audiowizualne osób pełniących funkcje publiczne (na mocy art. 85 RODO — działalność dziennikarska, analityczna i naukowa). System nie dokonuje zdalnej identyfikacji biometrycznej w przestrzeni publicznej w rozumieniu zakazów Rozporządzenia o Sztucznej Inteligencji (AI Act), lecz służy jako profesjonalne narzędzie warsztatowe marketingu politycznego.
        </p>
      </div>

      {/* Przycisk przejścia do nowej analizy */}
      <div className="text-center pt-4">
        <Link
          href="/recordings/new"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
        >
          <span>Rozpocznij nową analizę</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
