import React from "react";
import { ShieldCheck } from "lucide-react";

export const LegalNotice: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-studio-surface/80 px-3 py-2 border border-studio-border/60 rounded-lg">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
        <span>
          <strong className="text-slate-200">PROFILER:</strong> Analiza dotyczy wyłącznie publicznych wystąpień osób publicznych. Wyniki stanowią skalibrowane hipotezy naukowe, a nie wyroki.
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-studio-surface/40 border border-studio-border/60 rounded-xl text-slate-300 text-xs leading-relaxed backdrop-blur-sm">
      <div className="flex items-center gap-2 font-semibold text-slate-100 mb-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span className="tracking-wide">PROFILER — Standard prawny i etyczny (AI Act & RODO)</span>
      </div>
      <p className="text-slate-400 mb-3 text-[11px] leading-relaxed">
        System <strong className="text-slate-200">PROFILER</strong> bada mowę ciała, mimikę (FACS), drżenie głosu i treść wypowiedzi <strong className="text-slate-200">osób pełniących funkcje publiczne</strong> w ramach działalności medioznawczej i analizy debaty publicznej (art. 85 RODO / prawo prasowe).
      </p>
      <ul className="space-y-1.5 text-[11px] text-slate-400">
        <li className="flex items-start gap-2">
          <span className="text-cyan-400 font-bold">•</span>
          <span><strong className="text-slate-200">Język zrozumiały dla każdego:</strong> Wszystkie odczyty biometryczne są tłumaczone na przejrzysty język polski bez hermetycznego żargonu medycznego.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-amber-400 font-bold">•</span>
          <span><strong className="text-slate-200">Zakaz fałszywych wyroków:</strong> System nigdy nie orzeka arbitralnie o „kłamstwie”. Wskazuje rzetelnie zmierzone anomalie (skok mrugania, drżenie głosu, asymetria uśmiechu) i dysonans mowy ciała ze słowami.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-emerald-400 font-bold">•</span>
          <span><strong className="text-slate-200">Zgodność z AI Act (art. 5):</strong> Narzędzie nie profiluje pracowników ani osób prywatnych — służy wyłącznie transparentności życia publicznego.</span>
        </li>
      </ul>
    </div>
  );
};
