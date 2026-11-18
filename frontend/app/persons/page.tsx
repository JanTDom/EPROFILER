"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Plus, 
  BrainCircuit, 
  ShieldAlert, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  RefreshCw,
  Target,
  FileText,
  Clock
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { fetchPersons, createPerson } from "@/lib/api";

export default function PersonsCatalogPage() {
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Nowa osoba formularz
  const [newName, setNewName] = useState("");
  const [newParty, setNewParty] = useState("");
  const [newRole, setNewRole] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchPersons();
    setPersons(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setCreating(true);
      await createPerson({
        imie_nazwisko: newName.trim(),
        partia: newParty.trim() || undefined,
        funkcja: newRole.trim() || undefined
      });
      setNewName("");
      setNewParty("");
      setNewRole("");
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      alert("Błąd tworzenia profilu");
    } finally {
      setCreating(false);
    }
  };

  const filteredPersons = persons.filter((p) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = p.imie_nazwisko?.toLowerCase().includes(q);
    const partyMatch = p.partia?.toLowerCase().includes(q);
    const roleMatch = p.funkcja?.toLowerCase().includes(q);
    const aliasMatch = p.aliasy?.some((a: string) => a.toLowerCase().includes(q));
    return nameMatch || partyMatch || roleMatch || aliasMatch;
  });

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <AppHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Górny baner sekcji */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <BrainCircuit className="w-3.5 h-3.5" />
              Baza Wiedzy & Cognitive Dossier
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Katalog Polityków i Osób Badanych
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
              Samouczące się profile longitudinalne. Każda kolejna recenzja automatycznie zasila matrycę poglądów, 
              wykrywa wolty (flip-flops), rejestruje czułe punkty stresu i wzbogaca wiedzę z sieci.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Odśwież listę"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Dodaj Profil
            </button>
          </div>
        </div>

        {/* Pasek wyszukiwania i filtrów */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Szukaj po nazwisku, partii, funkcji lub aliasie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
            />
          </div>

          <div className="text-xs text-slate-400">
            Znaleziono: <span className="font-semibold text-white">{filteredPersons.length}</span> profili
          </div>
        </div>

        {/* Lista profili */}
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Ładowanie kartoteki wywiadowczej...</p>
          </div>
        ) : filteredPersons.length === 0 ? (
          <div className="mt-12 p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Brak profili polityków</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              Nie utworzono jeszcze profilu lub żaden nie pasuje do wyszukiwania. Profile tworzą się także automatycznie podczas analizy wywiadów.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Utwórz pierwszy profil
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPersons.map((p) => {
              const aliases = p.aliasy || [];
              return (
                <Link
                  key={p.id}
                  href={`/persons/${p.id}`}
                  className="group relative rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Partia i funkcja */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-slate-300">
                        {p.partia || "Niezrzeszony / Bez partii"}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        ID: {p.id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Imię i nazwisko */}
                    <h2 className="text-xl font-black text-white group-hover:text-amber-400 transition-colors">
                      {p.imie_nazwisko}
                    </h2>

                    {p.funkcja && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1 font-medium">
                        {p.funkcja}
                      </p>
                    )}

                    {/* Aliasy i warianty nazwiska */}
                    {aliases.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider self-center mr-1">
                          Warianty:
                        </span>
                        {aliases.slice(0, 3).map((a: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/50 text-slate-400 border border-slate-800 font-mono"
                          >
                            {a}
                          </span>
                        ))}
                        {aliases.length > 3 && (
                          <span className="text-[10px] text-slate-500 self-center">
                            +{aliases.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stopka karty */}
                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-amber-400/90 font-semibold group-hover:text-amber-300">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      Zobacz Dossier
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal dodawania nowego profilu */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Dodaj profil polityka</h3>
            <p className="text-xs text-slate-400 mb-6">
              Możesz podać samo nazwisko (np. Szłapka) lub pełne (Adam Szłapka) – inteligentny moduł Entity Resolution scali przyszłe recenzje i literówki do jednej pamięci.
            </p>

            <form onSubmit={handleCreatePerson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Imię i Nazwisko / Nazwisko *
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. Adam Szłapka"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Partia / Ugrupowanie
                </label>
                <input
                  type="text"
                  placeholder="np. Koalicja Obywatelska"
                  value={newParty}
                  onChange={(e) => setNewParty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Funkcja / Rola publiczna
                </label>
                <input
                  type="text"
                  placeholder="np. Minister ds. Unii Europejskiej"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
                >
                  {creating ? "Zapisywanie..." : "Utwórz Profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}
