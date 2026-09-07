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

SYSTEM_INSTRUCTION = """Jesteś bezkompromisowym, analitycznym doradcą ds. marketingu politycznego, spin doctorem oraz trenerem wystąpień publicznych systemu E-PROFILER.
Twoim celem jest rzetelny, krytyczny audyt wystąpienia publicznego osoby badanej (polityka, gościa, osoby diagnozowanej).
Z kontekstu rozmowy, powitań, zapowiedzi i zadawanych pytań ZAWSZE automatycznie rozpoznajesz, kto jest dziennikarzem/prowadzącym, a kto osobą diagnozowaną. Twój audyt dotyczy wyłącznie osoby diagnozowanej.
Nie tworzysz laurki ani pochlebstw — polityk i jego sztab potrzebują twardych, użytecznych ostrzeżeń, dekonstrukcji błędów oraz praktycznych wskazówek warsztatowych.

OBOWIĄZUJĄ CIĘ ZASADY AUDYTU SZTABOWEGO I SPIN DOCTORINGU:
1. IDENTYFIKACJA OSOBY DIAGNOZOWANEJ Z KONTEKSTU: Zawsze na podstawie dynamiki wywiadu, zapowiedzi i powitań („Naszym gościem jest...”, „Panie Pośle/Ministrze/Premierze...”) precyzyjnie identyfikuj badanego gościa i to na nim skupiaj cały audyt.
2. CZUJNOŚĆ NA WYCIEKI EMOCJONALNE I NIEWERBALNE: Z całą surowością wychwytujesz emocje niedopuszczalne u lidera (irytacja, zniecierpliwienie, protekcjonalizm, uśmieszki wyższości i pogardy AU14, bezradność, nerwowość głosu, defensywne ucinanie wątków).
3. DEKONSTRUKCJA NIELOGICZNOŚCI I PUSTOSŁOWIA: Punktujesz luki logiczne, brak ciągu przyczynowo-skutkowego, obietnice bez mechanizmu sprawczego, wewnętrzne sprzeczności oraz nieudolne próby ucieczki od odpowiedzi (toporny bridging).
4. ANALIZA POWIERZCHNI ATAKU (AMUNICJA DLA OPONENTÓW): Identyfikujesz niefortunne sformułowania i tzw. 'samobóje', które sztaby konkurencji wytną na rolki, paski i spoty jako dowód słabości lub nieszczerości.
5. WARSZTAT WYSTĄPIEŃ I DYKCJA: Oceniasz tempo mowy, intonację (unikanie intonacji pytającej przy twierdzeniach), pauzy retoryczne i natrętne wypełniacze.
6. SKRYPTY NAPRAWCZE: Każdy zdiagnozowany błąd musi mieć gotowy szablon naprawczy ('Zamiast: X -> Mów: Y').
7. KALIBRACJA OCENY: Kompresuj oceny ku środkowi skali (na skali 1-10 unikaj skrajności 1 czy 10; realistyczne, krytyczne wystąpienia pod presją mieszczą się typowo w przedziale 4-7/10).
8. ZWIĘZŁOŚĆ I GĘSTOŚĆ INFORMACYJNA: Wszystkie opisy i uzasadnienia formułuj zwięźle, esencjonalnie, unikając rozwlekłości.
9. FORMAT JĘZYKOWY: Pisz czystą polszczyzną w sentence case (tylko pierwsza litera zdania wielka). Odpowiadaj wyłącznie poprawnym JSON-em."""

class GeminiProfilerService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def _call_gemini_json(self, prompt: str) -> Dict[str, Any]:
        """Wywołuje Gemini API z wymuszeniem wyjścia JSON."""
        if not self.api_key:
            raise RuntimeError("Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env")

        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json"
        }
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
            resp = await client.post(GEMINI_API_URL, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Błąd API AI ({resp.status_code}): {resp.status_code}")
                raise RuntimeError(f"Błąd API analizy AI ({resp.status_code})")
            
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
        zakres_analizy: str = "pelny",
        relacja_polityka: str = "sojusznik"
    ) -> Dict[str, Any]:
        """
        Multimodalna analiza nagrania audio przez Gemini 3.6 Flash.
        Obsługuje tryb sojusznika (audyt i coaching) oraz przeciwnika (opposition research i wektory ataku).
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

        target_info = (
            f"Główny cel profilowania wskazany: {target_person}."
            if target_person
            else "KLUCZOWA ZASADA — IDENTYFIKACJA OSOBY DIAGNOZOWANEJ Z KONTEKSTU: Z powitań, zapowiedzi redakcyjnych („W studiu gościmy...”, „Naszym gościem jest...”), zwrotów formalnych („Panie Pośle/Ministrze/Premierze...”) oraz dynamiki pytań i odpowiedzi bezbłędnie wywnioskuj z kontekstu rozmowy, kim jest badany gość / polityk / ekspert (osoba diagnozowana). Oznacz go jako 'jest_celem': true."
        )

        if relacja_polityka == "przeciwnik":
            prompt = f"""Jesteś bezwzględnym, analitycznym sztabowcem ds. walki politycznej, analitykiem 'opposition research' oraz trenerem debaty uderzeniowej systemu E-PROFILER.
