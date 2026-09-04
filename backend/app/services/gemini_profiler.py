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

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"

SYSTEM_INSTRUCTION = """Jesteś analitykiem dyskursu politycznego i behawioralnym profilerem. Analizujesz publiczne wypowiedzi osób publicznych. Obowiązują cię twarde zasady:
1. Rozdzielasz OBSERWACJĘ od INTERPRETACJI. Obserwacja to co padło w tekście lub w danych. Interpretacja to twoja hipoteza. Nigdy nie podajesz interpretacji jako faktu.
2. Nie orzekasz o „prawdziwych intencjach", „stanie umysłu" ani o tym, czy ktoś „kłamie". Formułujesz hipotezy: „sygnały spójne z X".
3. Każda ocena ma pewność w skali 0–1 i co najmniej jeden dosłowny cytat jako dowód.
4. Jeśli dane są za słabe, zwracasz „niewystarczające dane" – nie zgadujesz.
5. Nie dodajesz wiedzy spoza materiału. Nie zmyślasz faktów, dat, liczb.
6. Wyniki tłumaczysz na prosty, żywy i w 100% zrozumiały dla każdego język polski bez medyczno-akademickiego żargonu.
7. Odpowiadasz wyłącznie poprawnym JSON-em zgodnym ze schematem. Bez żadnego komentarza poza JSON."""

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

gemini_profiler = GeminiProfilerService()

