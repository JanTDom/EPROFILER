import React from "react";
import { ShieldCheck } from "lucide-react";

export const LegalNotice: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-3 py-2 border border-border">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
        <span>
          <strong>PROFILER:</strong> Analiza dotyczy wyłącznie publicznych wystąpień osób publicznych. Wyniki są hipotezami statystycznymi dla człowieka, a nie wyrokami.
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed">
      <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1.5">
        <ShieldCheck className="w-4 h-4 text-slate-800" />
        <span>PROFILER — Standard prawny i etyczny (AI Act & RODO)</span>
      </div>
      <p className="text-slate-600 mb-2">
        System <strong>PROFILER</strong> analizuje mowę ciała, mimikę (FACS), drżenie głosu i treść wypowiedzi <strong>osób pełniących funkcje publiczne</strong> w ramach działalności medioznawczej i dziennikarskiej (art. 85 RODO / prawo prasowe).
      </p>
      <ul className="list-disc list-inside space-y-1 text-slate-600">
        <li>
          <strong>Język zrozumiały dla każdego:</strong> Wszystkie odczyty i wykresy są tłumaczone na przejrzyste podsumowania, aby każdy użytkownik bez wiedzy psychologicznej mógł zrozumieć zachowanie mówcy.
        </li>
        <li>
          <strong>Zakaz wyroków o kłamstwie:</strong> System nie orzeka o „kłamstwie” jako fakcie. Wskazuje twardo zmierzone anomalie (skok mrugania, drżenie głosu, asymetryczny uśmieszek) oraz rozbieżności między słowami a ciałem.
        </li>
        <li>
          <strong>Wyłączenie biometrii osób prywatnych:</strong> Narzędzie nie może być wykorzystywane do profilowania pracowników, studentów ani osób prywatnych (zgodność z zakazami art. 5 Rozporządzenia AI Act).
        </li>
      </ul>
    </div>
  );
};
