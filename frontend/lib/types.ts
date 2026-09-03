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
  pewnosc: number; // 0.0 - 1.0
  cytat_dowodowy: string;
  przeslanki: string[];
}
