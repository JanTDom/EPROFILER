import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import (
    Person,
    PersonBaseline,
    Recording,
    Segment,
    Marker,
    BiometricEvent,
    PsychometricProfile,
    PersonStance,
    PersonFlipFlop,
    PersonVulnerability,
    PersonRhetoricalPattern,
    PersonExternalFact
)

logger = logging.getLogger("profiler.knowledge_base")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"

KNOWLEDGE_SYSTEM_INSTRUCTION = """Jesteś analitykiem wywiadowczym, spin doctorem i głównym archiwistą wiedzy systemu E-PROFILER.
Twoim zadaniem jest budowanie długofalowego, obiektywnego dossier poznawczo-retorycznego osób publicznych i polityków.
Zajmujesz się:
1. Ekstrakcją twardych deklaracji i poglądów (temat, stanowisko, kierunek, stopień kategoryczności).
2. Detekcją sprzeczności, wolt poglądowych i zmian narracji w czasie (flip-flop detection).
3. Identyfikacją powtarzających się czułych punktów (tematów, które wyzwalają reakcje stresowe, agresję lub paniczną ucieczkę).
4. Klasyfikacją nawykowych figur erystycznych i mostków retorycznych.
5. Weryfikacją faktograficzną (fact-checking) w oparciu o wiedzę publiczną, archiwa i fakty sejmowe.
Zawsze odpowiadaj wyłącznie poprawnym, zwięzłym JSON-em w języku polskim (sentence case)."""

