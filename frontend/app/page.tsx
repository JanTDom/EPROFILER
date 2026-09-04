import Link from "next/link";
import { fetchRecordings } from "@/lib/api";
import { Recording } from "@/lib/types";
import { Video, Clock, Calendar, AlertCircle, CheckCircle2, Loader2, Eye, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

function getStatusBadge(status: string) {
  switch (status) {
    case "GOTOWE_DO_TRANSKRYPCJI":
    case "ZAKONCZONE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Gotowe do analizy
        </span>
      );
    case "BLAD":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3 h-3" />
          Błąd
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          {status}
        </span>
      );
  }
}

export default async function DashboardPage() {
  let recordings: Recording[] = [];
  let fetchError = null;

  try {
    recordings = await fetchRecordings();
  } catch (err: any) {
    fetchError = err.message;
  }

  return (
    <div className="space-y-6">
      {/* Baner powitalny PROFILER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              CENTRUM DOWODZENIA
            </span>
            <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Prosty język analizy
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Zarejestrowane materiały wideo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Repozytorium wywiadów i debat poddanych profilowaniu intencji, emocji, lęków i mowy ciała.
          </p>
        </div>
        <Link
          href="/recordings/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors rounded-sm shadow-sm"
        >
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          + Dodaj nowe nagranie
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          Oczekiwanie na uruchomienie serwera API PROFILER ({fetchError}).
        </div>
      )}

      {recordings.length === 0 && !fetchError ? (
        <div className="p-12 text-center bg-white border border-border">
          <Video className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">Brak materiałów w bazie</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Wklej link z YouTube lub prześlij plik wideo, aby PROFILER odczytał emocje, uniki i mowę ciała mówcy.
          </p>
          <div className="mt-4">
            <Link
              href="/recordings/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 rounded-sm"
            >
              <Eye className="w-3 h-3 text-blue-400" />
              Rozpocznij pierwsze profilowanie
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tytuł materiału</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Moduł Biometrii</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Czas trwania</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Otwórz profil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {recordings.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                    <Link href={`/recordings/${rec.id}`} className="hover:underline hover:text-blue-600">
                      {rec.tytul}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">
                    {rec.typ_nagrania}
                  </td>
                  <td className="px-4 py-3">
                    {rec.tryb_biometryczny !== false ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200 rounded-sm">
                        <Eye className="w-3 h-3" />
                        Aktywny (FACS)
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">Tylko treść</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {rec.data_publikacji ? rec.data_publikacji.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {rec.czas_trwania_sek > 0
                      ? `${Math.floor(rec.czas_trwania_sek / 60)}m ${Math.floor(rec.czas_trwania_sek % 60)}s`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(rec.status_przetwarzania)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/recordings/${rec.id}`}
                      className="text-xs font-semibold text-slate-900 hover:text-blue-600"
                    >
                      Raport &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
