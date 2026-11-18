import re
import unicodedata
from difflib import SequenceMatcher
from typing import List, Optional, Tuple, Set
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Person

logger = logging.getLogger("profiler.person_matcher")

# Tytuły i formy grzecznościowe do usunięcia przed porównaniem
HONORIFICS = {
    "pan", "pani", "pana", "panią", "panu",
    "poseł", "posłanka", "posła", "posłankę", "posłowie",
    "minister", "ministra", "ministrowie", "ministrem",
    "premier", "premiera", "premierem", "wicepremier", "wicepremiera",
    "marszałek", "marszałka", "marszałkini",
    "senator", "senatora", "senatorka",
    "prezydent", "prezydenta", "prezydentem",
    "profesor", "prof", "prof.",
    "doktor", "dr", "dr.",
    "mecenas", "mec", "mec.",
    "redaktor", "red", "red."
}

def strip_accents(text: str) -> str:
    """Zamienia polskie znaki na litery łacińskie (np. ł -> l, ą -> a, ś -> s)."""
    # Specjalne traktowanie 'ł' i 'Ł', których NFD nie rozbija automatycznie
    text = text.replace('ł', 'l').replace('Ł', 'L')
    nfkd = unicodedata.normalize('NFKD', text)
    return "".join([c for c in nfkd if not unicodedata.combining(c)])

def clean_and_tokenize(name: str) -> List[str]:
    """Czyści tekst, usuwa tytuły honorowe i zwraca listę czystych tokenów."""
    if not name:
        return []
    
    # Zamiana znaków interpunkcyjnych na spacje
    normalized = re.sub(r"[^\w\s]", " ", name.lower(), flags=re.UNICODE)
    tokens = [t.strip() for t in normalized.split() if t.strip()]
    
    # Usuń tytuły honorowe
    filtered = [t for t in tokens if t not in HONORIFICS]
    return filtered or tokens

def stem_polish_surname(token: str) -> str:
    """
    Upraszcza polskie końcówki fleksyjne nazwiska (lematyzacja rdzenia),
    np. Szłapce -> szłapk, Tuskowi -> tusk, Kaczyńskiego -> kaczynsk.
    """
    token = token.lower()
    if len(token) <= 3:
        return token
        
    # Końcówki przymiotnikowe (-ski, -ska, -skiego, -skiemu, etc.)
    for ending in ["skiego", "skiemu", "skich", "skimi", "skim", "ska", "ski", "skie"]:
        if token.endswith(ending) and len(token) > len(ending) + 2:
            return token[:-len(ending)] + "sk"

    for ending in ["czego", "czemu", "czych", "czymi", "czym", "cza", "czy"]:
        if token.endswith(ending) and len(token) > len(ending) + 2:
            return token[:-len(ending)] + "cz"

    # Końcówki rzeczownikowe
    for ending in ["owi", "iem", "ego", "emu", "ach", "ami", "om", "em", "ce", "ie", "kę", "ką", "ka", "ki", "ku", "k", "a", "e", "y", "i", "ę", "ą", "u"]:
        if token.endswith(ending) and len(token) > len(ending) + 3:
            return token[:-len(ending)]

    return token

def calculate_similarity(s1: str, s2: str) -> float:
    """Oblicza podobieństwo znakowe uwzględniając literówki, brakujące znaki i akcenty."""
    s1_low = s1.lower().strip()
    s2_low = s2.lower().strip()
    if s1_low == s2_low:
        return 1.0

    # Porównanie bez polskich znaków
    s1_ascii = strip_accents(s1_low)
    s2_ascii = strip_accents(s2_low)
    if s1_ascii == s2_ascii:
        return 0.98

    # Standardowa metryka SequenceMatcher
    ratio_raw = SequenceMatcher(None, s1_low, s2_low).ratio()
    ratio_ascii = SequenceMatcher(None, s1_ascii, s2_ascii).ratio()

    # Damerau-Levenshtein transposition check (np. Tsuk vs Tusk)
    if len(s1_low) == len(s2_low) and sorted(s1_low) == sorted(s2_low) and len(s1_low) >= 4:
        # literówka przestawna
        return max(ratio_raw, ratio_ascii, 0.88)

    return max(ratio_raw, ratio_ascii)

