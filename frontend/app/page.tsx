import Link from "next/link";
import { cookies } from "next/headers";
import { fetchRecordings } from "@/lib/api";
import { Recording } from "@/lib/types";
import { QuickIngestBar } from "@/components/QuickIngestBar";
import { DeleteRecordingButton } from "@/components/DeleteRecordingButton";
import {
  Video,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  Sparkles,
  Activity,
  Shield,
  Radio,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

function getStatusBadge(status: string) {
  switch (status) {
    case "GOTOWE_DO_TRANSKRYPCJI":
    case "ZAKONCZONE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 rounded shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          GOTOWE DO PROFILU
        </span>
      );
    case "BLAD":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold bg-red-950/80 text-red-400 border border-red-500/40 rounded">
          <AlertCircle className="w-3 h-3" />
          BŁĄD POTOKU
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 rounded shadow-[0_0_10px_rgba(0,240,255,0.2)]">
          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
          {status}
        </span>
      );
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const profileId = cookieStore.get('eprofiler_profile')?.value || 'profile_main';
  const isCustomProfile = profileId === 'profile_custom';

  let recordings: Recording[] = [];
  let fetchError = null;

  try {
    recordings = await fetchRecordings(profileId);
  } catch (err: any) {
    fetchError = err.message;
  }

  const totalDuration = recordings.reduce((acc, r) => acc + (r.czas_trwania_sek || 0), 0);

  return (
    <div className="space-y-8">
      {/* GŁÓWNY BANER HERO — FORENSIC STUDIO WORKSTATION */}
      <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1222] via-[#090d18] to-[#06080d] p-8 shadow-[0_0_40px_rgba(0,240,255,0.1)]">
        {/* Dekoracyjne narożniki HUD */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse text-cyan-400" />
                SYSTEM PROFILOWANIA MULTIMODALNEGO
              </span>
              {isCustomProfile ? (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-purple-950/90 text-purple-300 border border-purple-500/50 flex items-center gap-1.5 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                  PROFIL NIEZALEŻNY // WŁASNE API
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  PROFIL GŁÓWNY // HISTORIA STANDARDOWA
                </span>
              )}
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Silnik Prostego Języka Aktywny
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
              STACJA DOWODZENIA <span className="text-cyan-400">E-PROFILERA</span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Forensyczna analiza polityków i liderów opinii: odczytuj <strong>emocje, nastroje, lęki</strong>, wykrywaj <strong>uniki i dysonans mowy ciała ze słowami</strong> oraz sprawdzaj, <strong>czy odbiorcy kupią ich przekaz</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/recordings/new"
              className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Zaawansowane opcje (Plik / Karta VOD)</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-cyan-400" />
            </Link>
          </div>
        </div>

        {/* BŁYSKAWICZNY FORMULARZ WPROWADZANIA LINKU I NAZWISKA */}
        <div className="mt-6">
          <QuickIngestBar />
        </div>

        {/* METRYKI TELEMETRYCZNE STUDIA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Zarejestrowane materiały
            </span>
            <span className="text-2xl font-black font-mono text-white mt-1 block">
              {recordings.length}
            </span>
          </div>

          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Łączny czas nagrań
            </span>
            <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
              {Math.floor(totalDuration / 60)}m {Math.floor(totalDuration % 60)}s
            </span>
          </div>

          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Moduł biometryczny
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block flex items-center gap-1.5">
              <Activity className="w-5 h-5 text-emerald-400" />
              FACS + PRAAT
            </span>
          </div>

          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Mózg analityczny AI
            </span>
            <span className="text-xl font-black font-mono text-purple-400 mt-1.5 block">
              AUTORSKI SILNIK AI
            </span>
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-amber-950/50 border border-amber-500/50 text-amber-200 text-xs rounded font-mono">
          [!] Oczekiwanie na uruchomienie backendu API ({fetchError}).
        </div>
      )}

      {/* LISTA NAGRAŃ — CYBER DATA GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
              Materiały w repozytorium E-PROFILERA
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Automatyczna detekcja emocji, uniki i mowa ciała
          </span>
        </div>

        {recordings.length === 0 && !fetchError ? (
          <div className="p-16 text-center bg-[#0c1220] border border-slate-800/80 rounded-xl relative overflow-hidden">
            <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              Brak zarejestrowanych materiałów
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              Wprowadź publiczny wywiad z YouTube lub wgraj plik wideo, aby E-PROFILER zbadał reakcje mówcy, uniki i przekonywalność w prostym języku.
            </p>
            <div className="mt-6">
              <Link
                href="/recordings/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                <Eye className="w-4 h-4" />
                Dodaj pierwsze nagranie
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[#0b0f19] border border-slate-800/90 rounded-lg overflow-hidden shadow-2xl">
            <table className="min-w-full divide-y divide-slate-800/80 text-left">
              <thead className="bg-slate-900/90 text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Tytuł materiału</th>
                  <th className="px-4 py-3.5">Format</th>
                  <th className="px-4 py-3.5">Zakres oceny</th>
                  <th className="px-4 py-3.5">Biometria</th>
                  <th className="px-4 py-3.5">Czas</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {recordings.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-cyan-950/20 transition-colors group"
                  >
                    <td className="px-5 py-4 font-medium text-white max-w-sm">
                      <Link
                        href={`/recordings/${rec.id}`}
                        className="hover:text-cyan-400 transition-colors block truncate font-semibold"
                      >
                        {rec.tytul}
                      </Link>
                      {rec.zrodlo_url && (
                        <span className="text-[11px] font-mono text-slate-500 block truncate mt-0.5">
                          {rec.zrodlo_url}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono capitalize bg-slate-800 text-slate-300 border border-slate-700">
                        {rec.typ_nagrania}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {rec.zakres_analizy === "behawioralny" ? (
                        <span className="text-[11px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 border border-purple-800/60 rounded">
                          Tylko psychika
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-800/60 rounded">
                          Oceń wszystko
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {rec.tryb_biometryczny !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 border border-emerald-800/60 rounded">
                          <Activity className="w-3 h-3 text-emerald-400" />
                          FACS + Wzrok
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Tylko treść</span>
                      )}
                    </td>

                    <td className="px-4 py-4 font-mono text-slate-300">
                      {rec.czas_trwania_sek > 0
                        ? `${Math.floor(rec.czas_trwania_sek / 60)}m ${Math.floor(rec.czas_trwania_sek % 60)}s`
                        : "—"}
                    </td>

                    <td className="px-4 py-4">
                      {getStatusBadge(rec.status_przetwarzania)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2.5 justify-end">
                        <Link
                          href={`/recordings/${rec.id}`}
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-0.5 transition-transform"
                        >
                          <span>Raport</span>
                          <span>&rarr;</span>
                        </Link>
                        <DeleteRecordingButton recordingId={rec.id} recordingTitle={rec.tytul} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
