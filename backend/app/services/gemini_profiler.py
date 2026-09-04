import json
import logging
from typing import Dict, Any, List, Optional
import httpx
from app.config import settings
from app.services.validator import (
    EvasionAnalysisOutput,
    RhetoricAnalysisOutput,
    ValidationError
)
from app.services.plain_language import plain_language_service

logger = logging.getLogger("profiler.gemini")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"

SYSTEM_INSTRUCTION = """Jesteś bezkompromisowym, analitycznym doradcą ds. marketingu politycznego, spin doctorem oraz trenerem wystąpień publicznych systemu PROFILER.
Twoim celem jest rzetelny, krytyczny audyt wystąpienia publicznego osoby badanej. Nie tworzysz laurki ani pochlebstw — polityk i jego sztab potrzebują twardych, użytecznych ostrzeżeń, dekonstrukcji błędów oraz praktycznych wskazówek warsztatowych.

OBOWIĄZUJĄ CIĘ ZASADY AUDYTU SZTABOWEGO I SPIN DOCTORINGU:
1. CZUJNOŚĆ NA WYCIEKI EMOCJONALNE I NIEWERBALNE: Z całą surowością wychwytujesz emocje niedopuszczalne u lidera (irytacja, zniecierpliwienie, protekcjonalizm, uśmieszki wyższości i pogardy AU14, bezradność, nerwowość głosu, defensywne ucinanie wątków).
2. DEKONSTRUKCJA NIELOGICZNOŚCI I PUSTOSŁOWIA: Punktujesz luki logiczne, brak ciągu przyczynowo-skutkowego, obietnice bez mechanizmu sprawczego, wewnętrzne sprzeczności oraz nieudolne próby ucieczki od odpowiedzi (toporny bridging).
3. ANALIZA POWIERZCHNI ATAKU (AMUNICJA DLA OPONENTÓW): Identyfikujesz niefortunne sformułowania i tzw. 'samobóje', które sztaby konkurencji wytną na rolki, paski i spoty jako dowód słabości lub nieszczerości.
4. WARSZTAT WYSTĄPIEŃ I DYKCJA: Oceniasz tempo mowy, intonację (unikanie intonacji pytającej przy twierdzeniach), pauzy retoryczne i natrętne wypełniacze.
5. SKRYPTY NAPRAWCZE: Każdy zdiagnozowany błąd musi mieć gotowy szablon naprawczy ('Zamiast: X -> Mów: Y').
6. KALIBRACJA OCENY: Kompresuj oceny ku środkowi skali (na skali 1-10 unikaj skrajności 1 czy 10; realistyczne, krytyczne wystąpienia pod presją mieszczą się typowo w przedziale 4-7/10).
7. ZWIĘZŁOŚĆ I GĘSTOŚĆ INFORMACYJNA: Wszystkie opisy i uzasadnienia formułuj zwięźle, esencjonalnie, unikając rozwlekłości.
8. FORMAT JĘZYKOWY: Pisz czystą polszczyzną w sentence case (tylko pierwsza litera zdania wielka). Odpowiadaj wyłącznie poprawnym JSON-em."""

