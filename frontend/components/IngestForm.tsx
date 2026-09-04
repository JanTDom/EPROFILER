"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Upload, Loader2, ArrowRight, Eye, Sparkles } from "lucide-react";
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
  const [recordingType, setRecordingType] = useState<RecordingType>("wywiad");
  const [publicationDate, setPublicationDate] = useState("");
  const [enableBiometrics, setEnableBiometrics] = useState(true);

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

        const created = await uploadRecordingFile(formData);
        router.push(`/recordings/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Wystąpił błąd podczas wprowadzania materiału.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white border border-border p-6 shadow-sm">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200">
            PROFILER STUDIO
          </span>
          <span className="text-xs text-blue-600 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" />
            Wersja z prostym językiem
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-950">
          Wprowadź materiał do profilowania
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Przeanalizuj wystąpienie polityka pod kątem emocji, intencji, mocnych i słabych stron, czułych punktów oraz zbieżności mowy ciała ze słowami.
        </p>
      </div>

      {/* Wybór metody wprowadzania */}
      <div className="flex border-b border-border mb-6">
        <button
          type="button"
          onClick={() => setTab("url")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === "url"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          Link URL (YouTube i inne)
        </button>
        <button
          type="button"
          onClick={() => setTab("file")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === "file"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Plik z dysku (mp4, mov, webm)
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === "url" ? (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Adres URL nagrania *
            </label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border focus:outline-none focus:border-slate-900 font-mono"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Wybierz plik wideo *
            </label>
            <input
              type="file"
              required
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 text-xs border border-border focus:outline-none focus:border-slate-900"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Format wystąpienia
            </label>
            <select
              value={recordingType}
              onChange={(e) => setRecordingType(e.target.value as RecordingType)}
              className="w-full px-3 py-2 text-xs border border-border focus:outline-none focus:border-slate-900 bg-white"
            >
              <option value="wywiad">Wywiad (1 na 1)</option>
              <option value="debata">Debata / Panel dyskusyjny</option>
              <option value="przemowienie">Przemówienie / Oświadczenie</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Data publikacji / emisji
            </label>
            <input
              type="date"
              value={publicationDate}
              onChange={(e) => setPublicationDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Tytuł opcjonalny (jeśli puste, pobrany automatycznie)
          </label>
          <input
            type="text"
            placeholder="np. Debata prezydencka — Starcie kandydatów"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-border focus:outline-none focus:border-slate-900"
          />
        </div>

        {/* Przełącznik modułu biometryczno-psychometrycznego */}
        <div className="p-3 bg-blue-50/70 border border-blue-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableBiometrics}
              onChange={(e) => setEnableBiometrics(e.target.checked)}
              className="mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Włącz zaawansowany moduł biometrii i mowy ciała PROFILER</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                Bada tempo mrugania, ucieczkę wzroku, mikroekspresje twarzy (FACS) i drżenie głosu, a następnie tłumaczy odczyty na prosty, intuicyjny język polski.
              </p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uruchamianie PROFILERA...
            </>
          ) : (
            <>
              Rozpocznij profilowanie
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-border">
        <LegalNotice />
      </div>
    </div>
  );
};
