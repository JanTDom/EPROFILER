from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

class ValidationError(Exception):
    """Błąd naruszenia reguł jakościowych i dowodowych w analizie dyskursu."""
    pass

class EvasionAnalysisOutput(BaseModel):
    klasyfikacja: str = Field(
        ...,
        description="Typ odpowiedzi: odpowiedz, odpowiedz_czesciowa, unik, kontratak, whataboutism, zmiana_tematu, niewystarczajace_dane"
    )
    pewnosc: float = Field(..., ge=0.0, le=1.0, description="Kalibrowana pewność oceny w skali 0.0 - 1.0")
    co_zostalo_pominiete: Optional[str] = None
    cytat_dowodowy: str = Field(..., min_length=1, description="Dosłowny cytat z transkrypcji uzasadniający klasyfikację")
    uzasadnienie: str = Field(..., min_length=5, description="Zwięzłe uzasadnienie oparte wyłącznie na tekście")

    @field_validator("klasyfikacja")
    @classmethod
    def validate_klasyfikacja(cls, v: str) -> str:
        dozwolone = {
            "odpowiedz", "odpowiedz_czesciowa", "unik", "kontratak",
            "whataboutism", "zmiana_tematu", "niewystarczajace_dane"
        }
        if v.lower() not in dozwolone:
            raise ValueError(f"Niedozwolona klasyfikacja: '{v}'. Dozwolone: {dozwolone}")
        return v.lower()

    @field_validator("cytat_dowodowy")
    @classmethod
    def validate_cytat(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError("cytat_dowodowy nie może być pusty. Każda ocena wymaga twardego dowodu tekstowego.")
        return v.strip()


class RhetoricalTechniqueItem(BaseModel):
    nazwa: str = Field(..., min_length=2)
    cytat_dowodowy: str = Field(..., min_length=1, description="Dosłowny fragment z wypowiedzi")
    pewnosc: float = Field(..., ge=0.0, le=1.0)
    opis: str = Field(..., min_length=5)

    @field_validator("cytat_dowodowy")
    @classmethod
    def validate_cytat(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Brak cytatu dowodowego dla techniki retorycznej.")
        return v.strip()


class RhetoricAnalysisOutput(BaseModel):
    techniki: List[RhetoricalTechniqueItem] = Field(default_factory=list)
    gestosc_konkretu: str = Field(..., description="wysoka | srednia | niska")
    uzasadnienie_gestosci: str = Field(..., min_length=3)

    @field_validator("gestosc_konkretu")
    @classmethod
    def validate_gestosc(cls, v: str) -> str:
        if v.lower() not in {"wysoka", "srednia", "niska"}:
            raise ValueError(f"Niepoprawna gęstość konkretu: '{v}'. Oczekiwano wysoka/srednia/niska.")
        return v.lower()


class MarkerCreateSchema(BaseModel):
    recording_id: str
    person_id: Optional[str] = None
    start_ms: int = Field(..., ge=0)
    end_ms: Optional[int] = None
    typ: str
    etykieta: str
    opis: str
    pewnosc: float = Field(..., ge=0.0, le=1.0)
    cytat_dowodowy: str = Field(..., min_length=1)
    przeslanki: List[str] = Field(default_factory=list)

    @field_validator("cytat_dowodowy")
    @classmethod
    def validate_cytat(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("cytat_dowodowy nie może być pusty ani zawierać wyłącznie białych znaków.")
        return v.strip()

    @model_validator(mode="after")
    def check_forbidden_absolute_claims(self) -> "MarkerCreateSchema":
        """Wykryj i zablokuj orzekanie o 'kłamstwie' czy 'intencjach' jako fakt."""
        opis_lower = self.opis.lower()
        zakazane_slowa = ["kłamie na pewno", "jest kłamcą", "na 100% kłamie", "prawdziwą intencją jest oszukanie"]
        for zakazane in zakazane_slowa:
            if zakazane in opis_lower:
                raise ValueError(
                    f"Naruszenie zakazu fałszywej pewności: '{zakazane}'. "
                    "Użyj sformułowania hipotezy, np. 'sygnały spójne z X'."
                )
        return self


def validate_marker_or_raise(marker_data: Dict[str, Any]) -> MarkerCreateSchema:
    """Rygorystyczna funkcja bramkująca przed zapisem markera do bazy danych."""
    try:
        return MarkerCreateSchema(**marker_data)
    except Exception as e:
        raise ValidationError(f"Błąd walidacji markera dowodowego: {str(e)}")