class PersonMatcher:
    """Silnik Entity Resolution gwarantujący jedną wspólną tożsamość polityka."""

    @staticmethod
    async def find_or_resolve_person(
        db: AsyncSession,
        input_name: str,
        create_if_missing: bool = True,
        party: Optional[str] = None,
        role: Optional[str] = None
    ) -> Tuple[Optional[Person], bool, float]:
        """
        Główna metoda rezolucji osoby.
        Zwraca: (Person, czy_utworzono_nowa, pewnosc_dopasowania [0.0 - 1.0])
        """
        clean_input = input_name.strip()
        if not clean_input:
            return (None, False, 0.0)

        input_tokens = clean_and_tokenize(clean_input)
        if not input_tokens:
            return (None, False, 0.0)

        # Pobierz wszystkie istniejące osoby z bazy
        stmt = select(Person)
        res = await db.execute(stmt)
        persons = res.scalars().all()

        best_match: Optional[Person] = None
        best_score: float = 0.0
        match_reason: str = ""

        # Główny token nazwiska wejściowego (ostatni token, np. 'Szłapka' z 'Adam Szłapka' lub jedyny token 'Szłapka')
        input_surname = input_tokens[-1]
        input_surname_stem = stem_polish_surname(input_surname)
        input_joined = " ".join(input_tokens)

        for p in persons:
            # 1. Sprawdź exact match na imie_nazwisko lub aliasy
            known_variants: Set[str] = {p.imie_nazwisko.lower()}
            if p.aliasy and isinstance(p.aliasy, list):
                for a in p.aliasy:
                    if isinstance(a, str):
                        known_variants.add(a.lower())

            for variant in known_variants:
                v_tokens = clean_and_tokenize(variant)
                v_joined = " ".join(v_tokens)

                if input_joined == v_joined:
                    best_match = p
                    best_score = 1.0
                    match_reason = "exact_match"
                    break

            if best_score == 1.0:
                break

            # 2. Analiza tokenów osoby z bazy
            p_tokens = clean_and_tokenize(p.imie_nazwisko)
            if not p_tokens:
                continue

            p_surname = p_tokens[-1]
            p_surname_stem = stem_polish_surname(p_surname)

            # Przypadek A: Użytkownik wpisał samo nazwisko ("Szłapka"), a w bazie jest "Adam Szłapka"
            # LUB w bazie jest "Szłapka", a wpisano "Adam Szłapka"
            if len(input_tokens) == 1 and (input_surname == p_surname or input_surname_stem == p_surname_stem):
                score = 0.95
                if score > best_score:
                    best_match = p
                    best_score = score
                    match_reason = "single_surname_match"
                    continue

            if len(p_tokens) == 1 and (input_surname == p_surname or input_surname_stem == p_surname_stem):
                score = 0.95
                if score > best_score:
                    best_match = p
                    best_score = score
                    match_reason = "upgrade_surname_to_fullname"
                    continue

            # Przypadek B: Dopasowanie z literówką w nazwisku (np. "Szłpka" vs "Szłapka" lub "Kaczynski" vs "Kaczyński")
            surname_sim = calculate_similarity(input_surname, p_surname)
            stem_sim = calculate_similarity(input_surname_stem, p_surname_stem)
            effective_surname_sim = max(surname_sim, stem_sim)

            # Jeśli nazwiska są bardzo bliskie (>= 0.82)
            if effective_surname_sim >= 0.82:
                # Jeśli są też imiona:
                if len(input_tokens) >= 2 and len(p_tokens) >= 2:
                    input_first = input_tokens[0]
                    p_first = p_tokens[0]
                    first_sim = calculate_similarity(input_first, p_first)
                    total_sim = 0.65 * effective_surname_sim + 0.35 * first_sim
                else:
                    total_sim = effective_surname_sim

                if total_sim > best_score:
                    best_score = total_sim
                    best_match = p
                    match_reason = f"fuzzy_match (sim={total_sim:.2f})"

        # Próg akceptacji dopasowania tożsamości
        MATCH_THRESHOLD = 0.78

        if best_match and best_score >= MATCH_THRESHOLD:
            logger.info(
                f"Zmatchowano '{clean_input}' do istniejącego polityka: '{best_match.imie_nazwisko}' "
                f"(pewność: {best_score:.2f}, powód: {match_reason})"
            )

            # Samouczące się wzbogacenie aliasów (Continuous Alias Enrichment):
            # Jeśli wpisana fraza to literówka lub wariant, zapamiętaj ją w aliasach
            cur_aliases = list(best_match.aliasy or [])
            if clean_input.lower() != best_match.imie_nazwisko.lower() and clean_input not in cur_aliases:
                cur_aliases.append(clean_input)
                best_match.aliasy = cur_aliases
                logger.info(f"Dopisano nowy alias '{clean_input}' do polityka '{best_match.imie_nazwisko}'")

            # Jeśli w bazie było tylko samo nazwisko (np. 'Szłapka'), a użytkownik wpisał pełne 'Adam Szłapka',
            # uaktualniamy nazwę kanoniczną na pełną:
            if len(clean_and_tokenize(best_match.imie_nazwisko)) == 1 and len(input_tokens) >= 2:
                old_name = best_match.imie_nazwisko
                best_match.imie_nazwisko = clean_input
                if old_name not in cur_aliases:
                    cur_aliases.append(old_name)
                    best_match.aliasy = cur_aliases
                logger.info(f"Podniesiono kanoniczną nazwę polityka z '{old_name}' na '{clean_input}'")

            if party and not best_match.partia:
                best_match.partia = party
            if role and not best_match.funkcja:
                best_match.funkcja = role

            await db.commit()
            return (best_match, False, best_score)

        # Brak dopasowania do istniejących
        if create_if_missing:
            logger.info(f"Brak dopasowania dla '{clean_input}'. Tworzenie nowego rekordu Person.")
            new_person = Person(
                imie_nazwisko=clean_input,
                partia=party,
                funkcja=role,
                aliasy=[]
            )
            db.add(new_person)
            await db.commit()
            await db.refresh(new_person)
            return (new_person, True, 1.0)

        return (None, False, 0.0)

person_matcher = PersonMatcher()
