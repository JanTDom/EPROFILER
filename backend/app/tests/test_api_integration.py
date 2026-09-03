import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.database import init_db

@pytest.mark.asyncio
async def test_healthcheck():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "DYSKURS"

@pytest.mark.asyncio
async def test_recordings_crud_flow():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Pobierz listę (może być pusta lub zawierać wcześniejsze)
        list_res = await ac.get("/api/recordings")
        assert list_res.status_code == 200
        assert isinstance(list_res.json(), list)

        # 2. Utwórz nowe nagranie z URL
        create_payload = {
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "tytul": "Testowy Wywiad z Politykiem",
            "typ_nagrania": "wywiad",
            "data_publikacji": "2026-09-04T12:00:00"
        }
        post_res = await ac.post("/api/recordings/url", json=create_payload)
        assert post_res.status_code == 201
        created = post_res.json()
        rec_id = created["id"]
        assert created["tytul"] == "Testowy Wywiad z Politykiem"
        assert created["typ_nagrania"] == "wywiad"
        assert created["status_przetwarzania"] in {"POBIERANIE", "PRZETWARZANIE", "OCZEKUJE", "GOTOWE_DO_TRANSKRYPCJI", "BLAD"}

        # 3. Pobierz szczegóły utworzonego nagrania
        get_res = await ac.get(f"/api/recordings/{rec_id}")
        assert get_res.status_code == 200
        detail = get_res.json()
        assert detail["id"] == rec_id
        assert detail["tytul"] == "Testowy Wywiad z Politykiem"

@pytest.mark.asyncio
async def test_persons_crud():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Utwórz osobę publiczną
        person_data = {
            "imie_nazwisko": "Jan Kowalski",
            "funkcja": "Poseł na Sejm RP",
            "partia": "Koalicja Obywatelska",
            "aliasy": ["Kowalski", "Poseł Kowalski"],
            "uwagi": "Częsty uczestnik debat telewizyjnych"
        }
        res = await ac.post("/api/persons", json=person_data)
        assert res.status_code == 201
        created = res.json()
        person_id = created["id"]
        assert created["imie_nazwisko"] == "Jan Kowalski"

        # Pobierz osobę
        get_res = await ac.get(f"/api/persons/{person_id}")
        assert get_res.status_code == 200
        assert get_res.json()["funkcja"] == "Poseł na Sejm RP"