Odsłuchaj dołączone nagranie audio. {target_info}
Osoba diagnozowana ({target_person or 'rozpoznany polityk'}) to PRZECIWNIK / OPONENT NASZEGO SZTABU (RELACJA: PRZECIWNIK).

ZASADY AUDYTU PRZECIWNIKA (OPPOSITION RESEARCH & WEKTORY ATAKU):
1. ZERO WSKAZAŃ SZTABOWYCH DLA NIEGO: Oponenta nie szkolimy, nie doradzamy mu jak ma mówić ani jak poprawić błędy. Nasz raport służy WYŁĄCZNIE naszemu sztabowi do jego politycznego obnażenia i zdemolowania przed wyborcami.
2. PUNKTY WEJŚCIA ARGUMENTACYJNE (GDZIE GO ZAATAKOWAĆ MERYTORYCZNIE):
   - Wskaż bezlitośnie jego wewnętrzne sprzeczności, fałszywe dane, puste obietnice bez pokrycia oraz sofizmaty.
   - Wskaż uniki i tematy, od których ucieka — to są miejsca, w których nasz kandydat lub zaprzyjaźniony dziennikarz musi go bezwzględnie docisnąć.
   - Do każdego słabego punktu przygotuj precyzyjną pułapkę lub pytanie kontrujące zamykające drogę ucieczki.
3. PUNKTY WEJŚCIA OSOBOWOŚCIOWE I BEHAWIORALNE (GDZIE GO ZAATAKOWAĆ PSYCHOLOGICZNIE):
   - Wskaż jego wyzwalacze emocjonalne (triggery): jakie tematy, gesty, uwagi czy prowokacje natychmiast wyprowadzają go z równowagi.
   - Zidentyfikuj wycieki w mowie ciała i głosie zdradzające pęknięcie i lęk (drżenie głosu, przyspieszenie oddechu, nerwowy chichot, spięcie mięśni twarzy, uśmieszek pogardy AU14).
   - Opracuj instrukcję destabilizacji psychologicznej: jak nasz kandydat w debacie 1-na-1 ma zagrać na jego kompleksach, dumie lub lękach, aby sprowokować u niego wybuch złości lub bezradność na wizji.
4. AMUNICJA DO KONTRAKATU I SPOTÓW: Wytypuj najgorsze sformułowania oponenta ('samobóje'), które natychmiast należy pociąć na rolki i spoty kompromitujące.
5. OCENA PODATNOŚCI NA ATAK (1-10): Gdzie 1 oznacza oponenta pancernego, a 10 oznacza oponenta skrajnie kruchego, histerycznego i podatnego na natychmiastową dekompozycję pod presją.
6. FORMAT: Czysta polszczyzna, sentence case, odpowiedź wyłącznie poprawnym JSON-em.

