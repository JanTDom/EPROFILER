import pytest
from app.services.plain_language import plain_language_service

def test_translate_facs_contempt():
    res = plain_language_service.translate_facs("AU14", duration_ms=180)
    assert "lekceważenia" in res["naglowek"].lower() or "pogarda" in res["naglowek"].lower()
    assert "kącik ust" in res["proste_wyjasnienie"].lower()
    assert res["czas_trwania"] == "180 ms (ułamek sekundy)"

def test_translate_stress_blink_spike():
    res = plain_language_service.translate_stress(
        typ_reakcji="mruganie_skok",
        baza=20.0,
        aktualne=55.0
    )
    assert "przyspieszenie mrugania" in res["naglowek"].lower()
    assert "+175%" in res["proste_wyjasnienie"] or "55" in res["proste_wyjasnienie"]
    assert res["poziom_napiecia"] == "Wysoki"

def test_translate_congruence_dissonance():
    res = plain_language_service.translate_congruence(
        slowa="Jestem całkowicie spokojny o wynik tej kontroli",
        reakcja_ciala="przeczące kręcenie głową, zaciśnięte usta i skok mrugania",
        indeks=0.25
    )
    assert "sprzeczność" in res["naglowek"].lower()
    assert "odruchem obronnym" in res["proste_wyjasnienie"]
    assert res["indeks_procent"] == "25%"
