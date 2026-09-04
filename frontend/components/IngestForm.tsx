"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Upload, Loader2, ArrowRight, Eye, Sparkles, UserCheck } from "lucide-react";
import { createRecordingFromUrl, uploadRecordingFile } from "@/lib/api";
import { RecordingType } from "@/lib/types";
import { LegalNotice } from "./LegalNotice";

export const IngestForm: React.FC = () => {
  const router = useRouter();
  const [tab, setTab] = useState<"url" | "file">("url");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pola formularza
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [targetPolitician, setTargetPolitician] = useState("");
  const [politicianRole, setPoliticianRole] = useState("Badany polityk");
  const [recordingType, setRecordingType] = useState<RecordingType>("wywiad");
  const [publicationDate, setPublicationDate] = useState("");
  const [enableBiometrics, setEnableBiometrics] = useState(true);
  const [analysisScope, setAnalysisScope] = useState<"pelny" | "behawioralny">("pelny");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "url") {
        if (!url.trim()) {
          throw new Error("Wklej poprawny adres URL do nagrania.");
        }
        const created = await createRecordingFromUrl({
          url: url.trim(),
          tytul: title.trim() || undefined,
          typ_nagrania: recordingType,
          data_publikacji: publicationDate || undefined,
          tryb_biometryczny: enableBiometrics,
          zakres_analizy: analysisScope,
          polityk_docelowy: targetPolitician.trim() || undefined,
          rola_polityka: politicianRole,
        });
        router.push(`/recordings/${created.id}`);
      } else {
        if (!selectedFile) {
          throw new Error("Wybierz plik wideo z dysku.");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (title.trim()) formData.append("tytul", title.trim());
        formData.append("typ_nagrania", recordingType);
        if (publicationDate) formData.append("data_publikacji", publicationDate);
        formData.append("tryb_biometryczny", enableBiometrics ? "true" : "false");
        formData.append("zakres_analizy", analysisScope);
        if (targetPolitician.trim()) formData.append("polityk_docelowy", targetPolitician.trim());
        formData.append("rola_polityka", politicianRole);

        const created = await uploadRecordingFile(formData);
        router.push(`/recordings/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas wprowadzania materiału.");
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto bg-studio-card/85 border border-studio-border/80 p-7 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-cyan-500 before:via-blue-500 before:to-emerald-400">
      {/* Narożniki HUD */}
      <div className="absolute top-3 left-3 w-2 h-2 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute top-3 right-3 w-2 h-2 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-2 h-2 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-2 h-2 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-cyan-950/60 px-2.5 py-1 border border-cyan-500/40 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            PROFILER FORENSICS LAB
          </span>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-950/40 px-2.5 py-0.5 border border-emerald-500/30 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Język zrozumiały dla każdego
          </span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">
          Wprowadź materiał do profilowania
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Wprowadź link lub plik wideo, aby przeprowadzić multimodalną analizę emocji, intencji, mocnych i słabych stron, czułych punktów oraz zbieżności mowy ciała ze słowami.
        </p>
      </div>

      {/* Wybór metody wprowadzania */}
      <div className="flex border-b border-studio-border/80 mb-6 bg-studio-surface/50 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-md transition-all ${
            tab === "url"
              ? "bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-cyan-400" />
          Link URL (YouTube / wideo)
        </button>
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-md transition-all ${
            tab === "file"
              ? "bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          Plik z dysku (mp4, mov, webm)
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-ping" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === "url" ? (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Adres URL nagrania *</span>
              <span className="text-[10px] text-slate-500 font-mono">np. YouTube, wywiad, debata</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 font-mono transition-all"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Wybierz plik wideo *
            </label>
            <input
              type="file"
              required
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-slate-200 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer focus:outline-none focus:border-cyan-400 transition-all"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Format wystąpienia
            </label>
            <select
              value={recordingType}
              onChange={(e) => setRecordingType(e.target.value as RecordingType)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 transition-all"
            >
              <option value="wywiad" className="bg-slate-900 text-white">Wywiad (1 na 1)</option>
              <option value="debata" className="bg-slate-900 text-white">Debata / Panel dyskusyjny</option>
              <option value="przemowienie" className="bg-slate-900 text-white">Przemówienie / Oświadczenie</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Data publikacji / emisji
            </label>
            <input
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Tytuł opcjonalny (jeśli puste, pobrany automatycznie)
          </label>
          <input
            type="text"
            placeholder="np. Debata prezydencka — Starcie kandydatów"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 transition-all"
          />
        </div>

        {/* Wskazanie badanego polityka (Kluczowe przy wielu mówcach) */}
        <div className="p-4 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-slate-900/40 border border-cyan-500/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Cel profilowania (Kogo badamy?)</span>
            </label>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/70 px-2 py-0.5 border border-cyan-500/40 rounded">
              ROZPOZNAWANIE MÓWCÓW
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Gdy w nagraniu rozmawia kilku polityków lub dziennikarz zadaje pytania, wskaż nazwisko osoby, którą system ma zidentyfikować i prześwietlić (jej emocje, mimikę, mowę ciała i reakcje na stres).
          </p>

          <div>
            <input
              type="text"
              placeholder="np. Donald Tusk, Sławomir Mentzen, Mateusz Morawiecki... (lub puste: automatyczne wykrycie)"
              value={targetPolitician}
              onChange={(e) => setTargetPolitician(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#0b101b] border border-cyan-500/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:bg-[#0e1626] focus:ring-1 focus:ring-cyan-400/30 font-medium transition-all"
            />
          </div>

          {/* Szybkie presety */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
            <span className="text-slate-500 font-mono">Szybki wybór:</span>
            {["Donald Tusk", "Mateusz Morawiecki", "Sławomir Mentzen", "Rafał Trzaskowski", "Krzysztof Bosak"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTargetPolitician(name)}
                className={`px-2 py-0.5 border rounded transition-colors ${
                  targetPolitician === name
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                    : "bg-studio-surface border-studio-border hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300"
                }`}
              >
                {name}
              </button>
            ))}
            {targetPolitician && (
              <button
                type="button"
                onClick={() => setTargetPolitician("")}
                className="px-2 py-0.5 text-slate-400 hover:text-red-400 underline transition-colors"
              >
                Wyczyść
              </button>
            )}
          </div>
        </div>

        {/* Wybór zakresu profilowania: Oceń wszystko vs Tylko stan psychiczny */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Zakres oceny PROFILERA *
            </label>
            <span className="text-[10px] text-cyan-400 font-mono">Wybierz tryb analizy</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opcja 1: Oceń wszystko */}
            <div
              onClick={() => setAnalysisScope("pelny")}
              className={`p-4 border cursor-pointer transition-all rounded-xl relative overflow-hidden ${
                analysisScope === "pelny"
                  ? "border-cyan-500/80 bg-cyan-950/30 ring-1 ring-cyan-500/50 shadow-glow-cyan"
                  : "border-studio-border/70 bg-studio-surface/40 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="radio"
                  name="scope"
                  checked={analysisScope === "pelny"}
                  onChange={() => setAnalysisScope("pelny")}
                  className="text-cyan-400 focus:ring-cyan-400"
                />
                <span className={`text-xs font-bold ${analysisScope === "pelny" ? "text-cyan-300" : "text-slate-300"}`}>
                  Oceń wszystko (Zalecane)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pl-5 leading-relaxed">
                Bada <strong className="text-slate-200">zachowanie, emocje i lęki</strong> oraz <strong className="text-slate-200">skuteczność argumentacji</strong>, czy odbiorcy „kupią” przekaz i jak mówca radzi sobie w starciu z adwersarzami.
              </p>
            </div>

            {/* Opcja 2: Tylko zachowanie i stan psychiczny */}
            <div
              onClick={() => setAnalysisScope("behawioralny")}
              className={`p-4 border cursor-pointer transition-all rounded-xl relative overflow-hidden ${
                analysisScope === "behawioralny"
                  ? "border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-glow-emerald"
                  : "border-studio-border/70 bg-studio-surface/40 hover:border-slate-700 text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="radio"
                  name="scope"
                  checked={analysisScope === "behawioralny"}
                  onChange={() => setAnalysisScope("behawioralny")}
                  className="text-emerald-400 focus:ring-emerald-400"
                />
                <span className={`text-xs font-bold ${analysisScope === "behawioralny" ? "text-emerald-300" : "text-slate-300"}`}>
                  Tylko zachowanie i psychika
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pl-5 leading-relaxed">
                Czyste profilowanie psychologiczne i biometryczne: <strong className="text-slate-200">emocje, lęki, mimika, drżenie głosu i mowa ciała</strong> — bez oceniania polityki i argumentów.
              </p>
            </div>
          </div>
        </div>

        {/* Przełącznik modułu biometryczno-psychometrycznego */}
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/30 via-studio-surface/60 to-studio-surface/40 border border-cyan-500/30 rounded-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableBiometrics}
              onChange={(e) => setEnableBiometrics(e.target.checked)}
              className="mt-1 rounded border-cyan-500/50 text-cyan-500 focus:ring-cyan-400 bg-studio-surface"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Włącz zaawansowaną biometrię wideo (mimika FACS, wzrok, drżenie głosu)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Uruchamia klatkową analizę mikroruchów twarzy, częstotliwości mrugania i wariancji częstotliwości tonu podstawowego F0.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-glow-cyan disabled:opacity-50 mt-5 active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              Inicjalizacja PROFILERA...
            </>
          ) : (
            <>
              Rozpocznij profilowanie
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-studio-border/70">
        <LegalNotice />
      </div>
    </div>
  );
};