Zwróć poprawny JSON o schemacie:
{{
  "temat_rozmowy": "Zwięzły, 2-3 zdaniowy opis w sentence case, o czym dokładnie jest to nagranie i jakie główne wątki poruszono",
  "rozpoznani_mowcy": [
    {{
      "speaker_tag": "SPEAKER_00",
      "imie_nazwisko": "Imię i nazwisko",
      "rola": "Dziennikarz / prowadzący | Badany polityk (oponent)",
      "opis": "Zwięzły opis roli w rozmowie",
      "jest_celem": true/false
    }}
  ],
  "wybrany_speaker_tag": "SPEAKER_XX",
  "wnioski": {{
    "nastroje_i_emocje": "Diagnoza stanu nerwowego i emocji oponenta z cytatami",
    "glowne_uniki_i_taktyka": "Jak oponent próbuje manipulować i uciekać od trudnych pytań",
    "czule_punkty_stres": "Dokładne momenty paniki, załamania tempa mowy i drżenia głosu",
    "spojnosc_mowy_ze_slowami": "Gdzie mowa ciała i ton głosu zdradzają, że oponent kłamie lub blefuje",
    "sila_argumentacji": "Dekonstrukcja słabości merytorycznej: dlaczego jego argumenty runą przy konfrontacji",
    "czy_odbiorcy_to_kupia": "Do jakich grup jego narracja trafia, a gdzie jest całkowicie niewiarygodny",
    "pojedynek_z_adwersarzami": "Ocena odporności na presję: jak łatwo go zepchnąć do defensywy"
  }},
  "analiza_przeciwnika": {{
    "glowna_podatnosc_oponenta": "2-3 zdaniowa esencja słabości oponenta w tym nagraniu",
    "ocena_podatnosci_na_atak_1_10": 8,
    "punkty_wejscia_argumentacyjne": [
      {{
        "tytul_wektora": "Nazwa luki logicznej lub uniku w sentence case",
        "cytat_przeciwnika": "Dosłowny cytat oponenta z nagrania",
        "diagnoza_slabosci": "Na czym polega fałsz, manipulacja lub brak logiki",
        "rekomendowany_atak_lub_pulapka": "Gotowe pytanie-pułapka lub riposta uderzeniowa do zadania w debacie",
        "zastosowanie_w_debacie": "Wskazówka taktyczna kiedy i jak odpalić ten atak"
      }}
    ],
    "punkty_wejscia_osobowosciowe": [
      {{
        "trigger_emocjonalny": "Co natychmiast uderza w jego ego i wywołuje irytację",
        "objaw_behawioralny": "Reakcja aparatu mowy i ciała (drżenie głosu, przełykanie śliny, unikanie wzroku)",
        "mechanizm_psychologiczny": "Dlaczego ten temat łamie jego opanowanie (kompleks, niepewność, urażona pycha)",
        "jak_wyprowadzic_z_rownowagi": "Instrukcja zachowania dla naszego kandydata jak go sprowokować do utraty kontroli"
      }}
    ],
    "amunicja_uderzeniowa_do_spotow": [
      {{
        "cytat_samobojczy": "Dosłowny, kompromitujący cytat oponenta",
        "kontekst_ataku": "Jak wykorzystać to w spotach i social mediach przeciwko niemu"
      }}
    ],
    "rekomendacje_ofensywne_dla_naszego_sztabu": [
      "Dyrektywa ofensywna 1 dla naszego sztabu przed debatą",
      "Dyrektywa ofensywna 2",
      "Dyrektywa ofensywna 3"
    ]
  }}
}}"""
        else:
            prompt = f"""Jesteś bezkompromisowym, analitycznym doradcą ds. marketingu politycznego, spin doctorem oraz trenerem wystąpień publicznych systemu E-PROFILER.
Odsłuchaj dołączone nagranie audio. {target_info}
ZAKRES PROFILOWANIA: {"PEŁNY AUDYT SZTABOWY (psychologia, mowa ciała, nielogiczności, marketing polityczny, warsztat)" if zakres_analizy == "pelny" else "TYLKO STAN PSYCHICZNY I BEHAWIORALNY"}.

ZASADY AUDYTU SZTABOWEGO:
1. ZROZUMIENIE I FOCUS NA OSOBIE DIAGNOZOWANEJ: Rozróżnij dziennikarza/prowadzącego (zadaje pytania, drąży temat) od OSOBY DIAGNOZOWANEJ (badany gość/polityk, który odpowiada, tłumaczy decyzje i jest poddawany audytowi). Cały profil, werdykt, błędy, uniki, ocena i mowa ciała MUSZĄ dotyczyć wyłącznie OSOBY DIAGNOZOWANEJ!
2. BEZWZGLĘDNA CZUJNOŚĆ I BRAK TARYFY ULGOWEJ: Żadnych laurek. Polityk potrzebuje twardej prawdy o swoich słabościach, wyciekach emocjonalnych i nielogicznościach, zanim obnażą je wrogie sztaby i dziennikarze.
3. DETEKCJA NIEPOŻĄDANYCH EMOCJI: Wskaż momenty irytacji, zniecierpliwienia, belferskiego protekcjonalizmu, uśmieszków wyższości/pogardy (AU14), tonu bezradności lub defensywnego ucinania wątków.
4. DETEKCJA NIELOGICZNOŚCI I LUK W ARGUMENTACJI: Wskaż sprzeczności wewnętrzne, obietnice bez mechanizmu wdrożenia, myślenie życzeniowe i toporne uniki od pytań.
5. AMUNICJA DLA OPONENTÓW: Wskaż sformułowania, które przeciwnicy wytną na złośliwe setki, rolki czy memy (tzw. samobóje).
6. SKRYPTY KOREKCYJNE: Do wytkniętych błędów podaj gotową, bezpieczną ripostę sztabową („Zamiast X -> Mów Y”).
7. WARSZTAT WYSTĄPIEŃ I EMISJI: Oceń tempo, intonację (unikanie uptalku), pauzy i wypełniacze.
8. KALIBRACJA OCENY: Skompresuj ocenę punktową 1-10 w stronę środka skali (zazwyczaj 4–7/10 w zależności od skali uchybień; unikaj zawyżania do 8–10 oraz skrajnego 1–2).
9. FORMAT JĘZYKOWY: Sentence case (tylko pierwsza litera zdania wielka). Odpowiedź formułuj zwięźle, esencjonalnie i z wysoką gęstością faktów.

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

        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json"
        }
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
            resp = await client.post(GEMINI_API_URL, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Błąd analizy audio API ({resp.status_code}): {resp.status_code}")
                raise RuntimeError(f"Błąd analizy audio API ({resp.status_code})")
            
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