class KnowledgeBaseService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    async def _call_gemini_json(self, prompt: str, search_grounding: bool = False) -> Dict[str, Any]:
        """Wywołuje Gemini API z opcjonalnym Google Search Grounding i zwraca sparsowany JSON."""
        if not self.api_key:
            logger.warning("Brak GEMINI_API_KEY. Zwracanie pustej odpowiedzi AI dla bazy wiedzy.")
            return {}

        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        payload: Dict[str, Any] = {
            "system_instruction": {
                "parts": [{"text": KNOWLEDGE_SYSTEM_INSTRUCTION}]
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

        # Włączenie Google Search Grounding dla wzbogacania z sieci, jeśli dostępne
        if search_grounding:
            payload["tools"] = [{"google_search": {}}]

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(GEMINI_API_URL, json=payload, headers=headers)
            if resp.status_code != 200:
                logger.error(f"Błąd Gemini API w KnowledgeBaseService ({resp.status_code}): {resp.text[:300]}")
                raise RuntimeError(f"Błąd API AI dla bazy wiedzy ({resp.status_code})")

            data = resp.json()
            try:
                text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text_content)
            except (KeyError, IndexError, json.JSONDecodeError) as e:
                logger.error(f"Błąd parsowania JSON z Gemini: {str(e)}")
                return {}

    async def bootstrap_person_dossier(self, db: AsyncSession, person: Person) -> Dict[str, Any]:
        """
        Zasila bazę wiedzy 'na zimno' (cold-start) z sieci dla nowego lub edytowanego polityka.
        Pobiera oficjalną linię partii, znane stanowiska, czułe punkty i zweryfikowane fakty.
        """
        logger.info(f"Rozpoczynanie bootstrapowania dossier dla polityka: {person.imie_nazwisko} ({person.partia})")

        prompt = f"""Przeprowadź wywiadowczą i faktograficzną syntezę wiedzy o polityku do systemu E-PROFILER:
OSOBA: {person.imie_nazwisko}
FUNKCJA / STANOWISKO: {person.funkcja or 'Polityk / Działacz publiczny'}
PARTIA / UGRUPOWANIE: {person.partia or 'Nieokreślone'}

Zbuduj początkowe dossier wiedzy w oparciu o fakty publiczne i dotychczasową działalność.
Zwróć JSON o strukturze:
{{
  "funkcja_uzupelniona": "Precyzyjna aktualna lub najbardziej znana funkcja publiczna",
  "partia_uzupelniona": "Aktualne ugrupowanie polityczne",
  "glowne_stanowiska": [
    {{
      "temat": "Krótka nazwa tematu (np. Podatki, CPK, Unia Europejska, Świadczenia socjalne)",
      "podtemat": "np. Składka zdrowotna, Rozwój infrastruktury lotniczej",
      "stanowisko_opis": "Zwięzłe 1-2 zdania podsumowujące oficjalną linię polityka",
      "polaryzacja": "popiera" | "sprzeciwia" | "neutralne" | "unika",
      "pewnosc_deklaracji": 0.85,
      "cytat_lub_dowod": "Znany cytat lub odniesienie do głosowania/wypowiedzi medialnej",
      "zrodlo": "siec"
    }}
  ],
  "znane_czule_punkty": [
    {{
      "temat_trigger": "Temat niewygodny (np. Kontrowersje majątkowe, Poprzednie głosowanie X, Zmiana koalicji)",
      "typowy_stres": 75,
      "typowa_reakcja": "Opis jak polityk reaguje (np. atak na dziennikarza, nerwowy uśmieszek AU14, zasypywanie liczbami)",
      "przyklad_lub_zarzut": "Na czym polega zarzut oponentów"
    }}
  ],
  "nawyki_retoryczne": [
    {{
      "typ_wzorca": "mostek_erystyczny" | "whataboutism" | "apel_do_ludu" | "frazes_wytrych",
      "nazwa_wzorca": "Nazwa lub typowe zdanie (np. 'Polacy oczekują...', 'A co działo się za waszych czasów')",
      "szablon_lub_cytat": "Dosłowna lub typowa fraza",
      "funkcja_manipulacyjna": "W jakim celu polityk tego używa (np. zrzucenie odpowiedzialności)"
    }}
  ],
  "zweryfikowane_fakty_i_glosowania": [
    {{
      "temat": "Nazwa sprawy lub ustawy",
      "twierdzenie_lub_zarzut": "Co polityk twierdził lub jaki zarzut mu stawiano",
      "werdykt": "prawda" | "falsz" | "manipulacja" | "brak_potwierdzenia",
      "fakty_ustalone": "Krótkie twarde wyjaśnienie faktu",
      "zrodlo_nazwa": "Nazwa źródła (np. Kancelaria Sejmu, GUS, PKW)"
    }}
  ]
}}"""

        data = await self._call_gemini_json(prompt, search_grounding=True)
        if not data:
            logger.warning(f"Brak danych z Gemini dla bootstrapu {person.imie_nazwisko}")
            return {"status": "pusty_wynik"}

        # Aktualizacja brakujących danych polityka
        if not person.funkcja and data.get("funkcja_uzupelniona"):
            person.funkcja = data["funkcja_uzupelniona"]
        if not person.partia and data.get("partia_uzupelniona"):
            person.partia = data["partia_uzupelniona"]

        # Zapisz stanowiska
        for st in data.get("glowne_stanowiska", []):
            stmt = select(PersonStance).where(
                PersonStance.person_id == person.id,
                PersonStance.temat == st.get("temat")
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing and st.get("temat") and st.get("stanowisko_opis"):
                stance = PersonStance(
                    person_id=person.id,
                    temat=st.get("temat")[:255],
                    podtemat=st.get("podtemat", "")[:255] if st.get("podtemat") else None,
                    stanowisko_opis=st.get("stanowisko_opis"),
                    polaryzacja=st.get("polaryzacja", "neutralne"),
                    pewnosc_deklaracji=float(st.get("pewnosc_deklaracji", 0.8)),
                    cytat_dowodowy=st.get("cytat_lub_dowod"),
                    zrodlo_typ="siec",
                    data_deklaracji=datetime.utcnow()
                )
                db.add(stance)

        # Zapisz czułe punkty
        for vuln in data.get("znane_czule_punkty", []):
            stmt = select(PersonVulnerability).where(
                PersonVulnerability.person_id == person.id,
                PersonVulnerability.temat_trigger == vuln.get("temat_trigger")
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing and vuln.get("temat_trigger"):
                v_obj = PersonVulnerability(
                    person_id=person.id,
                    temat_trigger=vuln.get("temat_trigger")[:255],
                    srednie_napiecie_stresu=int(vuln.get("typowy_stres", 70)),
                    typowa_reakcja_obronna=vuln.get("typowa_reakcja", "Unik i próba zmiany tematu")[:255],
                    liczba_odnotowan=1,
                    przyklady_cytatow=[{
                        "zrodlo": "bootstrap_siec",
                        "zarzut": vuln.get("przyklad_lub_zarzut"),
                        "data": datetime.utcnow().isoformat()
                    }]
                )
                db.add(v_obj)

        # Zapisz nawyki retoryczne
        for rp in data.get("nawyki_retoryczne", []):
            stmt = select(PersonRhetoricalPattern).where(
                PersonRhetoricalPattern.person_id == person.id,
                PersonRhetoricalPattern.nazwa_wzorca == rp.get("nazwa_wzorca")
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing and rp.get("nazwa_wzorca"):
                r_obj = PersonRhetoricalPattern(
                    person_id=person.id,
                    typ_wzorca=rp.get("typ_wzorca", "mostek_erystyczny")[:100],
                    nazwa_wzorca=rp.get("nazwa_wzorca")[:255],
                    szablon_lub_cytat=rp.get("szablon_lub_cytat", rp.get("nazwa_wzorca")),
                    funkcja_manipulacyjna=rp.get("funkcja_manipulacyjna"),
                    czestotliwosc_uzycia=1,
                    przyklady=[{"zrodlo": "bootstrap_siec"}]
                )
                db.add(r_obj)

        # Zapisz fakty zewnętrzne
        for fact in data.get("zweryfikowane_fakty_i_glosowania", []):
            stmt = select(PersonExternalFact).where(
                PersonExternalFact.person_id == person.id,
                PersonExternalFact.temat == fact.get("temat")
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing and fact.get("temat"):
                f_obj = PersonExternalFact(
                    person_id=person.id,
                    temat=fact.get("temat")[:255],
                    twierdzenie_polityka=fact.get("twierdzenie_lub_zarzut", ""),
                    werdykt_weryfikacji=fact.get("werdykt", "brak_potwierdzenia")[:50],
                    fakty_ustalone=fact.get("fakty_ustalone", ""),
                    zrodlo_nazwa=fact.get("zrodlo_nazwa", "Publiczne archiwa")[:255]
                )
                db.add(f_obj)

        # Inicjalizacja bazowej linii osoby
        stmt = select(PersonBaseline).where(PersonBaseline.person_id == person.id)
        res = await db.execute(stmt)
        baseline = res.scalar_one_or_none()
        if not baseline:
            baseline = PersonBaseline(
                person_id=person.id,
                srednie_tempo_wpm=135.0,
                srednie_f0_hz=160.0,
                typowy_udzial_pauz=0.20,
                czeste_techniki=[rp.get("nazwa_wzorca") for rp in data.get("nawyki_retoryczne", [])[:3]],
                tematy_unikane=[vuln.get("temat_trigger") for vuln in data.get("znane_czule_punkty", [])[:3]],
                proba_nagran=0
            )
            db.add(baseline)

        await db.commit()
        logger.info(f"Pomyślnie zbootstrapowano dossier dla {person.imie_nazwisko}")
        return {"status": "sukces", "dane": data}

    async def ingest_recording_to_dossier(self, db: AsyncSession, recording_id: str, person_id: str) -> Dict[str, Any]:
        """
        Główny silnik asymilacji nowego nagrania do bazy wiedzy osoby:
        1. Pobiera transkrypt, markery i profil psychometryczny nagrania.
        2. Ekstrahuje nowe tezy polityka i porównuje je z dotychczasowymi z bazy (detekcja wolt / flip-flop).
        3. Aktualizuje rejestr czułych punktów (vulnerabilities).
        4. Aktualizuje katalog chwytów retorycznych (rhetorical patterns).
        5. Rekalibruje ruchomą linię bazową (moving average $B_0$).
        """
        logger.info(f"Zasilanie bazy wiedzy z nagrania {recording_id} dla polityka {person_id}")

        # Pobierz nagranie i powiązane obiekty
        rec_stmt = select(Recording).where(Recording.id == recording_id)
        rec_res = await db.execute(rec_stmt)
        recording = rec_res.scalar_one_or_none()
        if not recording:
            logger.error(f"Nie znaleziono nagrania {recording_id}")
            return {"error": "Nagranie nie istnieje"}

        per_stmt = select(Person).where(Person.id == person_id)
        per_res = await db.execute(per_stmt)
        person = per_res.scalar_one_or_none()
        if not person:
            logger.error(f"Nie znaleziono osoby {person_id}")
            return {"error": "Osoba nie istnieje"}

        # Pobierz istniejące stanowiska osoby
        existing_stances_stmt = select(PersonStance).where(PersonStance.person_id == person_id)
        existing_stances_res = await db.execute(existing_stances_stmt)
        existing_stances = existing_stances_res.scalars().all()
        existing_stances_dict = {s.temat.lower(): s for s in existing_stances}

        # Pobierz profil psychometryczny i segmenty
        prof_stmt = select(PsychometricProfile).where(PsychometricProfile.recording_id == recording_id)
        prof_res = await db.execute(prof_stmt)
        profile = prof_res.scalar_one_or_none()

        seg_stmt = select(Segment).where(Segment.recording_id == recording_id).order_by(Segment.start_ms)
        seg_res = await db.execute(seg_stmt)
        segments = seg_res.scalars().all()

        # Przygotuj próbkę tekstu badanego polityka
        transcript_sample = " ".join([s.tekst for s in segments[:30]]) if segments else ""
        if len(transcript_sample) > 4000:
            transcript_sample = transcript_sample[:4000]

        existing_stances_summary = [
            {"temat": s.temat, "stanowisko": s.stanowisko_opis, "polaryzacja": s.polaryzacja, "data": str(s.data_deklaracji)}
            for s in existing_stances
        ]

        # Monit do AI o ekstrakcję tez i wolt
        prompt = f"""Dokonaj wnikliwej analizy wypowiedzi polityka w kontekście jego DOTYCHCZASOWEJ BAZY WIEDZY:
POLITYK: {person.imie_nazwisko} ({person.partia or ''})
AUDYTOWANE NAGRANIE: {recording.tytul} (data: {recording.data_publikacji or recording.created_at})

DOTYCHCZASOWE STANOWISKA W BAZIE WIEDZY:
{json.dumps(existing_stances_summary, ensure_ascii=False, indent=2)}

FRAGMENTY WYPOWIEDZI Z NOWEGO NAGRANIA:
{transcript_sample}

WNIOSKI Z WYWIADU:
- Styl i uniki: {profile.glowne_uniki_i_taktyka if profile else ''}
- Spójność: {profile.spojnosc_mowy_ze_slowami if profile else ''}
- Czułe punkty: {json.dumps(profile.czule_punkty_i_leki if profile else [], ensure_ascii=False)}

Zadania:
1. Wyodrębnij konkretne tezy i deklaracje poglądowe (np. gospodarka, podatki, UE, inwestycje, sojusze).
2. Porównaj każdą tezę z dotychczasowymi stanowiskami w bazie. Jeśli polityk zmienił zdanie, złagodził kurs lub zaprzeczył wcześniejszej linii, oznacz to jako FLIP-FLOP (woltę).
3. Wyodrębnij nowe lub potwierdzone czułe punkty (tematy wywołujące zakłopotanie lub agresję).
4. Wyodrębnij charakterystyczne zwroty erystyczne (mostki, chwyty).

Zwróć JSON:
{{
  "nowe_stanowiska": [
    {{
      "temat": "Krótka nazwa tematu",
      "podtemat": "Konkretny aspekt",
      "stanowisko_opis": "Treść deklaracji w tym nagraniu",
      "polaryzacja": "popiera" | "sprzeciwia" | "neutralne" | "unika",
      "pewnosc_deklaracji": 0.9,
      "cytat_dowodowy": "Dosłowny cytat z wypowiedzi"
    }}
  ],
  "wykryte_wolty_flip_flops": [
    {{
      "temat": "Temat, w którym nastąpiła zmiana",
      "stopien_wolty": "drobna_korekta" | "znaczna" | "radykalny_zwrot",
      "opis_sprzecznosci": "Wyjaśnienie na czym polega sprzeczność",
      "stanowisko_wczesniejsze": "Jakie było wcześniej w bazie",
      "cytat_wczesniejszy": "Wcześniejszy cytat lub dowód",
      "stanowisko_pozniejsze": "Jakie jest w nowym nagraniu",
      "cytat_pozniejszy": "Aktualny cytat",
      "analiza_motywu": "Dlaczego prawdopodobnie zmienił narrację"
    }}
  ],
  "zidentyfikowane_czule_punkty": [
    {{
      "temat_trigger": "Temat",
      "napiecie_stresu": 80,
      "typowa_reakcja": "Opis reakcji",
      "cytat_lub_dowod": "Fragment wypowiedzi"
    }}
  ],
  "zauwazone_wzorce_retoryczne": [
    {{
      "typ_wzorca": "mostek_erystyczny" | "whataboutism" | "apel_do_ludu" | "frazes_wytrych",
      "nazwa_wzorca": "Fraza lub chwyt",
      "szablon_lub_cytat": "Cytat",
      "funkcja_manipulacyjna": "Funkcja"
    }}
  ]
}}"""

        ai_res = await self._call_gemini_json(prompt)
        created_stances_count = 0
        created_flip_flops_count = 0

        # Zapis nowych stanowisk
        for st in ai_res.get("nowe_stanowiska", []):
            temat = st.get("temat", "").strip()
            if not temat:
                continue
            
            existing = existing_stances_dict.get(temat.lower())
            if existing:
                # Jeśli to samo stanowisko, aktualizujemy świeżość
                existing.stanowisko_opis = st.get("stanowisko_opis", existing.stanowisko_opis)
                existing.polaryzacja = st.get("polaryzacja", existing.polaryzacja)
                existing.cytat_dowodowy = st.get("cytat_dowodowy", existing.cytat_dowodowy)
                existing.recording_id = recording_id
                existing.data_deklaracji = recording.data_publikacji or recording.created_at
            else:
                new_stance = PersonStance(
                    person_id=person_id,
                    recording_id=recording_id,
                    temat=temat[:255],
                    podtemat=st.get("podtemat", "")[:255] if st.get("podtemat") else None,
                    stanowisko_opis=st.get("stanowisko_opis", ""),
                    polaryzacja=st.get("polaryzacja", "neutralne"),
                    pewnosc_deklaracji=float(st.get("pewnosc_deklaracji", 0.85)),
                    cytat_dowodowy=st.get("cytat_dowodowy"),
                    zrodlo_typ="wywiad",
                    data_deklaracji=recording.data_publikacji or recording.created_at
                )
                db.add(new_stance)
                created_stances_count += 1

        # Zapis wykrytych wolt (flip-flops)
        for ff in ai_res.get("wykryte_wolty_flip_flops", []):
            temat = ff.get("temat", "").strip()
            if not temat:
                continue
            
            flip_flop = PersonFlipFlop(
                person_id=person_id,
                temat=temat[:255],
                stopien_wolty=ff.get("stopien_wolty", "znaczna"),
                opis_sprzecznosci=ff.get("opis_sprzecznosci", "Wykryto zmianę stanowiska w czasie"),
                stanowisko_wczesniejsze=ff.get("stanowisko_wczesniejsze", "Brak wcześniejszego opisu"),
                cytat_wczesniejszy=ff.get("cytat_wczesniejszy"),
                zrodlo_wczesniejsze="Poprzednie nagranie / Baza wiedzy",
                stanowisko_pozniejsze=ff.get("stanowisko_pozniejsze", ""),
                cytat_pozniejszy=ff.get("cytat_pozniejszy"),
                data_pozniejsza=recording.data_publikacji or recording.created_at,
                zrodlo_pozniejsze=recording.tytul,
                recording_id_b=recording_id,
                analiza_motywu=ff.get("analiza_motywu")
            )
            db.add(flip_flop)
            created_flip_flops_count += 1

        # Zapis czułych punktów
        for vuln in ai_res.get("zidentyfikowane_czule_punkty", []):
            t_trig = vuln.get("temat_trigger", "").strip()
            if not t_trig:
                continue

            v_stmt = select(PersonVulnerability).where(
                PersonVulnerability.person_id == person_id,
                PersonVulnerability.temat_trigger == t_trig
            )
            v_res = await db.execute(v_stmt)
            existing_v = v_res.scalar_one_or_none()

            stress_val = int(vuln.get("napiecie_stresu", 70))
            if existing_v:
                existing_v.liczba_odnotowan += 1
                existing_v.srednie_napiecie_stresu = int((existing_v.srednie_napiecie_stresu + stress_val) / 2)
                existing_v.ostatnie_zalamanie_data = recording.data_publikacji or recording.created_at
                cur_examples = list(existing_v.przyklady_cytatow or [])
                cur_examples.append({
                    "recording_id": recording_id,
                    "tytul": recording.tytul,
                    "cytat": vuln.get("cytat_lub_dowod"),
                    "opis_reakcji": vuln.get("typowa_reakcja")
                })
                existing_v.przyklady_cytatow = cur_examples[-5:] # trzymaj ostatnie 5
            else:
                new_v = PersonVulnerability(
                    person_id=person_id,
                    temat_trigger=t_trig[:255],
                    srednie_napiecie_stresu=stress_val,
                    typowa_reakcja_obronna=vuln.get("typowa_reakcja", "Stres i defensywa")[:255],
                    liczba_odnotowan=1,
                    ostatnie_zalamanie_data=recording.data_publikacji or recording.created_at,
                    przyklady_cytatow=[{
                        "recording_id": recording_id,
                        "tytul": recording.tytul,
                        "cytat": vuln.get("cytat_lub_dowod"),
                        "opis_reakcji": vuln.get("typowa_reakcja")
                    }]
                )
                db.add(new_v)

        # Zapis nawyków retorycznych
        for rp in ai_res.get("zauwazone_wzorce_retoryczne", []):
            nazwa = rp.get("nazwa_wzorca", "").strip()
            if not nazwa:
                continue

            rp_stmt = select(PersonRhetoricalPattern).where(
                PersonRhetoricalPattern.person_id == person_id,
                PersonRhetoricalPattern.nazwa_wzorca == nazwa
            )
            rp_res = await db.execute(rp_stmt)
            existing_rp = rp_res.scalar_one_or_none()

            if existing_rp:
                existing_rp.czestotliwosc_uzycia += 1
                cur_ex = list(existing_rp.przyklady or [])
                cur_ex.append({"recording_id": recording_id, "cytat": rp.get("szablon_lub_cytat")})
                existing_rp.przyklady = cur_ex[-5:]
            else:
                new_rp = PersonRhetoricalPattern(
                    person_id=person_id,
                    typ_wzorca=rp.get("typ_wzorca", "mostek_erystyczny")[:100],
                    nazwa_wzorca=nazwa[:255],
                    szablon_lub_cytat=rp.get("szablon_lub_cytat", nazwa),
                    funkcja_manipulacyjna=rp.get("funkcja_manipulacyjna"),
                    czestotliwosc_uzycia=1,
                    przyklady=[{"recording_id": recording_id, "cytat": rp.get("szablon_lub_cytat")}]
                )
                db.add(new_rp)

        # Aktualizacja linii bazowej (PersonBaseline)
        b_stmt = select(PersonBaseline).where(PersonBaseline.person_id == person_id)
        b_res = await db.execute(b_stmt)
        baseline = b_res.scalar_one_or_none()
        if not baseline:
            baseline = PersonBaseline(
                person_id=person_id,
                srednie_tempo_wpm=135.0,
                srednie_f0_hz=160.0,
                typowy_udzial_pauz=0.20,
                proba_nagran=1
            )
            db.add(baseline)
        else:
            baseline.proba_nagran = (baseline.proba_nagran or 0) + 1
            baseline.updated_at = datetime.utcnow()

        await db.commit()
        logger.info(
            f"Zakończono asymilację nagrania {recording_id}: dodano {created_stances_count} stanowisk, "
            f"{created_flip_flops_count} wolt do profilu {person.imie_nazwisko}."
        )

        return {
            "status": "sukces",
            "nowe_stanowiska_count": created_stances_count,
            "wolty_count": created_flip_flops_count,
            "proba_nagran": baseline.proba_nagran
        }

    async def get_person_dossier(self, db: AsyncSession, person_id: str) -> Dict[str, Any]:
        """
        Zwraca pełny, ustrukturyzowany dossier poznawczo-retoryczny polityka:
        - Profil i linia bazowa
        - Matryca poglądów
        - Oś czasu wolt i sprzeczności (Flip-Flops)
        - Czułe punkty i podatności stresowe
        - Wzorce erystyczne i mostki
        - Zweryfikowane fakty z sieci
        - Statystyki i historia nagrań
        """
        stmt = select(Person).where(Person.id == person_id)
        res = await db.execute(stmt)
        person = res.scalar_one_or_none()
        if not person:
            return {}

        # Pobierz bazę
        b_stmt = select(PersonBaseline).where(PersonBaseline.person_id == person_id)
        b_res = await db.execute(b_stmt)
        baseline = b_res.scalar_one_or_none()

        # Pobierz stanowiska
        st_stmt = select(PersonStance).where(PersonStance.person_id == person_id).order_by(desc(PersonStance.data_deklaracji))
        st_res = await db.execute(st_stmt)
        stances = st_res.scalars().all()

        # Pobierz wolty
        ff_stmt = select(PersonFlipFlop).where(PersonFlipFlop.person_id == person_id).order_by(desc(PersonFlipFlop.created_at))
        ff_res = await db.execute(ff_stmt)
        flip_flops = ff_res.scalars().all()

        # Pobierz czułe punkty
        vuln_stmt = select(PersonVulnerability).where(PersonVulnerability.person_id == person_id).order_by(desc(PersonVulnerability.srednie_napiecie_stresu))
        vuln_res = await db.execute(vuln_stmt)
        vulnerabilities = vuln_res.scalars().all()

        # Pobierz wzorce retoryczne
        rp_stmt = select(PersonRhetoricalPattern).where(PersonRhetoricalPattern.person_id == person_id).order_by(desc(PersonRhetoricalPattern.czestotliwosc_uzycia))
        rp_res = await db.execute(rp_stmt)
        patterns = rp_res.scalars().all()

        # Pobierz fakty zewnętrzne
        fact_stmt = select(PersonExternalFact).where(PersonExternalFact.person_id == person_id).order_by(desc(PersonExternalFact.data_weryfikacji))
        fact_res = await db.execute(fact_stmt)
        facts = fact_res.scalars().all()

        # Powiązane nagrania
        rec_stmt = select(Recording).where(
            (Recording.polityk_docelowy == person.imie_nazwisko) |
            (Recording.id.in_(select(Segment.recording_id).where(Segment.person_id == person_id)))
        ).order_by(desc(Recording.created_at)).limit(20)
        rec_res = await db.execute(rec_stmt)
        recordings = rec_res.scalars().all()

        return {
            "person": {
                "id": person.id,
                "imie_nazwisko": person.imie_nazwisko,
                "funkcja": person.funkcja,
                "partia": person.partia,
                "aliasy": person.aliasy or [],
                "uwagi": person.uwagi,
                "created_at": person.created_at.isoformat() if person.created_at else None
            },
            "baseline": {
                "srednie_tempo_wpm": baseline.srednie_tempo_wpm if baseline else 135.0,
                "srednie_f0_hz": baseline.srednie_f0_hz if baseline else 160.0,
                "typowy_udzial_pauz": baseline.typowy_udzial_pauz if baseline else 0.20,
                "czeste_techniki": baseline.czeste_techniki if baseline else [],
                "tematy_unikane": baseline.tematy_unikane if baseline else [],
                "proba_nagran": baseline.proba_nagran if baseline else len(recordings),
                "updated_at": baseline.updated_at.isoformat() if baseline and baseline.updated_at else None
            },
            "stances": [
                {
                    "id": s.id,
                    "temat": s.temat,
                    "podtemat": s.podtemat,
                    "stanowisko_opis": s.stanowisko_opis,
                    "polaryzacja": s.polaryzacja,
                    "pewnosc_deklaracji": s.pewnosc_deklaracji,
                    "cytat_dowodowy": s.cytat_dowodowy,
                    "zrodlo_typ": s.zrodlo_typ,
                    "data_deklaracji": s.data_deklaracji.isoformat() if s.data_deklaracji else None
                }
                for s in stances
            ],
            "flip_flops": [
                {
                    "id": ff.id,
                    "temat": ff.temat,
                    "stopien_wolty": ff.stopien_wolty,
                    "opis_sprzecznosci": ff.opis_sprzecznosci,
                    "stanowisko_wczesniejsze": ff.stanowisko_wczesniejsze,
                    "cytat_wczesniejszy": ff.cytat_wczesniejszy,
                    "zrodlo_wczesniejsze": ff.zrodlo_wczesniejsze,
                    "stanowisko_pozniejsze": ff.stanowisko_pozniejsze,
                    "cytat_pozniejszy": ff.cytat_pozniejszy,
                    "zrodlo_pozniejsze": ff.zrodlo_pozniejsze,
                    "analiza_motywu": ff.analiza_motywu,
                    "created_at": ff.created_at.isoformat() if ff.created_at else None
                }
                for ff in flip_flops
            ],
            "vulnerabilities": [
                {
                    "id": v.id,
                    "temat_trigger": v.temat_trigger,
                    "srednie_napiecie_stresu": v.srednie_napiecie_stresu,
                    "typowa_reakcja_obronna": v.typowa_reakcja_obronna,
                    "liczba_odnotowan": v.liczba_odnotowan,
                    "przyklady": v.przyklady_cytatow or [],
                    "ostatnie_zalamanie_data": v.ostatnie_zalamanie_data.isoformat() if v.ostatnie_zalamanie_data else None
                }
                for v in vulnerabilities
            ],
            "rhetorical_patterns": [
                {
                    "id": rp.id,
                    "typ_wzorca": rp.typ_wzorca,
                    "nazwa_wzorca": rp.nazwa_wzorca,
                    "szablon_lub_cytat": rp.szablon_lub_cytat,
                    "funkcja_manipulacyjna": rp.funkcja_manipulacyjna,
                    "czestotliwosc_uzycia": rp.czestotliwosc_uzycia,
                    "przyklady": rp.przyklady or []
                }
                for rp in patterns
            ],
            "external_facts": [
                {
                    "id": f.id,
                    "temat": f.temat,
                    "twierdzenie_polityka": f.twierdzenie_polityka,
                    "werdykt_weryfikacji": f.werdykt_weryfikacji,
                    "fakty_ustalone": f.fakty_ustalone,
                    "zrodlo_nazwa": f.zrodlo_nazwa,
                    "zrodlo_url": f.zrodlo_url,
                    "data_weryfikacji": f.data_weryfikacji.isoformat() if f.data_weryfikacji else None
                }
                for f in facts
            ],
            "recordings": [
                {
                    "id": r.id,
                    "tytul": r.tytul,
                    "status": r.status_przetwarzania,
                    "data": r.created_at.isoformat() if r.created_at else None
                }
                for r in recordings
            ],
            "stats": {
                "total_stances": len(stances),
                "total_flip_flops": len(flip_flops),
                "total_vulnerabilities": len(vulnerabilities),
                "total_patterns": len(patterns),
                "total_recordings": len(recordings)
            }
        }

knowledge_base_service = KnowledgeBaseService()
