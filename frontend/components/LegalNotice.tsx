import React from "react";
import { ShieldAlert } from "lucide-react";

export const LegalNotice: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-2 border border-border">
        <ShieldAlert className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
        <span>
          Aplikacja analizuje wyłącznie publiczne wypowiedzi osób publicznych (zgodność z AI Act).
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed">
      <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1.5">
        <ShieldAlert className="w-4 h-4 text-slate-800" />
        <span>Ramy prawne i zakres stosowania (Rozporządzenie AI Act & RODO)</span>
      </div>
      <p className="text-slate-600 mb-2">
        System <strong>DYSKURS</strong> służy do analizy lingwistycznej, prozodycznej i retorycznej oficjalnych wystąpień, debat oraz wywiadów <strong>osób pełniących funkcje publiczne</strong>.
      </p>
      <ul className="list-disc list-inside space-y-1 text-slate-600">
        <li>
          <strong>Brak biometrii emocjonalnej:</strong> Analiza opiera się na strukturze tekstu, logice argumentacji i prozodii mowy, co wyklucza zakazane przez AI Act profilowanie biometryczne stanów emocjonalnych.
        </li>
        <li>
          <strong>Ochrona prywatności:</strong> Narzędzie nie służy i nie może być wykorzystywane do analizy wypowiedzi osób prywatnych.
        </li>
        <li>
          <strong>Obserwacja vs Interpretacja:</strong> System dostarcza hipotezy badawcze i dowody cytowane dla analityka, nie wydając definitywnych orzeczeń procesowych.
        </li>
      </ul>
    </div>
  );
};
