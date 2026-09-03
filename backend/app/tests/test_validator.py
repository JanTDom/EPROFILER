import pytest
from app.services.validator import (
    validate_marker_or_raise,
    ValidationError,
    EvasionAnalysisOutput,
    RhetoricAnalysisOutput,
    RhetoricalTechniqueItem
)

def test_valid_marker_passes():
    valid_data = {
        "recording_id": "rec-123",
        "start_ms": 14500,
        "typ": "unik",
        "etykieta": "Pivot tematyczny",
        "opis": "Sygnały spójne z unikaniem odpowiedzi na pytanie o koszty.",
        "pewnosc": 0.85,
        "cytat_dowodowy": "Zanim odpowiem na to pytanie, spójrzmy na bilans poprzedników.",
        "przeslanki": ["Brak odniesienia do kwot", "Przesunięcie ramy na opozycję"]
    }
    validated = validate_marker_or_raise(valid_data)
    assert validated.pewnosc == 0.85
    assert validated.start_ms == 14500
    assert "poprzedników" in validated.cytat_dowodowy

def test_marker_without_evidence_rejected():
    invalid_data = {
        "recording_id": "rec-123",
        "start_ms": 14500,
        "typ": "unik",
        "etykieta": "Pivot",
        "opis": "Uniknął odpowiedzi.",
        "pewnosc": 0.85,
        "cytat_dowodowy": "   ", # Pusty cytat
        "przeslanki": []
    }
    with pytest.raises(ValidationError):
        validate_marker_or_raise(invalid_data)

def test_marker_confidence_out_of_bounds_rejected():
    invalid_data = {
        "recording_id": "rec-123",
        "start_ms": 100,
        "typ": "unik",
        "etykieta": "Pivot",
        "opis": "Unik.",
        "pewnosc": 1.5, # > 1.0
        "cytat_dowodowy": "Cytat",
    }
    with pytest.raises(ValidationError):
        validate_marker_or_raise(invalid_data)

def test_marker_absolute_lie_claim_rejected():
    invalid_data = {
        "recording_id": "rec-123",
        "start_ms": 100,
        "typ": "niespojnosc",
        "etykieta": "Kłamstwo",
        "opis": "Rozmówca kłamie na pewno w tym temacie.",
        "pewnosc": 0.9,
        "cytat_dowodowy": "Nie brałem w tym udziału",
    }
    with pytest.raises(ValidationError, match="Naruszenie zakazu fałszywej pewności"):
        validate_marker_or_raise(invalid_data)

def test_evasion_schema_validation():
    evasion = EvasionAnalysisOutput(
        klasyfikacja="whataboutism",
        pewnosc=0.8,
        co_zostalo_pominiete="Konkretna kwota deficytu",
        cytat_dowodowy="A co działo się przez ostatnie osiem lat?",
        uzasadnienie="Rozmówca zamiast podać dane o deficycie odwołał się do działań poprzedników."
    )
    assert evasion.klasyfikacja == "whataboutism"
    assert evasion.pewnosc == 0.8
