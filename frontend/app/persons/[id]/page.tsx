"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  BrainCircuit, 
  ArrowLeft, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert, 
  Target, 
  Scale, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Flame, 
  Activity, 
  FileText, 
  Clock, 
  ExternalLink,
  MessageSquare,
  Zap,
  Split,
  Eye
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { fetchPersonDossier, bootstrapPersonKnowledge, reconcilePersonRecordings } from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PersonDossierPage({ params }: PageProps) {
  const { id } = use(params);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stances" | "flip_flops" | "vulnerabilities" | "rhetoric" | "facts" | "baseline">("stances");
  const [bootstrapping, setBootstrapping] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const loadDossier = async () => {
    setLoading(true);
    const data = await fetchPersonDossier(id);
    setDossier(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDossier();
  }, [id]);

  const handleBootstrap = async () => {
    try {
      setBootstrapping(true);
      await bootstrapPersonKnowledge(id);
      await loadDossier();
    } catch (e) {
      alert("Błąd zasilania z sieci. Upewnij się, że backend i klucz API są skonfigurowane.");
    } finally {
      setBootstrapping(false);
    }
  };

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      await reconcilePersonRecordings(id);
      await loadDossier();
    } catch (e) {
      alert("Błąd przeliczania nagrań.");
    } finally {
      setReconciling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Pobieranie dossier wywiadowczego...</p>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!dossier || !dossier.person) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
        <AppHeader />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Profil nie został znaleziony</h2>
          <p className="text-slate-400 text-sm mb-6">Osoba o tym identyfikatorze nie istnieje w bazie.</p>
          <Link href="/persons" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Wróć do katalogu
          </Link>
        </main>
        <AppFooter />
      </div>
    );
  }

  const { person, baseline, stances, flip_flops, vulnerabilities, rhetorical_patterns, external_facts, recordings, stats } = dossier;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Nawigacja powrotu */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/persons"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Wróć do katalogu polityków
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBootstrap}
              disabled={bootstrapping}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/10 transition-all disabled:opacity-50"
              title="Pobierz oficjalne poglądy, tło i znane fakty z sieci"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${bootstrapping ? "animate-spin" : ""}`} />
              {bootstrapping ? "Zasilanie z sieci..." : "Wzbogać z sieci"}
            </button>

            <button
              onClick={handleReconcile}
              disabled={reconciling}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
              title="Przelicz ponownie wszystkie zakończone nagrania tego polityka"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? "animate-spin" : ""}`} />
              {reconciling ? "Przeliczanie..." : "Przelicz nagrania"}
            </button>
          </div>
        </div>

        {/* Nagłówek Dossier */}
        <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  {person.partia || "Brak przynależności"}
                </span>
                {person.funkcja && (
                  <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium">
                    {person.funkcja}
                  </span>
                )}
                <span className="text-xs text-slate-500 font-mono">
                  ID: {person.id.slice(0, 8)}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {person.imie_nazwisko}
              </h1>

              {/* Aliasy i warianty nazwiska */}
              {person.aliasy && person.aliasy.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  <span className="text-slate-500 font-semibold">Rozpoznawane aliasy / literówki:</span>
                  {person.aliasy.map((a: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-300 font-mono text-[11px]"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Szybka statystyka w nagłówku */}
            <div className="flex items-center gap-3">
              <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-white">{stats.total_stances}</span>
                <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">Poglądy</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-rose-400">{stats.total_flip_flops}</span>
                <span className="text-[11px] text-rose-400/80 uppercase font-semibold tracking-wider">Wolty</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-amber-400">{stats.total_vulnerabilities}</span>
                <span className="text-[11px] text-amber-400/80 uppercase font-semibold tracking-wider">Czułe punkty</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                <span className="block text-2xl font-black text-sky-400">{recordings.length}</span>
                <span className="text-[11px] text-sky-400/80 uppercase font-semibold tracking-wider">Nagrania</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zakładki nawigacyjne */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-800/80 pb-4">
          <button
            onClick={() => setActiveTab("stances")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "stances"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/60"
            }`}
          >
            <Scale className="w-4 h-4" />
            Matryca Poglądów ({stances.length})
          </button>

          <button
            onClick={() => setActiveTab("flip_flops")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "flip_flops"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/60"
            }`}
          >
            <Split className="w-4 h-4" />
            Wolty & Flip-Flops ({flip_flops.length})
          </button>

          <button
            onClick={() => setActiveTab("vulnerabilities")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "vulnerabilities"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/60"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Czułe Punkty Stresu ({vulnerabilities.length})
          </button>

          <button
            onClick={() => setActiveTab("rhetoric")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "rhetoric"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/60"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Nawyki Retoryczne ({rhetorical_patterns.length})
          </button>

          <button
            onClick={() => setActiveTab("facts")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "facts"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/60"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Fakty & Weryfikacja ({external_facts.length})
          </button>

          <button
            onClick={() => setActiveTab("baseline")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "baseline"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/60 border border-slate-800/60"
            }`}
          >
            <Activity className="w-4 h-4" />
            Linia Bazowa (B₀)
          </button>
        </div>

        {/* Zawartość zakładek */}
        <div className="mt-6">
          {/* ZAKŁADKA 1: MATRYCA POGLĄDÓW */}
          {activeTab === "stances" && (
            <div>
              {stances.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                  <Scale className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Brak zdeklarowanych poglądów</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                    Przeanalizuj wywiad z tym politykiem lub kliknij "Wzbogać z sieci", aby zaimportować jego oficjalną linię.
                  </p>
                  <button
                    onClick={handleBootstrap}
                    disabled={bootstrapping}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Pobierz z sieci
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stances.map((s: any) => {
                    const polColor =
                      s.polaryzacja === "popiera"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : s.polaryzacja === "sprzeciwia"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        : s.polaryzacja === "unika"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-slate-800 border-slate-700 text-slate-400";

                    return (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              {s.temat}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${polColor}`}>
                              {s.polaryzacja}
                            </span>
                          </div>

                          {s.podtemat && (
                            <p className="text-[11px] text-slate-400 font-medium mb-2">
                              Aspekt: <span className="text-slate-300">{s.podtemat}</span>
                            </p>
                          )}

                          <p className="text-sm text-slate-200 font-medium leading-relaxed mb-3">
                            {s.stanowisko_opis}
                          </p>

                          {s.cytat_dowodowy && (
                            <blockquote className="p-3 rounded-xl bg-slate-950/70 border-l-2 border-amber-500/60 text-xs text-slate-300 italic">
                              "{s.cytat_dowodowy}"
                            </blockquote>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Źródło: {s.zrodlo_typ}</span>
                          {s.data_deklaracji && (
                            <span>{new Date(s.data_deklaracji).toLocaleDateString("pl-PL")}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ZAKŁADKA 2: WOLTY I FLIP-FLOPS */}
          {activeTab === "flip_flops" && (
            <div>
              {flip_flops.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Brak wykrytych wolt (Flip-Flops)</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Wszystkie dotychczasowe deklaracje polityka są spójne. Wolty zostaną odnotowane automatycznie przy wykryciu sprzeczności między kolejnymi wywiadami.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {flip_flops.map((ff: any) => (
                    <div
                      key={ff.id}
                      className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/20 to-slate-950/80 p-6 shadow-xl"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                          <h3 className="text-base font-bold text-white">
                            Wolta w temacie: <span className="text-rose-400">{ff.temat}</span>
                          </h3>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider">
                          {ff.stopien_wolty.replace("_", " ")}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-6 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl font-medium">
                        {ff.opis_sprzecznosci}
                      </p>

                      {/* Zestawienie kontrastowe dwóch wypowiedzi */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Wcześniejsza */}
                        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Stanowisko wcześniejsze ({ff.zrodlo_wczesniejsze || "Archiwum"})
                          </span>
                          <p className="text-xs font-semibold text-slate-200 mb-2">
                            {ff.stanowisko_wczesniejsze}
                          </p>
                          {ff.cytat_wczesniejszy && (
                            <p className="text-xs italic text-slate-400 bg-slate-950 p-2.5 rounded-lg border-l-2 border-slate-600">
                              "{ff.cytat_wczesniejszy}"
                            </p>
                          )}
                        </div>

                        {/* Późniejsza */}
                        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                            Stanowisko późniejsze ({ff.zrodlo_pozniejsze || "Aktualne nagranie"})
                          </span>
                          <p className="text-xs font-semibold text-rose-200 mb-2">
                            {ff.stanowisko_pozniejsze}
                          </p>
                          {ff.cytat_pozniejszy && (
                            <p className="text-xs italic text-rose-300/80 bg-slate-950 p-2.5 rounded-lg border-l-2 border-rose-500">
                              "{ff.cytat_pozniejszy}"
                            </p>
                          )}
                        </div>
                      </div>

                      {ff.analiza_motywu && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                          <span className="font-semibold text-slate-300">Prawdopodobna przyczyna wolty: </span>
                          {ff.analiza_motywu}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ZAKŁADKA 3: CZUŁE PUNKTY */}
          {activeTab === "vulnerabilities" && (
            <div>
              {vulnerabilities.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                  <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Brak zidentyfikowanych czułych punktów</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Kolejne audyty nagrań wideo wykryją tematy, które powtarzalnie wywołują mikroskoki stresu i mimikę obronną.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vulnerabilities.map((v: any) => (
                    <div
                      key={v.id}
                      className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Wyzwalacz: {v.temat_trigger}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            {v.liczba_odnotowan}x odnotowano
                          </span>
                        </div>

                        {/* Pasek natężenia stresu */}
                        <div className="my-3">
                          <div className="flex justify-between text-[11px] font-semibold mb-1">
                            <span className="text-slate-400">Średnie napięcie stresowe:</span>
                            <span className="text-rose-400">{v.srednie_napiecie_stresu}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
                              style={{ width: `${Math.min(v.srednie_napiecie_stresu, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                            Typowa reakcja obronna:
                          </span>
                          <p className="text-xs text-slate-300 font-medium">
                            {v.typowa_reakcja_obronna}
                          </p>
                        </div>
                      </div>

                      {v.ostatnie_zalamanie_data && (
                        <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                          Ostatnio zaobserwowano: {new Date(v.ostatnie_zalamanie_data).toLocaleDateString("pl-PL")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ZAKŁADKA 4: NAWYKI RETORYCZNE */}
          {activeTab === "rhetoric" && (
            <div>
              {rhetorical_patterns.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                  <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Brak skatalogowanych nawyków</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Katalog mostków erystycznych i nawykowych figur polityka będzie budowany wraz z kolejnymi nagraniami.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rhetorical_patterns.map((rp: any) => (
                    <div
                      key={rp.id}
                      className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {rp.typ_wzorca.replace("_", " ")}
                          </span>
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            Użyto: {rp.czestotliwosc_uzycia}x
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white mb-2">
                          "{rp.nazwa_wzorca}"
                        </h4>

                        {rp.szablon_lub_cytat && (
                          <p className="text-xs italic text-slate-400 bg-slate-950 p-2.5 rounded-lg border-l-2 border-amber-500 mb-3">
                            "{rp.szablon_lub_cytat}"
                          </p>
                        )}

                        {rp.funkcja_manipulacyjna && (
                          <p className="text-xs text-slate-300">
                            <span className="font-semibold text-slate-400">Funkcja erystyczna: </span>
                            {rp.funkcja_manipulacyjna}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ZAKŁADKA 5: FAKTY I FACT-CHECKING */}
          {activeTab === "facts" && (
            <div>
              {external_facts.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                  <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Brak zweryfikowanych faktów</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                    Użyj przycisku "Wzbogać z sieci", aby pobrać zweryfikowane głosowania sejmowe i oświadczenia.
                  </p>
                  <button
                    onClick={handleBootstrap}
                    disabled={bootstrapping}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Zweryfikuj z sieci
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {external_facts.map((f: any) => {
                    const isFalse = f.werdykt_weryfikacji === "falsz";
                    const isTrue = f.werdykt_weryfikacji === "prawda";
                    const isManip = f.werdykt_weryfikacji === "manipulacja";

                    const badgeColor = isFalse
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : isTrue
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : isManip
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-slate-800 text-slate-300 border-slate-700";

                    return (
                      <div
                        key={f.id}
                        className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Temat: {f.temat}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                            Werdykt: {f.werdykt_weryfikacji}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                              Twierdzenie polityka:
                            </span>
                            <p className="text-xs text-slate-200">
                              "{f.twierdzenie_polityka}"
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                              Ustalone fakty i archiwa:
                            </span>
                            <p className="text-xs text-slate-200">
                              {f.fakty_ustalone}
                            </p>
                          </div>
                        </div>

                        {f.zrodlo_nazwa && (
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                            <span>Zweryfikowano w: <strong className="text-slate-400">{f.zrodlo_nazwa}</strong></span>
                            {f.zrodlo_url && (
                              <a href={f.zrodlo_url} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline inline-flex items-center gap-1">
                                Link <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ZAKŁADKA 6: LINIA BAZOWA */}
          {activeTab === "baseline" && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
              <h3 className="text-base font-bold text-white mb-1">
                Fizjologiczna & Wokalna Linia Bazowa (B₀)
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Ruchoma średnia (moving average) wskaźników zneutralizowanego stanu mówcy. Od tych wartości mierzony jest stres podczas kolejnych recenzji.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="block text-2xl font-black text-amber-400">
                    {baseline.srednie_tempo_wpm?.toFixed(0) || "135"} <span className="text-xs text-slate-500">WPM</span>
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Średnie tempo mowy</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="block text-2xl font-black text-sky-400">
                    {baseline.srednie_f0_hz?.toFixed(0) || "160"} <span className="text-xs text-slate-500">Hz</span>
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Wysokość głosu (F₀)</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="block text-2xl font-black text-emerald-400">
                    {((baseline.typowy_udzial_pauz || 0.2) * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Udział pauz i ciszy</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Próba kalibracyjna: <strong className="text-slate-300">{baseline.proba_nagran || recordings.length} nagrań</strong></span>
                {baseline.updated_at && (
                  <span>Ostatnia kalibracja: {new Date(baseline.updated_at).toLocaleDateString("pl-PL")}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
