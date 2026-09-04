export type RecordingType = "wywiad" | "debata" | "przemowienie";

export type ProcessingStatus = 
  | "OCZEKUJE"
  | "POBIERANIE"
  | "POBRANO"
  | "TRANSKODOWANIE"
  | "EKSTRAKCJA_AUDIO"
  | "GOTOWE_DO_TRANSKRYPCJI"
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

export interface PsychometricProfile {
  id: string;
  recording_id: string;
  otwartosc: number;
  sumiennosc: number;
  ekstrawersja: number;
  ugodowosc: number;
  neurotyzm: number;
  dominacja_vs_uleglosc: number;
  wrogosc_vs_cieplo: number;
  nastroj_glowny_prosty: string;
  styl_komunikacji_prosty: string;
  czule_punkty_i_leki: string[];
  mocne_strony: string[];
  skutecznosc_argumentacji?: string;
  perswazyjnosc_odbiorcow?: string;
  radzenie_z_adwersarzami?: string;
}