class GeminiProfilerService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def _call_gemini_json(self, prompt: str) -> Dict[str, Any]:
        """Wywołuje Gemini API z wymuszeniem wyjścia JSON."""
        if not self.api_key:
            raise RuntimeError("Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env")

        url = f"{GEMINI_API_URL}?key={self.api_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Błąd Gemini API ({resp.status_code}): {resp.text}")
            
            data = resp.json()
            try:
                text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text_content)
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                raise RuntimeError(f"Nie udało się sparsować odpowiedzi JSON od Gemini: {str(e)}")

    async def analyze_evasion(self, pytanie: str, odpowiedz: str) -> Dict[str, Any]:
        """
        Detekcja uników (para pytanie-odpowiedź) z walidacją i prostym językiem.
        """
        prompt = f"""Dostajesz PYTANIE zadane rozmówcy i jego ODPOWIEDŹ (dosłowna transkrypcja).
Oceń, w jakim stopniu odpowiedź faktycznie odpowiada na pytanie.

PYTANIE: {pytanie}
ODPOWIEDŹ: {odpowiedz}

Zwróć JSON o strukturze:
{{
  "klasyfikacja": "odpowiedz" | "odpowiedz_czesciowa" | "unik" | "kontratak" | "whataboutism" | "zmiana_tematu" | "niewystarczajace_dane",
  "pewnosc": 0.0-1.0,
  "co_zostalo_pominiete": "konkret z pytania, na który nie padła odpowiedź (albo null)",
  "cytat_dowodowy": "dosłowny fragment odpowiedzi uzasadniający klasyfikację",
  "uzasadnienie": "1-2 zdania prostym językiem polskim",
  "proste_podsumowanie_dla_widza": "1 zwięzłe zdanie wyjaśniające widzowi co tu zaszło"
}}"""
        raw = await self._call_gemini_json(prompt)
        
        # Walidacja twardych reguł jakościowych
        validated = EvasionAnalysisOutput(
            klasyfikacja=raw.get("klasyfikacja", "niewystarczajace_dane"),
            pewnosc=float(raw.get("pewnosc", 0.5)),
            co_zostalo_pominiete=raw.get("co_zostalo_pominiete"),
            cytat_dowodowy=raw.get("cytat_dowodowy", odpowiedz[:50]),
            uzasadnienie=raw.get("uzasadnienie", "Brak uzasadnienia")
        )

        # Proste tłumaczenie
        plain = plain_language_service.EVASION_DICTIONARY.get(validated.klasyfikacja, {})
        return {
            **validated.model_dump(),
            "naglowek_prosty": plain.get("tytul", "Odpowiedź na pytanie"),
            "proste_podsumowanie": raw.get("proste_podsumowanie_dla_widza") or plain.get("opis", "")
        }

    async def analyze_rhetoric(self, tekst_wypowiedzi: str) -> Dict[str, Any]:
        """
        Analiza technik retorycznych z walidacją i prostym językiem.
        """
        prompt = f"""Przeanalizuj wypowiedź pod kątem technik retorycznych i erystycznych.
Wskazuj TYLKO techniki faktycznie obecne w tekście, z dowodem cytowanym. Nie doszukuj się na siłę.
Każdą technikę opisz językiem zrozumiałym dla zwykłego człowieka.

WYPOWIEDŹ: {tekst_wypowiedzi}

Zwróć JSON:
{{
  "techniki": [
    {{
      "nazwa": "np. apel_do_emocji | apel_do_autorytetu | falszywa_dychotomia | straw_man | wyprzedzenie_zarzutu | generalizacja | etykietowanie | powtorzenie_ramy | pytanie_retoryczne",
      "nazwa_prosta": "chwytliwa, prosta nazwa po polsku",
      "cytat_dowodowy": "dosłowny fragment",
      "pewnosc": 0.0-1.0,
      "opis_prosty": "co konkretnie robi ta technika i po co mówi to polityk"
    }}
  ],
  "gestosc_konkretu": "wysoka | srednia | niska",
  "uzasadnienie_gestosci": "ile padło konkretów (liczby, zobowiązania) vs frazesów"
}}"""
        return await self._call_gemini_json(prompt)

    async def synthesize_plain_profile(
        self,
        imie_nazwisko: str,
        uniki_i_techniki: List[Dict[str, Any]],
        biometria_stres: List[Dict[str, Any]],
        statystyki_czasu: Dict[str, Any],
        zakres_analizy: str = "pelny"
    ) -> Dict[str, Any]:
        """
        Synteza całościowego profilu w prostym języku.
        W trybie "pelny" ocenia: zachowanie + stan psychiczny + siłę argumentacji + perswazję (czy ludzie to kupią) + starcie z adwersarzami.
        W trybie "behawioralny" skupia się wyłącznie na emocjach, lękach, mowie ciała i napięciu.
        """
        if zakres_analizy == "behawioralny":
            prompt = f"""Dostajesz wykryte reakcje mowy ciała, drżenie głosu, mimikę i emocje dla osoby: {imie_nazwisko}.
ZAKRES OCENY: Wyłącznie stan psychiczny, emocje, lęki i zachowanie niewerbalne.

DANE:
- Zdarzenia biometryczne i mimiczne: {json.dumps(biometria_stres, ensure_ascii=False)}
- Zaobserwowane reakcje: {json.dumps(uniki_i_techniki, ensure_ascii=False)}

Zwróć JSON:
{{
  "ogolny_nastroj_i_emocje": "2 zdania opisujące nastrój mówcy",
  "czule_punkty_i_leki": ["jakie pytania lub tematy wywołały nagły stres/drżenie/mruganie"],
  "zgodnosc_ciala_ze_slowami": "czy ciało potwierdzało wypowiedzi czy zdradzało dysonans",
  "poziom_opanowania_stresu": "Wysoki / Umiarkowany / Niski",
  "zastrzezenia": "gdzie zabrakło danych / co obniża pewność wniosków"
}}"""
        else:
            prompt = f"""Dostajesz komplet wykrytych markerów zachowania, reakcji stresowych, argumentacji i mowy dla osoby: {imie_nazwisko}.
ZAKRES OCENY: PEŁNY PROFIL — oceniasz ZARÓWNO zachowanie i stan psychiczny, JAK I to czy dobrze argumentuje, czy jest przekonujący, czy odbiorcy/wyborcy kupią jego przekaz oraz jak radzi sobie z adwersarzami/dziennikarzem.

DANE:
- Zdarzenia, uniki i techniki: {json.dumps(uniki_i_techniki, ensure_ascii=False)}
- Reakcje stresowe i biometria: {json.dumps(biometria_stres, ensure_ascii=False)}
- Bilans wypowiedzi i tempo: {json.dumps(statystyki_czasu, ensure_ascii=False)}

Zwróć JSON:
{{
  "ogolny_nastroj_i_emocje": "2 zdania o stanie psychicznym i emocjonalnym mówcy",
  "ukryte_intencje_i_taktyka": "2 zdania o prawdziwym celu rozmówcy",
  "skutecznosc_argumentacji": "ocena czy argumenty są merytoryczne i logiczne, czy to tylko puste frazesy i uniki",
  "perswazyjnosc_odbiorcow": "czy zwykły widz / wyborca kupi ten przekaz i do kogo on trafia",
  "radzenie_z_adwersarzami": "jak mówca poradził sobie ze starciem (czy zdominował studio, czy dał się zapędzić w kozi róg)",
  "glowne_mocne_strony": ["w czym mówca był opanowany i skuteczny"],
  "slabe_strony_i_czule_punkty": ["jakie tematy wywołały stres, błędy lub uniki"],
  "zgodnosc_ciala_ze_slowami": "czy mowa ciała potwierdzała słowa czy zdradzała dysonans",
  "zastrzezenia": "gdzie zabrakło danych / co obniża pewność wniosków"
}}"""

        return await self._call_gemini_json(prompt)

    async def identify_and_attribute_speakers(
        self,
        fragmenty_transkrypcji: List[Dict[str, Any]],
        wskazany_polityk: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Rozpoznaje tożsamość i role mówców w nagraniu (SPEAKER_00, SPEAKER_01...)
        oraz ustala, który mówca to wskazany przez użytkownika polityk (cel profilowania).
        """
        # Przygotuj reprezentatywne próbki wypowiedzi dla każdego mówcy
        tekst_probek = ""
        for item in fragmenty_transkrypcji[:25]:
            speaker = item.get("speaker_tag", "MÓWCA")
            text = item.get("tekst", "").strip()
            tekst_probek += f"[{speaker}]: {text}\n"

        target_info = (
            f"Użytkownik wskazał jako polityka do profilowania: '{wskazany_polityk}'."
            if wskazany_polityk
            else "Użytkownik nie podał nazwiska. Rozpoznaj tożsamości mówców i wyznacz głównego badanego polityka/gościa."
        )

        prompt = f"""Dostajesz fragmenty transkrypcji nagrania z przypisanymi tagami mówców (SPEAKER_00, SPEAKER_01 itd.).
{target_info}

Twoim zadaniem jest:
1. Rozpoznanie tożsamości osób (imię, nazwisko, funkcja/rola) na podstawie:
   - sposobu w jaki rozmówcy się do siebie zwracają (np. „Panie Premierze”, „Panie Pośle”, „Pani Redaktor”, po imieniu),
   - kontekstu wypowiedzi (kto zadaje pytania, kto się tłumaczy, kto reprezentuje partię/rząd),
   - charakterystycznych tematów lub przedstawiania się.
2. Wskazanie, który tag mówcy (np. SPEAKER_01) odpowiada badanemu politykowi.
3. Podanie dla każdego mówcy cytatu dowodowego i pewności (0.0-1.0).

TRANSKRYPCJA:
{tekst_probek}

Zwróć poprawny JSON:
{{
  "mowcy": [
    {{
      "speaker_tag": "SPEAKER_00",
      "imie_nazwisko": "np. Monika Olejnik / Dziennikarz",
      "rola": "Dziennikarz / Prowadzący | Badany polityk | Kontrkandydat / Adwersarz",
      "opis": "Krótkie wyjaśnienie roli w rozmowie",
      "jest_celem": true/false,
      "cytat_dowodowy": "dosłowny cytat uzasadniający tożsamość",
      "pewnosc": 0.0-1.0
    }}
  ],
  "wybrany_speaker_tag": "SPEAKER_XX",
  "polityk_docelowy_nazwisko": "Imię i nazwisko wybranego polityka",
  "uzasadnienie_wyboru": "1-2 zdania prostym językiem polskim dlaczego ten mówca to cel profilowania"
}}"""
        return await self._call_gemini_json(prompt)

    async def profile_audio_multimodal(
        self,
        audio_path: str,
        target_person: Optional[str] = None,
        zakres_analizy: str = "pelny"
    ) -> Dict[str, Any]:
        """
        Multimodalna analiza nagrania audio przez Gemini 3.6 Flash.
        Odsłuchuje rzeczywiste audio i generuje precyzyjny profil dla tego konkretnego nagrania.
        """
        import os, base64, subprocess

        # Jeśli plik to .wav, skonwertuj na lekki mp3 64k
        mp3_path = audio_path
        if audio_path.endswith(".wav"):
            mp3_candidate = audio_path.rsplit(".", 1)[0] + ".mp3"
            if not os.path.exists(mp3_candidate):
                subprocess.run(
                    ["ffmpeg", "-y", "-i", audio_path, "-b:a", "64k", mp3_candidate],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True
                )
            mp3_path = mp3_candidate

        with open(mp3_path, "rb") as f:
            audio_b64 = base64.b64encode(f.read()).decode("utf-8")

        target_info = f"Główny cel profilowania: {target_person}." if target_person else "Zidentyfikuj głównego badanego polityka/gościa."

        prompt = f"""Jesteś bezkompromisowym, analitycznym doradcą ds. marketingu politycznego, spin doctorem oraz trenerem wystąpień publicznych systemu PROFILER.
Odsłuchaj dołączone nagranie audio. {target_info}
ZAKRES PROFILOWANIA: {"PEŁNY AUDYT SZTABOWY (psychologia, mowa ciała, nielogiczności, marketing polityczny, warsztat)" if zakres_analizy == "pelny" else "TYLKO STAN PSYCHICZNY I BEHAWIORALNY"}.

ZASADY AUDYTU SZTABOWEGO:
1. BEZWZGLĘDNA CZUJNOŚĆ I BRAK TARYFY ULGOWEJ: Żadnych laurek. Polityk potrzebuje twardej prawdy o swoich słabościach, wyciekach emocjonalnych i nielogicznościach, zanim obnażą je wrogie sztaby i dziennikarze.
2. DETEKCJA NIEPOŻĄDANYCH EMOCJI: Wskaż momenty irytacji, zniecierpliwienia, belferskiego protekcjonalizmu, uśmieszków wyższości/pogardy (AU14), tonu bezradności lub defensywnego ucinania wątków.
3. DETEKCJA NIELOGICZNOŚCI I LUK W ARGUMENTACJI: Wskaż sprzeczności wewnętrzne, obietnice bez mechanizmu wdrożenia, myślenie życzeniowe i toporne uniki od pytań.
4. AMUNICJA DLA OPONENTÓW: Wskaż sformułowania, które przeciwnicy wytną na złośliwe setki, rolki czy memy (tzw. samobóje).
5. SKRYPTY KOREKCYJNE: Do wytkniętych błędów podaj gotową, bezpieczną ripostę sztabową („Zamiast X -> Mów Y”).
6. WARSZTAT WYSTĄPIEŃ I EMISJI: Oceń tempo, intonację (unikanie uptalku), pauzy i wypełniacze.
7. KALIBRACJA OCENY: Skompresuj ocenę punktową 1-10 w stronę środka skali (zazwyczaj 4–7/10 w zależności od skali uchybień; unikaj zawyżania do 8–10 oraz skrajnego 1–2).
8. FORMAT JĘZYKOWY: Sentence case (tylko pierwsza litera zdania wielka). Odpowiedź formułuj zwięźle, esencjonalnie i z wysoką gęstością faktów.

Zwróć poprawny JSON o schemacie:
{{
  "temat_rozmowy": "Zwięzły, 2-3 zdaniowy opis w sentence case, o czym dokładnie jest to nagranie i jakie główne wątki poruszono",
  "rozpoznani_mowcy": [
    {{
      "speaker_tag": "SPEAKER_00",
      "imie_nazwisko": "Imię i nazwisko",
      "rola": "Dziennikarz / prowadzący | Badany polityk | Kontrkandydat",
      "opis": "Zwięzły opis roli w rozmowie",
      "jest_celem": true/false
    }}
  ],
  "wybrany_speaker_tag": "SPEAKER_XX",
  "wnioski": {{
    "nastroje_i_emocje": "Esencjonalna diagnoza w sentence case nastroju, stabilności i energii badanego, z konkretnym cytatem i barwą głosu.",
    "glowne_uniki_i_taktyka": "Zwięzła analiza taktyki rozmowy, narzucania tematów lub unikania odpowiedzi, z dosłownym cytatem.",
    "czule_punkty_stres": "Dekonstrukcja momentów podwyższonego napięcia, wahań tempa lub przyspieszenia oddechu z cytatem.",
    "spojnosc_mowy_ze_slowami": "Ocena czy ton, energia i modulacja głosu współgrają ze słowami, czy zdradzają wyuczoną formułkę lub dysonans.",
    "sila_argumentacji": "Ocena logicznej spójności: proporcja twardych faktów i wyliczeń do frazesów i uników.",
    "czy_odbiorcy_to_kupia": "Diagnoza odbioru przez przeciętnego widza: wiarygodność, nośność i naturalność przekazu.",
    "pojedynek_z_adwersarzami": "Ocena kontroli nad sytuacją w studiu i reakcji na presję ze strony prowadzącego."
  }},
  "marketing_polityczny": {{
    "werdykt": "Występ poprawny z zastrzeżeniami | Bilans mieszany ze wskazaniem na błędy | Sukces wizerunkowy | Porażka wizerunkowa",
    "ocena_punktowa_1_10": 6,
    "uzasadnienie_werdyktu": "Zwięzłe, bezkompromisowe uzasadnienie werdyktu: bilans zysków i strat, główne punkty krytyczne i przyczyna takiej noty.",
    "glowne_plusy": [
      {{
        "nazwa_atutu": "Zwięzły tytuł atutu w sentence case",
        "cytat_lub_moment": "Dosłowny cytat z nagrania",
        "dlaczego_to_plus": "Precyzyjne wyjaśnienie psychologiczne i polityczne: jaki mechanizm zadziałał i co polityk zyskał."
      }}
    ],
    "popelnione_bledy_i_minusy": [
      {{
        "nazwa_bledu": "Zwięzły tytuł błędu / uchybienia w sentence case",
        "cytat_lub_moment": "Dosłowny cytat z nagrania pokazujący moment błędu",
        "dlaczego_to_minus": "Krytyczna dekonstrukcja uchybienia: na jakie zarzuty naraża polityka to sformułowanie i jak zostanie odebrane."
      }}
    ],
    "niepozadane_emocje_i_mowa_ciala": [
      {{
        "reakcja_lub_emocja": "Nazwa niepożądanej emocji (np. irytacja, uśmieszek wyższości, ton bezradności, zniecierpliwienie)",
        "cytat_lub_moment": "Dosłowny cytat lub moment w nagraniu",
        "dlaczego_to_szkodliwe": "Dlaczego liderowi nie wolno tego okazywać i jak odbiera to widz",
        "zalecenie_sztabowe": "Konkretna wskazówka jak wygasić ten nawyk i utrzymać pokerową twarz"
      }}
    ],
    "nielogicznosci_i_luki_argumentacyjne": [
      {{
        "luka_lub_sprzecznosc": "Nazwa błędu logicznego (np. obietnica bez pokrycia, sprzeczność celów, fałszywa analogia)",
        "cytat_lub_moment": "Fragment wypowiedzi zawierający błąd logiczny",
        "diagnoza_logiczna": "Na czym dokładnie polega brak logiki lub mechanizmu sprawczego",
        "ryzyko_kontrataku": "Jak dziennikarz lub oponent może to jednym pytaniem zdemolować"
      }}
    ],
    "amunicja_dla_oponentow": [
      {{
        "cytat_ryzykowny": "Niefortunny cytat ('samobój')",
        "potencjalne_uderzenie_opozycji": "Jak sztab przeciwników wytnie i wykorzysta to sformułowanie w spotach i social mediach"
      }}
    ],
    "gotowe_riposty_zamiast_bledow": [
      {{
        "kontekst_pytania": "Trudne pytanie dziennikarza lub wątek sporny",
        "co_powiedzial": "Błędna lub defensywna odpowiedź polityka z nagrania",
        "rekomendowana_riposta": "Gotowa, bezpieczna i sprawcza formuła sztabowa do wdrożenia"
      }}
    ],
    "warsztat_mowy_i_dykcji": "Zwięzła ocena techniczna: tempo wypowiedzi, intonacja, pauzy, wypełniacze i nawyki emisyjne.",
    "nosnosc_medialna_soundbites": "Zwięzła ocena najlepszej 'setki' z dosłownym cytatem do serwisów informacyjnych i social mediów.",
    "wplyw_na_elektorat": {{
      "twardy_elektorat": "Zwięzła diagnoza reakcji twardego elektoratu.",
      "niezdecydowani": "Zwięzła diagnoza odbioru przez wyborców z centrum.",
      "przeciwnicy": "Zwięzła diagnoza amunicji dla oponentów."
    }},
    "rekomendacje_sztabowe": [
      "Konkretna dyrektywa sztabowa 1 przed kolejnym wywiadem",
      "Konkretna dyrektywa sztabowa 2 przed kolejnym wywiadem",
      "Konkretna dyrektywa sztabowa 3 przed kolejnym wywiadem"
    ]
  }}
}}"""

        url = f"{GEMINI_API_URL}?key={self.api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"inline_data": {"mime_type": "audio/mp3", "data": audio_b64}},
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Błąd multimodalnej analizy Gemini ({resp.status_code}): {resp.text}")
            
            data = resp.json()
            try:
                text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_content)
                if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict):
                    return parsed[0]
                return parsed if isinstance(parsed, dict) else {}
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                raise RuntimeError(f"Nie udało się sparsować odpowiedzi JSON z analizy audio: {str(e)}")

gemini_profiler = GeminiProfilerService()

