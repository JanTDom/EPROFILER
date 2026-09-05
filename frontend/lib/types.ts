export type RecordingType = "wywiad" | "debata" | "przemowienie";

export type ProcessingStatus = 
  | "OCZEKUJE"
  | "POBIERANIE"
  | "POBRANO"
  | "TRANSKODOWANIE"
  | "EKSTRAKCJA_AUDIO"
  | "GOTOWE_DO_TRANSKRYPCJI"
  | "PROFILOWANIE_AI"
  | "TRANSKRYPCJA"
  | "DIARYZACJA"
  | "RETORYKA"
  | "PROZODIA"
  | "ZAKONCZONE"
  | "BLAD";

export interface DetectedSpeaker {
  speaker_tag: string;
  imie_nazwisko?: string;
  rola?: string;
  opis?: string;
  jest_celem: boolean;
  cytat_dowodowy?: string;
  pewnosc?: number;
}

export interface Recording {
  id: string;
  tytul: string;
  zrodlo_typ: "plik" | "url";
  zrodlo_url?: string;
  data_publikacji?: string;
  czas_trwania_sek: number;
  typ_nagrania: RecordingType;
  status_przetwarzania: ProcessingStatus;
  krok_postepu: string;
  procent_postepu: number;
  blad?: string;
  tryb_biometryczny?: boolean;
  zakres_analizy?: "pelny" | "behawioralny";
  polityk_docelowy?: string;
  rola_polityka?: string;
  speaker_docelowy_tag?: string;
  rozpoznani_mowcy?: DetectedSpeaker[];
  psychometric_profile?: PsychometricProfile;
  created_at: string;
}

export interface ProgressEventPayload {
  id: string;
  status: ProcessingStatus;
  krok: string;
  procent: number;
  czas_trwania_sek?: number;
  blad?: string;
}

export interface Person {
  id: string;
  imie_nazwisko: string;
  funkcja?: string;
  partia?: string;
  aliasy: string[];
  uwagi?: string;
}

export interface Marker {
  id: string;
  recording_id: string;
  person_id?: string;
  start_ms: number;
  end_ms?: number;
  typ: "unik" | "technika_retoryczna" | "napiecie_prozodyczne" | "niespojnosc" | "przerwanie";
  etykieta: string;
  opis: string;
  nazwa_prosta?: string;
  wyjasnienie_proste?: string;
  pewnosc: number; // 0.0 - 1.0
  cytat_dowodowy: string;
  przeslanki: string[];
}

export interface BiometricEvent {
  id: string;
  recording_id: string;
  start_ms: number;
  end_ms: number;
  typ_reakcji: string;
  au_code?: string;
  wartosc_zmierzona?: number;
  odchylenie_od_bazy_pct?: number;
  naglowek_prosty: string;
  wyjasnienie_proste: string;
  klatka_dowodowa_path?: string;
  pewnosc: number;
}

export interface CongruenceEvent {
  id: string;
  recording_id: string;
  start_ms: number;
  end_ms: number;
  slowa_mowione: string;
  reakcja_ciala: string;
  indeks_zgodnosci: number;
  naglowek_prosty: string;
  wyjasnienie_proste: string;
}

export interface MarketingPlusItem {
  nazwa_atutu: string;
  cytat_lub_moment?: string;
  dlaczego_to_plus: string;
}

export interface MarketingMinusItem {
  nazwa_bledu: string;
  cytat_lub_moment?: string;
  dlaczego_to_minus: string;
}

export interface MarketingUnwantedEmotionItem {
  reakcja_lub_emocja: string;
  cytat_lub_moment?: string;
  dlaczego_to_szkodliwe: string;
  zalecenie_sztabowe: string;
}

export interface MarketingLogicalLapseItem {
  luka_lub_sprzecznosc: string;
  cytat_lub_moment?: string;
  diagnoza_logiczna: string;
  ryzyko_kontrataku: string;
}

export interface MarketingOpponentAmmunitionItem {
  cytat_ryzykowny: string;
  potencjalne_uderzenie_opozycji: string;
}

export interface MarketingCorrectiveScriptItem {
  kontekst_pytania: string;
  co_powiedzial: string;
  rekomendowana_riposta: string;
}

export interface PoliticalMarketingData {
  werdykt: "Sukces wizerunkowy" | "Bilans mieszany ze wskazaniem" | "Porażka wizerunkowa" | "Występ poprawny z zastrzeżeniami" | "Bilans mieszany ze wskazaniem na błędy" | string;
  ocena_punktowa_1_10: number;
  uzasadnienie_werdyktu: string;
  glowne_plusy: Array<MarketingPlusItem | string>;
  popelnione_bledy_i_minusy: Array<MarketingMinusItem | string>;
  niepozadane_emocje_i_mowa_ciala?: MarketingUnwantedEmotionItem[];
  nielogicznosci_i_luki_argumentacyjne?: MarketingLogicalLapseItem[];
  amunicja_dla_oponentow?: MarketingOpponentAmmunitionItem[];
  gotowe_riposty_zamiast_bledow?: MarketingCorrectiveScriptItem[];
  warsztat_mowy_i_dykcji?: string;
  nosnosc_medialna_soundbites: string | string[];
  wplyw_na_elektorat: {
    twardy_elektorat?: string;
    niezdecydowani?: string;
    przeciwnicy?: string;
  };
  rekomendacje_sztabowe: string[];
}

export interface PsychometricProfile {
  id: string;
  recording_id: string;
  otwartosc?: number;
  sumiennosc?: number;
  ekstrawersja?: number;
  ugodowosc?: number;
  neurotyzm?: number;
  dominacja_vs_uleglosc?: number;
  wrogosc_vs_cieplo?: number;
  wynik_ogolny?: number;
  podsumowanie_ai_proste?: string;
  nastroj_glowny_prosty: string;
  styl_komunikacji_prosty: string;
  czule_punkty_i_leki: string[];
  mocne_strony: string[];
  glowne_uniki_i_taktyka?: string;
  spojnosc_mowy_ze_slowami?: string;
  skutecznosc_argumentacji?: string;
  perswazyjnosc_odbiorcow?: string;
  radzenie_z_adwersarzami?: string;
  dane_marketingowe?: PoliticalMarketingData;
  surowe_wnioski_ai?: {
    temat_rozmowy?: string;
    marketing_polityczny?: PoliticalMarketingData;
    wnioski?: Record<string, string>;
    [key: string]: any;
  };
}
