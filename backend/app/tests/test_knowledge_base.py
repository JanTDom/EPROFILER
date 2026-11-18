import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from datetime import datetime

from app.main import app
from app.db.database import init_db, AsyncSessionLocal
from app.db.models import (
    Person,
    PersonStance,
    PersonFlipFlop,
    PersonVulnerability,
    PersonRhetoricalPattern,
    PersonExternalFact,
    Recording,
    PsychometricProfile,
    Segment
)
from app.services.knowledge_base_service import knowledge_base_service

@pytest.mark.asyncio
async def test_knowledge_base_models_crud():
    await init_db()
    async with AsyncSessionLocal() as session:
        # Utwórz osobę
        person = Person(
            imie_nazwisko="Szymon Testowy",
            funkcja="Marszałek Sejmu",
            partia="Polska 2050"
        )
        session.add(person)
        await session.commit()
        await session.refresh(person)

        # 1. Dodaj Stance
        stance = PersonStance(
            person_id=person.id,
            temat="Transformacja Energetyczna",
            podtemat="Atom",
            stanowisko_opis="Popiera budowę elektrowni atomowych w formule partnerstwa strategicznego",
            polaryzacja="popiera",
            pewnosc_deklaracji=0.95,
            cytat_dowodowy="Nie ma innej drogi niż atom.",
            zrodlo_typ="wywiad"
        )
        session.add(stance)

        # 2. Dodaj FlipFlop
        ff = PersonFlipFlop(
            person_id=person.id,
            temat="Podatki",
            stopien_wolty="znaczna",
            opis_sprzecznosci="Zmiana stanowiska w sprawie składki zdrowotnej",
            stanowisko_wczesniejsze="Sprzeciw wobec jakichkolwiek ulg dla przedsiębiorców",
            stanowisko_pozniejsze="Konieczność obniżenia składki dla małych firm"
        )
        session.add(ff)

        # 3. Dodaj Vulnerability
        vuln = PersonVulnerability(
            person_id=person.id,
            temat_trigger="Finansowanie partii",
            srednie_napiecie_stresu=85,
            typowa_reakcja_obronna="Nerwowy uśmiech i kontratak na pytającego",
            liczba_odnotowan=2
        )
        session.add(vuln)

        # 4. Dodaj Rhetorical Pattern
        rp = PersonRhetoricalPattern(
            person_id=person.id,
            typ_wzorca="mostek_erystyczny",
            nazwa_wzorca="Polacy oczekują prawdy",
            szablon_lub_cytat="Panie redaktorze, Polacy nie chcą kłótni...",
            czestotliwosc_uzycia=3
        )
        session.add(rp)

        # 5. Dodaj External Fact
        ef = PersonExternalFact(
            person_id=person.id,
            temat="Głosowanie nad ustawą X",
            twierdzenie_polityka="Zawsze byłem przeciw tej ustawie",
            werdykt_weryfikacji="falsz",
            fakty_ustalone="W głosowaniu nr 42 w 2023 r. głosował ZA ustawą",
            zrodlo_nazwa="Baza głosowań Sejmu RP"
        )
        session.add(ef)

        await session.commit()

        # Pobierz dossier przez serwis
        dossier = await knowledge_base_service.get_person_dossier(session, person.id)
        assert dossier["person"]["imie_nazwisko"] == "Szymon Testowy"
        assert len(dossier["stances"]) == 1
        assert dossier["stances"][0]["temat"] == "Transformacja Energetyczna"
        assert len(dossier["flip_flops"]) == 1
        assert dossier["flip_flops"][0]["temat"] == "Podatki"
        assert len(dossier["vulnerabilities"]) == 1
        assert dossier["vulnerabilities"][0]["srednie_napiecie_stresu"] == 85
        assert len(dossier["rhetorical_patterns"]) == 1
        assert len(dossier["external_facts"]) == 1
        assert dossier["stats"]["total_stances"] == 1
        assert dossier["stats"]["total_flip_flops"] == 1

@pytest.mark.asyncio
async def test_person_dossier_api_endpoint():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Utwórz osobę
        p_res = await ac.post("/api/persons", json={
            "imie_nazwisko": "Władysław Profilowany",
            "funkcja": "Wicepremier",
            "partia": "PSL"
        })
        assert p_res.status_code == 201
        p_id = p_res.json()["id"]

        # Pobierz dossier przez API
        d_res = await ac.get(f"/api/persons/{p_id}/dossier")
        assert d_res.status_code == 200
        data = d_res.json()
        assert data["person"]["imie_nazwisko"] == "Władysław Profilowany"
        assert "stances" in data
        assert "flip_flops" in data
        assert "vulnerabilities" in data
        assert "baseline" in data

