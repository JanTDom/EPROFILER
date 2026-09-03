import Link from "next/link";
import { fetchRecordings } from "@/lib/api";
import { Recording } from "@/lib/types";
import { Video, Clock, Calendar, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

function getStatusBadge(status: string) {
  switch (status) {
    case "GOTOWE_DO_TRANSKRYPCJI":
    case "ZAKONCZONE":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Gotowe
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Loader2 className="w-3 h-3 animate-spin" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Przegląd materiałów
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Repozytorium nagrań poddanych przetworzeniu i analizie dyskursu.
          </p>
        </div>
        <Link
          href="/recordings/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
        >
          + Dodaj nowe nagranie
        </Link>
      </div>

      {fetchError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          Oczekiwanie na uruchomienie backendu API ({fetchError}). Jeśli uruchamiasz system po raz pierwszy, upewnij się, że serwer FastAPI działa na porcie 8000.
        </div>
      )}

      {recordings.length === 0 && !fetchError ? (
        <div className="p-12 text-center bg-white border border-border">
          <Video className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">Brak przetworzonych nagrań</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Rozpocznij od wprowadzenia linku do wywiadu na YouTube lub przesłania pliku wideo.
          </p>
          <div className="mt-4">
            <Link
              href="/recordings/new"
              className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
            >
              Rozpocznij pierwszą analizę
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border overflow-hidden">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tytuł nagrania</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Czas trwania</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {recordings.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">
                    <Link href={`/recordings/${rec.id}`} className="hover:underline">
                      {rec.tytul}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                    {rec.zrodlo_typ === "url" ? "URL (Stream)" : "Plik"}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">
                    {rec.typ_nagrania}
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
                      Otwórz &rarr;
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
