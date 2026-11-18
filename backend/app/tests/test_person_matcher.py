import pytest
from sqlalchemy import delete
from app.db.models import Person
from app.db.database import init_db, AsyncSessionLocal
from app.services.person_matcher import person_matcher, calculate_similarity, clean_and_tokenize, stem_polish_surname

@pytest.mark.asyncio
async def test_person_matcher_szlapka_variations():
    await init_db()
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Person))
        await session.commit()

        # Krok 1: Dodanie pełnego nazwiska "Adam Szłapka"
        p1, created1, score1 = await person_matcher.find_or_resolve_person(
            session, "Adam Szłapka", party="Koalicja Obywatelska", role="Minister ds. UE"
        )
        assert created1 is True
        assert p1.imie_nazwisko == "Adam Szłapka"
        canonical_id = p1.id

        # Krok 2: Użytkownik wpisuje tylko nazwisko "Szłapka"
        p2, created2, score2 = await person_matcher.find_or_resolve_person(
            session, "Szłapka"
        )
        assert created2 is False
        assert p2.id == canonical_id
        assert score2 >= 0.90

        # Krok 3: Użytkownik wpisuje z literówką "Szłpka" (brak 'a')
        p3, created3, score3 = await person_matcher.find_or_resolve_person(
            session, "Szłpka"
        )
        assert created3 is False
        assert p3.id == canonical_id
        assert "Szłpka" in p3.aliasy

        # Krok 4: Użytkownik wpisuje formę fleksyjną z tytułem "minister Szłapka" / "ministra Szłapki"
        p4, created4, score4 = await person_matcher.find_or_resolve_person(
            session, "minister Szłapka"
        )
        assert created4 is False
        assert p4.id == canonical_id

        p5, created5, score5 = await person_matcher.find_or_resolve_person(
            session, "ministra Szłapki"
        )
        assert created5 is False
        assert p5.id == canonical_id

@pytest.mark.asyncio
async def test_person_matcher_reverse_upgrade():
    """
    Testuje odwrotny przypadek:
    1. Najpierw wpisano tylko "Kosiniak" (samo nazwisko).
    2. Potem wpisano pełne "Władysław Kosiniak-Kamysz".
    3. System podnosi nazwę kanoniczną do pełnej i zachowuje jedną pamięć.
    """
    await init_db()
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Person))
        await session.commit()
        p_short, created, _ = await person_matcher.find_or_resolve_person(session, "Kosiniak")
        assert created is True
        kosiniak_id = p_short.id

        # Następnie ktoś podaje pełne nazwisko
        p_full, created_full, _ = await person_matcher.find_or_resolve_person(session, "Władysław Kosiniak")
        assert created_full is False
        assert p_full.id == kosiniak_id
        assert p_full.imie_nazwisko == "Władysław Kosiniak"
        assert "Kosiniak" in p_full.aliasy

@pytest.mark.asyncio
async def test_person_matcher_diacritics_and_transposition():
    await init_db()
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Person))
        await session.commit()
        # Utwórz Jarosław Kaczyński
        pk, _, _ = await person_matcher.find_or_resolve_person(session, "Jarosław Kaczyński")
        kaczynski_id = pk.id

        # Zapytanie bez polskich znaków 'Kaczynski'
        pk_ascii, created_ascii, score_ascii = await person_matcher.find_or_resolve_person(session, "Kaczynski")
        assert created_ascii is False
        assert pk_ascii.id == kaczynski_id

        # Zapytanie w dopełniaczu 'Kaczyńskiego'
        pk_gen, created_gen, score_gen = await person_matcher.find_or_resolve_person(session, "Kaczyńskiego")
        assert created_gen is False
        assert pk_gen.id == kaczynski_id