@pytest.mark.asyncio
async def test_ingest_recording_to_dossier_flow():
    await init_db()
    async with AsyncSessionLocal() as session:
        # 1. Utwórz osobę
        person = Person(imie_nazwisko="Rafał Doświadczalny", partia="PO")
        session.add(person)
        await session.commit()
        await session.refresh(person)

        # 2. Utwórz nagranie ze statusem ZAKONCZONE
        rec = Recording(
            zrodlo_typ="plik",
            tytul="Wywiad o CPK i transporcie",
            polityk_docelowy="Rafał Doświadczalny",
            status_przetwarzania="ZAKONCZONE"
        )
        session.add(rec)
        await session.commit()
        await session.refresh(rec)

        # Dodaj segment i profil
        seg = Segment(
            recording_id=rec.id,
            start_ms=0,
            end_ms=5000,
            tekst="Inwestycje centralne muszą być zrewidowane, ale lotnisko w Baranowie powstanie."
        )
        prof = PsychometricProfile(
            recording_id=rec.id,
            nastroj_glowny_prosty="Pewny siebie",
            styl_komunikacji_prosty="Konkretny z elementami obrony",
            czule_punkty_i_leki=["Finansowanie samorządów", "Opóźnienia inwestycji"],
            glowne_uniki_i_taktyka="Przechodzenie do ataku na poprzedników",
            spojnosc_mowy_ze_slowami="Wysoka zbieżność mowy ciała",
            skutecznosc_argumentacji="Dobre operowanie danymi",
            perswazyjnosc_odbiorcow="Przekonujący dla własnego elektoratu",
            radzenie_z_adwersarzami="Kontrola narracji"
        )
        session.add(seg)
        session.add(prof)
        await session.commit()

        # Mock wywołania AI w knowledge_base_service
        mock_ai_output = {
            "nowe_stanowiska": [
                {
                    "temat": "CPK",
                    "podtemat": "Budowa lotniska",
                    "stanowisko_opis": "Poparcie dla budowy lotniska w zmodyfikowanym formacie",
                    "polaryzacja": "popiera",
                    "pewnosc_deklaracji": 0.90,
                    "cytat_dowodowy": "Lotnisko w Baranowie powstanie."
                }
            ],
            "wykryte_wolty_flip_flops": [
                {
                    "temat": "CPK",
                    "stopien_wolty": "znaczna",
                    "opis_sprzecznosci": "Przejście z kategorycznego sprzeciwu do umiarkowanego poparcia",
                    "stanowisko_wczesniejsze": "Projekt do natychmiastowego zamknięcia",
                    "stanowisko_pozniejsze": "Lotnisko powstanie w nowym formacie",
                    "analiza_motywu": "Presja opinii publicznej i poparcie społeczne dla inwestycji"
                }
            ],
            "zidentyfikowane_czule_punkty": [
                {
                    "temat_trigger": "Finansowanie samorządów",
                    "napiecie_stresu": 80,
                    "typowa_reakcja": "Zirytowanie i unikanie konkretów",
                    "cytat_lub_dowod": "To poprzednicy zabrali samorządom miliardy"
                }
            ],
            "zauwazone_wzorce_retoryczne": [
                {
                    "typ_wzorca": "whataboutism",
                    "nazwa_wzorca": "Wina poprzedników",
                    "szablon_lub_cytat": "To poprzednicy zabrali samorządom miliardy",
                    "funkcja_manipulacyjna": "Przerzucenie winy"
                }
            ]
        }

        with patch.object(knowledge_base_service, "_call_gemini_json", new_callable=AsyncMock, return_value=mock_ai_output):
            res = await knowledge_base_service.ingest_recording_to_dossier(session, rec.id, person.id)
            assert res["status"] == "sukces"
            assert res["nowe_stanowiska_count"] == 1
            assert res["wolty_count"] == 1

            # Sprawdź stan w bazie
            dossier = await knowledge_base_service.get_person_dossier(session, person.id)
            assert len(dossier["stances"]) == 1
            assert dossier["stances"][0]["temat"] == "CPK"
            assert len(dossier["flip_flops"]) == 1
            assert dossier["flip_flops"][0]["stopien_wolty"] == "znaczna"
            assert len(dossier["vulnerabilities"]) == 1
            assert dossier["vulnerabilities"][0]["temat_trigger"] == "Finansowanie samorządów"
            assert len(dossier["rhetorical_patterns"]) == 1
