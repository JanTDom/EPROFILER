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
  BookOpen,
  Target,
  Flame
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
            2. Profile i klucze API (darmowe vs płatne)
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
            onClick={() => toggleSection("sojusznik-vs-przeciwnik")}
            className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/50 hover:border-rose-400 text-rose-300 hover:text-white transition-all cursor-pointer font-bold"
          >
            6. Sojusznik vs Przeciwnik (Wektory ataku)
          </button>
          <button
            type="button"
            onClick={() => toggleSection("czat-ze-znacznikami")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            7. Czat AI i znaczniki czasu
          </button>
          <button
            type="button"
            onClick={() => toggleSection("pojedynek-1na1")}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            8. Pojedynki 1-na-1
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

      {/* MODUŁ 2: Profile użytkownika oraz klucze API (opcja darmowa i płatna) */}
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
                2. Profile użytkownika oraz klucze API (opcja darmowa i płatna)
              </h2>
              <p className="text-xs text-slate-400">
                Logowanie hasłem, profil główny, profil niezależny oraz dwie opcje API: bezpłatna bez karty i płatna z pełną poufnością
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "logowanie-api" ? "rotate-180 text-purple-400" : ""}`} />
        </div>

        {openSection === "logowanie-api" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {/* Dwa profile w systemie */}
            <div className="p-4 bg-purple-950/30 border border-purple-800/60 rounded-xl space-y-2">
              <h3 className="font-bold text-purple-200 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Dwa profile dostępu w systemie
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Profil główny (hasło sztabowe):</strong> Domyślny profil z centralnym kluczem API. Po zalogowaniu możesz od razu analizować materiały.<br />
                <strong>Profil niezależny (własny klucz API):</strong> Umożliwia wprowadzenie prywatnego klucza API z Google AI Studio, dzięki czemu Twoje analizy są odseparowane i nie obciążają limitów ogólnych.
              </p>
            </div>

            {/* Dwie opcje klucza API Gemini */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Dwie opcje pozyskania i korzystania z API Gemini w Google AI Studio</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Podobnie jak w zaawansowanych systemach analitycznych (np. voxtwin.pl), w Google AI Studio dostępne są dwa modele korzystania z klucza API Gemini:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Opcja 1: Darmowa */}
                <div className="p-4 bg-[#0a0f1d] border border-emerald-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-emerald-900/40 pb-2">
                    <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Opcja 1: Całkowicie darmowa (bez karty)</span>
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 border border-emerald-600/40 rounded">
                      100% BEZPŁATNE
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                    <li><strong>Brak opłat i brak karty:</strong> Wystarczy standardowe, darmowe konto Google (Gmail). Nie musisz podawać numeru karty płatniczej ani konfigurować konta rozliczeniowego.</li>
                    <li><strong>Wysokie limity zapytań:</strong> Pakiet bezpłatny oferuje aż 15 zapytań na minutę (RPM) oraz do 1500 zapytań na dobę dla modeli Flash. W zupełności wystarcza to do codziennej pracy sztabowej i analizy wywiadów.</li>
                    <li><strong>Użycie danych:</strong> W darmowej taryfie Google zastrzega sobie prawo do wykorzystywania zapytań w celach ulepszania modeli AI. W przypadku materiałów jawnych i publicznych wystąpień politycznych nie stanowi to przeszkody.</li>
                  </ul>
                </div>

                {/* Opcja 2: Płatna */}
                <div className="p-4 bg-[#0a0f1d] border border-cyan-500/40 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
                    <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Opcja 2: Płatna Pay-as-you-go (z kartą w Google Cloud)</span>
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 border border-cyan-600/40 rounded">
                      POUFNOŚĆ & BRAK LIMITÓW
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                    <li><strong>Płacisz tylko za rzeczywiste zużycie:</strong> Wymaga podpięcia karty w Google Cloud Billing. Koszty w modelach Gemini Flash są groszowe (ułamki centów za milion tokenów — pełna analiza godzinnego wywiadu to koszt rzędu zaledwie kilku groszy).</li>
                    <li><strong>Brak limitów na minutę:</strong> Sztab może przetwarzać wiele nagrań równolegle bez ryzyka napotkania limitu zapytań (błąd 429) i bez oczekiwania w kolejce.</li>
                    <li><strong>Gwarancja 100% poufności:</strong> Google oficjalnie gwarantuje, że dane przesyłane w płatnym API NIE są wykorzystywane do trenowania modeli sztucznej inteligencji ani przeglądane przez osoby trzecie.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Instrukcja krok po kroku */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-white text-xs uppercase font-mono tracking-wider text-cyan-400">
                Instrukcja krok po kroku: jak wygenerować klucz API w Google AI Studio
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
                  Zaloguj się swoim kontem Google (np. Gmail).
                </li>
                <li>
                  W prawym górnym rogu kliknij niebieski przycisk <strong>„Create API key”</strong> (Utwórz klucz API).
                </li>
                <li>
                  <strong>Dla opcji darmowej (bez karty):</strong> W okienku zaznacz <strong>„Create API key in new project”</strong> (Utwórz klucz w nowym projekcie) i zatwierdź. Klucz zostanie wygenerowany od razu bez podawania żadnych danych płatniczych.<br />
                  <strong>Dla opcji płatnej (Pay-as-you-go):</strong> Wybierz istniejący projekt powiązany z Twoim kontem Google Cloud Billing (z podpiętą kartą płatniczą).
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

      {/* MODUŁ 6: Tryb Sojusznik vs Przeciwnik */}
      <div className="bg-studio-card/75 border border-rose-500/40 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-rose-600 before:via-red-500 before:to-amber-500">
        <div 
          onClick={() => toggleSection("sojusznik-vs-przeciwnik")}
          className="flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider bg-rose-950/90 px-2 py-0.5 rounded border border-rose-500/40">Nowość</span>
                <h2 className="text-lg sm:text-xl font-bold text-white group-hover:text-rose-300 transition-colors">
                  6. Tryb Sojusznik vs Przeciwnik (Wywiad ofensywny i wektory ataku)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Jak badać rywali, dziennikarzy i aktywistów: słabości psychiczne, instrukcja destabilizacji oraz eksport do PDF
              </p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openSection === "sojusznik-vs-przeciwnik" ? "rotate-180 text-rose-400" : ""}`} />
        </div>

        {openSection === "sojusznik-vs-przeciwnik" && (
          <div className="pt-4 border-t border-slate-800/80 space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              W polityce i mediach analiza nie służy wyłącznie audytowi własnego kandydata. W walce wyborczej i debacie publicznej równie kluczowa jest wiedza o oponencie: <strong>jakie są jego emocje, lęki, kompleksy oraz jak można go skutecznie wyprowadzić z równowagi przed kamerami</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/90 border border-emerald-500/40 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Tryb 🛡️ Sojusznik (Audyt sztabowy)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dla naszych kandydatów i współpracowników. Skupia się na obronie: wygaszaniu wpadek, wzmacnianiu naturalnych atutów, likwidacji niepożądanych nawyków mowy ciała oraz skryptach gotowych ripost przed trudnymi wywiadami.
                </p>
              </div>

              <div className="p-4 bg-slate-900/90 border border-rose-500/50 rounded-xl space-y-2 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <Target className="w-4 h-4 text-rose-400" />
                  <span>Tryb 🎯 Przeciwnik (Wywiad ofensywny & Wektory ataku)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dla każdego oponenta: polityka rywalizującej formacji, ale również stronniczego dziennikarza czy agresywnego działacza społecznego. Skupia się na ataku: obnażaniu pychy, wywoływaniu złości i przygotowywaniu amunicji do spotów.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Kluczowe elementy Dossier Ataku na Przeciwnika:
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-1.5">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    1. Słabości psychiczne i instrukcja destabilizacji
                  </span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Diagnoza kompleksów i wycieków behawioralnych (np. grymasy pogardy AU14, przyspieszony oddech, drżenie krtani). Każdy punkt zawiera czerwoną ramkę <strong>„Jak wyprowadzić z równowagi”</strong> — konkretną strategię, jak sprawić, by oponent stracił panowanie nad sobą na wizji.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1.5">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                    2. Wektory argumentacyjne i pytania-pułapki
                  </span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Wypunktowanie sprzeczności i luk logicznych z dosłownymi cytatami. System generuje <strong>gotowe pytania-pułapki</strong> (np. pytania zamknięte typu „Tak czy Nie?”), uniemożliwiające wymijającą odpowiedź przed widzami.
                  </p>
                </div>

                <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl space-y-1.5">
                  <span className="font-bold text-red-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-red-400" />
                    3. Amunicja uderzeniowa do spotów (tzw. samobóje)
                  </span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Wychwytuje najbardziej kompromitujące wypowiedzi oponenta wraz z rekomendacją montażu — gotowe fragmenty do wycięcia na rolki w social media (TikTok/X/Facebook) w ciągu 2 godzin od nagrania.
                  </p>
                </div>

                <div className="p-3.5 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1.5">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    4. Strategiczne dyrektywy ofensywne
                  </span>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Praktyczne wytyczne dla naszego reprezentanta idącego na starcie z danym oponentem: na co uważać, jakich tematów nie dotykać, a w jakie punkty uderzać bezlitośnie.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-2">
              <strong className="text-white block text-xs">Gdzie możesz włączać i przełączać tryb Przeciwnika?</strong>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                <li><strong>Na stronie głównej (pasek szybkiego startu):</strong> Przed wklejeniem linku możesz kliknąć przełącznik <code>[ Przeciwnik ]</code>.</li>
                <li><strong>W nagłówku nagrania (HUD):</strong> Przycisk <code>[ 🎯 Przeciwnik (Wektory ataku) ]</code> przełącza widok i dane w ułamku sekundy (0 ms).</li>
                <li><strong>W oknie wyboru mówcy:</strong> Klikając „Wskaż innego mówcę”, możesz przypisać relację „Przeciwnik” do konkretnej wykrytej osoby (np. SPEAKER_00 lub SPEAKER_01).</li>
                <li><strong>Eksport do PDF:</strong> Po wybraniu trybu Przeciwnik, górny przycisk pobierania zmienia się w <code>Raport oponenta PDF (Wektory ataku)</code> i generuje dokument z pełnym dossier wywiadu ofensywnego.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* MODUŁ 7: Sztabowy czat ze znacznikami czasu */}
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
                7. Interaktywny czat AI z nagraniem i klikalne znaczniki czasu
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

      {/* MODUŁ 8: Pojedynki 1-na-1 */}
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
                8. Pojedynek 1-na-1 (starcie kandydatów)
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
