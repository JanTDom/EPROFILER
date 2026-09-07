"use client";

import React from "react";
import { 
  Target, 
  Flame, 
  AlertTriangle, 
  Brain, 
  Zap, 
  Quote, 
  Swords, 
  Crosshair, 
  ShieldAlert, 
  ShieldCheck,
  Activity, 
  MessageSquare,
  Sparkles,
  Play
} from "lucide-react";
import { Recording, AdversaryAnalysisData, ArgumentativeAttackVector, PersonalityAttackVector, SpotAmmunitionItem, PoliticianRelation } from "@/lib/types";

interface AdversaryAttackDossierProps {
  recording: Recording;
  targetName: string;
  onSeek?: (seconds: number) => void;
  onToggleRelation?: (relation: PoliticianRelation) => void;
}

export const AdversaryAttackDossier: React.FC<AdversaryAttackDossierProps> = ({
  recording,
  targetName,
  onSeek,
  onToggleRelation,
}) => {
  const profile = recording.psychometric_profile;
  const adversaryData: AdversaryAnalysisData | undefined = 
    profile?.surowe_wnioski_ai?.analiza_przeciwnika;

  // Fallback if data is missing or empty
  const glownaPodatnosc = adversaryData?.glowna_podatnosc_oponenta || 
    profile?.podsumowanie_ai_proste || 
    "Oponent wykazuje podwyższoną reaktywność emocjonalną przy dociskaniu do konkretnych liczb i rozliczaniu sprzeczności z przeszłości.";
  
  const score = adversaryData?.ocena_podatnosci_na_atak_1_10 ?? 7;
  
  const rawLuki = profile?.surowe_wnioski_ai?.marketing_polityczny?.nielogicznosci_i_luki_argumentacyjne || [];
  const punktyArgumentacyjne: ArgumentativeAttackVector[] = (adversaryData?.punkty_wejscia_argumentacyjne && adversaryData.punkty_wejscia_argumentacyjne.length > 0)
    ? adversaryData.punkty_wejscia_argumentacyjne
    : rawLuki.map((l: any) => ({
        tytul_wektora: l.luka_lub_sprzecznosc || "Sprzeczność argumentacyjna",
        cytat_przeciwnika: l.cytat_lub_moment || "Wymijająca odpowiedź",
        diagnoza_slabosci: l.diagnoza_logiczna || "Wytknięcie niespójności faktów i braku konkretów",
        rekomendowany_atak_lub_pulapka: `Zadać pytanie: 'Jak wytłumaczy Pan fakt, że ${l.luka_lub_sprzecznosc?.toLowerCase() || "dane przeczą temu twierdzeniu"}?'`,
        zastosowanie_w_debacie: l.ryzyko_kontrataku || "Gwałtowna defensywa i zmiana tematu przed widzami",
      }));

  const rawAmmo = profile?.surowe_wnioski_ai?.marketing_polityczny?.amunicja_dla_oponentow || [];
  const amunicjaSpoty: SpotAmmunitionItem[] = (adversaryData?.amunicja_uderzeniowa_do_spotow && adversaryData.amunicja_uderzeniowa_do_spotow.length > 0)
    ? adversaryData.amunicja_uderzeniowa_do_spotow
    : rawAmmo.map((a: any) => ({
        cytat_samobojczy: a.cytat_ryzykowny || "Wypowiedź kompromitująca",
        kontekst_ataku: a.potencjalne_uderzenie_opozycji || "Obnaża brak spójności i rozminięcie się z deklaracjami",
      }));

  const punktyOsobowosciowe: PersonalityAttackVector[] = (adversaryData?.punkty_wejscia_osobowosciowe && adversaryData.punkty_wejscia_osobowosciowe.length > 0)
    ? adversaryData.punkty_wejscia_osobowosciowe
    : [
        {
          trigger_emocjonalny: "Potrzeba dominacji i unikanie trudnych faktów",
          objaw_behawioralny: "Przerywanie rozmówcy, mikro-uśmieszki złości/pogardy (AU14) i podwyższony ton głosu przy pytaniach o rozliczenia.",
          mechanizm_psychologiczny: "Głęboko zakorzeniona obawa przed utratą statusu i wyjściem na osobę nieprzygotowaną merytorycznie.",
          jak_wyprowadzic_z_rownowagi: "Spokojne, beznamiętne zbijanie ogólników i żądanie twardych liczb bez wchodzenia w pyskówki. Pozwolić mu się zagotować przed kamerą.",
        },
        {
          trigger_emocjonalny: "Nadwrażliwość na zarzut niekonsekwencji lub hipokryzji",
          objaw_behawioralny: "Unikanie kontaktu wzrokowego, gwałtowny wzrost częstotliwości mrugania i napięcie mięśni żuchwy.",
          mechanizm_psychologiczny: "Trudność w pogodzeniu bieżącej linii ze swoimi dawnymi wypowiedziami.",
          jak_wyprowadzic_z_rownowagi: "Zacytować dosłowne słowa z przeszłości przeczące obecnemu stanowisku i poprosić o proste 'tak' lub 'nie'.",
        },
      ];

  const rekomendacjeOfensywne = (adversaryData?.rekomendacje_ofensywne_dla_naszego_sztabu && adversaryData.rekomendacje_ofensywne_dla_naszego_sztabu.length > 0)
    ? adversaryData.rekomendacje_ofensywne_dla_naszego_sztabu
    : [
        "Nie przerywać oponentowi, gdy zaczyna się plątać — pozwolić mu dokończyć nielogiczną wypowiedź na wizji.",
        "Stawiać precyzyjne pytania zamknięte: 'Tak czy Nie?', aby zdemaskować uniki przed widzami.",
        "Wykorzystać wycięte klipy z momentami zawahania w kampanii w mediach społecznościowych w ciągu 2 godzin od emisji.",
      ];

  // Obliczenie wskaźnika podatności na atak
  const vulnerabilityBadge = score >= 8
    ? {
        label: "Skrajnie wysoka podatność na prowokację",
        desc: "Oponent łatwo traci panowanie nad sobą, daje się wciągnąć w pyskówki i wykazuje gwałtowne wycieki złości/pogardy.",
        color: "from-rose-500/25 to-red-600/15 border-rose-500/50 text-rose-300",
        meterColor: "bg-rose-500",
      }
    : score >= 5
    ? {
        label: "Umiarkowana podatność z wyraźnymi pęknięciami",
        desc: "Trzyma fason przy ogólnych tematach, ale traci kontrolę przy personalnych zarzutach i pytaniach o podwójne standardy.",
        color: "from-amber-500/25 to-orange-600/15 border-amber-500/50 text-amber-300",
        meterColor: "bg-amber-500",
      }
    : {
        label: "Dyscyplina wypowiedzi (wymaga precyzyjnych pułapek)",
        desc: "Dobrze wyszkolony medialnie, rzadko puszczają mu nerwy. Atakować wyłącznie twardymi danymi i cytatami.",
        color: "from-blue-500/25 to-indigo-600/15 border-blue-500/50 text-blue-300",
        meterColor: "bg-blue-500",
      };

  return (
    <div className="bg-[#0c0f18]/95 border border-rose-500/40 p-6 rounded-2xl shadow-[0_0_40px_rgba(244,63,94,0.15)] backdrop-blur-xl space-y-7 relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-1 before:bg-gradient-to-r before:from-rose-600 before:via-red-500 before:to-amber-500">
      {/* HUD Corner Accents */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-rose-500/60 pointer-events-none" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-rose-500/60 pointer-events-none" />
      
      {/* Nagłówek Dossier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-500/20">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-950/60 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)] shrink-0">
            <Target className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400 uppercase">
                OPPOSITION RESEARCH // DOSSIER OFENSYWNE
              </span>
              <span className="text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-500/50 px-2 py-0.2 rounded-full uppercase">
                PUNKTY WEJŚCIA I WEKTORY ATAKU
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Cel: {targetName}</span>
              <span className="text-xs font-mono font-normal text-rose-300 bg-rose-950/90 px-2 py-0.5 border border-rose-500/30 rounded">
                {recording.speaker_docelowy_tag || "SPEAKER_00"}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Instrukcja dla naszego sztabu i dyskutantów: jak zdemaskować oponenta, wyprowadzić go z równowagi i zadać rozstrzygające ciosy na wizji.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {onToggleRelation && (
            <div className="flex items-center p-1 bg-[#060a14] border border-rose-500/40 rounded-xl shadow-lg">
              <button
                type="button"
                onClick={() => onToggleRelation("sojusznik")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-all cursor-pointer"
                title="Przełącz ten raport na audyt sojusznika"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Przełącz na: Sojusznik</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-rose-500/30 text-rose-200 border border-rose-500/60 shadow-sm"
              >
                <Target className="w-3.5 h-3.5 text-rose-400" />
                <span>Przeciwnik</span>
              </button>
            </div>
          )}

          <div className="px-3.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-right shadow-inner">
            <div className="text-[9px] font-mono uppercase text-rose-400 font-bold">Podatność na atak:</div>
            <div className="text-xl font-black font-mono text-white flex items-baseline justify-end gap-1">
              <span>{score}</span>
              <span className="text-xs font-normal text-slate-400">/10</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. KARTA GŁÓWNEJ PODATNOŚCI & WSKAŹNIK PODATNOŚCI NA ATAK */}
      <div className={`p-5 rounded-xl border bg-gradient-to-br ${vulnerabilityBadge.color} space-y-3 shadow-lg`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {vulnerabilityBadge.label}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-300">
            {vulnerabilityBadge.desc}
          </span>
        </div>

        {/* Pasek postępu podatności */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-300">
            <span>Odporność psychiczna</span>
            <span className="text-rose-300 font-bold">Stopień podatności na sprowokowanie: {score * 10}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden border border-white/10">
            <div 
              className={`h-full ${vulnerabilityBadge.meterColor} transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.5)]`}
              style={{ width: `${Math.min(score * 10, 100)}%` }}
            />
          </div>
        </div>

        <div className="pt-2">
          <span className="text-[11px] font-mono uppercase font-bold text-rose-300 block mb-1">
            Diagnoza sztabowa głównej podatności:
          </span>
          <p className="text-xs text-slate-100 leading-relaxed">
            {glownaPodatnosc}
          </p>
        </div>
      </div>

      {/* 2. PUNKTY WEJŚCIA OSOBOWOŚCIOWE I SŁABOŚCI PSYCHICZNE — JAK GO WYPROWADZIĆ Z RÓWNOWAGI */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-rose-500/30">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-rose-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Słabości psychiczne i instrukcja destabilizacji
            </h4>
          </div>
          <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 border border-rose-500/40 rounded">
            KLUCZOWY MODUŁ SZTABOWY
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Niezależnie od tego, czy oponentem jest rywal polityczny, agresywny dziennikarz czy stronniczy publicysta — poniższe triggery natychmiast uderzają w jego kompleksy i naruszają spokój. Użyj dedykowanych instrukcji, aby doprowadzić do jego dekompozycji na wizji.
        </p>

        {punktyOsobowosciowe.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {punktyOsobowosciowe.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-[#101422] p-4 rounded-xl border border-rose-500/30 space-y-3 shadow-md hover:border-rose-400/60 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Trigger */}
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-300 block">
                        Wyzwalacz emocjonalny (Trigger):
                      </span>
                      <h5 className="text-xs font-bold text-white">
                        {item.trigger_emocjonalny}
                      </h5>
                    </div>
                  </div>

                  {/* Objaw behawioralny & mimika */}
                  {item.objaw_behawioralny && (
                    <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                      <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-cyan-300 font-mono text-[10px] uppercase block">Wyciek w aparacie mowy i mimice:</strong>
                        <span>{item.objaw_behawioralny}</span>
                      </div>
                    </div>
                  )}

                  {/* Mechanizm psychologiczny */}
                  {item.mechanizm_psychologiczny && (
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                      <strong className="text-slate-400 font-medium">Podłoże kompleksu / pychy: </strong>
                      {item.mechanizm_psychologiczny}
                    </p>
                  )}
                </div>

                {/* INSTRUKCJA DESTABILIZACJI */}
                <div className="p-3 bg-gradient-to-r from-rose-950/70 via-red-950/50 to-slate-950/80 rounded-xl border border-rose-500/50 shadow-inner">
                  <div className="flex items-center gap-1.5 text-rose-300 font-mono font-bold text-[10px] uppercase mb-1">
                    <Swords className="w-3.5 h-3.5 text-rose-400" />
                    <span>Jak go wyprowadzić z równowagi w studiu:</span>
                  </div>
                  <p className="text-xs font-semibold text-rose-100 leading-relaxed">
                    {item.jak_wyprowadzic_z_rownowagi}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
            Brak skrajnych pęknięć osobowościowych w krótkim fragmencie nagrania.
          </div>
        )}
      </div>

      {/* 3. PUNKTY WEJŚCIA ARGUMENTACYJNE — LUKI LOGICZNE, KŁAMSTWA I PUŁAPKI */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Wektory ataku argumentacyjnego i gotowe pytania-pułapki
            </h4>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 border border-amber-500/40 rounded">
            ROZBICIE NARRACJI
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Zidentyfikowane luki logiczne, uniki i manipulacje oponenta wraz z przygotowaną ripostą lub pytaniem zamykającym drogę ucieczki.
        </p>

        {punktyArgumentacyjne.length > 0 ? (
          <div className="space-y-3.5">
            {punktyArgumentacyjne.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-[#101422] p-4 rounded-xl border border-amber-500/30 space-y-3 shadow-md hover:border-amber-400/60 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>{item.tytul_wektora}</span>
                  </h5>
                  {item.zastosowanie_w_debacie && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Timing: {item.zastosowanie_w_debacie}
                    </span>
                  )}
                </div>

                {item.cytat_przeciwnika && (
                  <blockquote className="text-xs text-slate-200 italic border-l-2 border-amber-500/60 pl-3 py-0.5 bg-amber-950/10 rounded-r">
                    „{item.cytat_przeciwnika}”
                  </blockquote>
                )}

                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-amber-400 font-medium">Diagnoza słabości / manipulacji: </strong>
                  {item.diagnoza_slabosci}
                </p>

                {/* Gotowe uderzenie / pytanie-pułapka */}
                <div className="p-3 bg-gradient-to-r from-emerald-950/50 to-slate-950/80 rounded-xl border border-emerald-500/40">
                  <div className="text-[10px] font-mono uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Gotowe pytanie-pułapka lub riposta uderzeniowa do zadania:</span>
                  </div>
                  <p className="text-xs font-bold text-emerald-100 leading-relaxed">
                    „{item.rekomendowany_atak_lub_pulapka}”
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
            Brak krytycznych luk logicznych zarejestrowanych w tym fragmencie.
          </div>
        )}
      </div>

      {/* 4. AMUNICJA UDERZENIOWA DO SPOTÓW I SOCIAL MEDIÓW */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-rose-500/30">
          <Flame className="w-5 h-5 text-rose-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Amunicja uderzeniowa do spotów i kreacji social media
          </h4>
        </div>

        <p className="text-xs text-slate-400">
          Cytaty samobójcze oponenta („złote myśli”) do natychmiastowego wycięcia na paski, rolki i spoty wyborcze.
        </p>

        {amunicjaSpoty.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {amunicjaSpoty.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-2 relative group hover:border-rose-400/50 transition-all"
              >
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase font-bold text-rose-400">
                  <Quote className="w-3.5 h-3.5 text-rose-400" />
                  <span>Kompromitujący cytat ('samobój'):</span>
                </div>
                <blockquote className="text-xs font-semibold text-rose-100 italic bg-slate-950/60 p-2.5 rounded-lg border border-rose-500/20">
                  „{item.cytat_samobojczy}”
                </blockquote>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-rose-300">Kontekst uderzenia sztabu: </strong>
                  {item.kontekst_ataku}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
            W badanym fragmencie oponent nie popełnił drastycznego przejęzyczenia lub jawnego samobója wizerunkowego.
          </div>
        )}
      </div>

      {/* 5. STRATEGICZNE DYREKTYWY OFENSYWNE DLA NASZEGO SZTABU */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-indigo-500/30">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Dyrektywy ofensywne dla naszego zespołu
          </h4>
        </div>

        {rekomendacjeOfensywne.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {rekomendacjeOfensywne.map((rek, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-xs text-slate-200 flex items-start gap-2.5 shadow-sm"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600/60 text-indigo-200 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{rek}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400">
            Brak dodatkowych dyrektyw ofensywnych.
          </div>
        )}
      </div>
    </div>
  );
};
