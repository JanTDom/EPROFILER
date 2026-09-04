import pytest
from app.services.gemini_profiler import gemini_profiler

@pytest.mark.asyncio
async def test_live_gemini_evasion_analysis():
    # Prawdziwy test z podłączonym kluczem API
    pytanie = "Czy pan osobiście zatwierdził ten wydatek w wysokości 10 milionów złotych?"
    odpowiedz = "Panie redaktorze, proszę spojrzeć na to, co nasi poprzednicy zrobili z budżetem przez osiem lat. Wtedy nikt nie pytał o żadne wydatki."

    result = await gemini_profiler.analyze_evasion(pytanie, odpowiedz)
    
    assert "klasyfikacja" in result
    assert result["klasyfikacja"] in {"whataboutism", "unik", "kontratak", "zmiana_tematu"}
    assert result["pewnosc"] >= 0.5
    assert len(result["cytat_dowodowy"]) > 0
    assert "naglowek_prosty" in result
