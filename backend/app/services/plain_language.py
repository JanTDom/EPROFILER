from typing import Dict, Any, List, Optional

class PlainLanguageTranslator:
    """
    Silnik tłumaczący surowe pomiary biometryczne (FACS, drżenie głosu, mruganie)
    oraz analizy retoryczne na prosty, żywy i w 100% zrozumiały dla każdego język polski.
    """

    # Słownik ludzkich odpowiedników mikroekspresji twarzy (FACS)
    FACS_DICTIONARY = {
        "AU14": {
            "tytul": "Błyskawiczny uśmieszek lekceważenia (mikro-pogarda)",
            "opis": "W ułamku sekundy rozmówca unosi asymetrycznie tylko jeden kącik ust. Zazwyczaj świadczy to o poczuciu wyższości, kpinie lub przekonaniu, że przechytrzyło się pytającego.",
            "emocja": "Lekceważenie / Poczucie wyższości"
        },
        "AU1+AU4": {
            "tytul": "Grymas nagłego niepokoju i troski",
            "opis": "Jednoczesne uniesienie wewnętrznych kącików brwi i ich zmarszczenie. To mimowolny odruch zdradzający wewnętrzne napięcie, zmartwienie lub zaskoczenie trudnym zarzutem.",
            "emocja": "Niepokój / Skrępowanie"
        },
        "AU4": {
            "tytul": "Zmarszczenie brwi (zaciętość lub wysiłek myślowy)",
            "opis": "Ściągnięcie brwi do środka. Może oznaczać intensywne szukanie argumentów, zniecierpliwienie lub początek postawy obronnej.",
            "emocja": "Irytacja / Skupienie obronne"
        },
        "AU23_AU24": {
            "tytul": "Mocne zaciśnięcie warg (tłumienie słów)",
            "opis": "Zwężenie i dociśnięcie ust do siebie. Klasyczny sygnał, że mówca powstrzymuje się przed powiedzeniem czegoś za dużo lub tłumi rosnącą złość.",
            "emocja": "Tłumiona złość / Autocenzura"
        },
        "AU12": {
            "tytul": "Uśmiech dyplomatyczny (uśmiech samymi ustami)",
            "opis": "Rozciągnięcie ust bez udziału mięśni wokół oczu. To wyuczony, grzecznościowy uśmiech maskujący prawdziwe emocje lub zakłopotanie.",
            "emocja": "Maska uprzejmości"
        },
        "AU6_AU12": {
            "tytul": "Szczery, naturalny uśmiech (z 'kurzymi łapkami')",
            "opis": "Ruch ust połączony z mimowolnym zmarszczeniem kącików oczu. Prawdziwe, swobodne rozbawienie lub autentyczna radość.",
            "emocja": "Autentyczna radość"
        }
    }

    # Słownik reakcji fizjologicznych i mowy ciała
    BIOMETRIC_DICTIONARY = {
        "mruganie_skok": {
            "tytul": "Gwałtowne przyspieszenie mrugania (skok stresu)",
            "szablon": "Tempo mrugania wzrosło z typowych {baza} do {aktualne} mrugnięć na minutę (+{odchylenie}%). Oznacza to nagłe obciążenie stresem w reakcji na poruszony wątek.",
        },
        "mruganie_zastygniecie": {
            "tytul": "Zastygnięcie wzroku (stan podwyższonej czujności)",
            "szablon": "Rozmówca nagle niemal przestał mrugać ({aktualne} mrugnięć/min). Wskazuje to na skupienie i wzmożoną kontrolę nad każdym wypowiadanym słowem.",
        },
        "wzrok_ucieczka": {
            "tytul": "Ucieczka wzrokiem w dół lub w bok",
            "szablon": "Zerwanie kontaktu wzrokowego z dziennikarzem w kluczowym momencie odpowiedzi. Często towarzyszy poczuciu dyskomfortu lub szukaniu bezpiecznego tematu.",
        },
        "drzenie_glosu": {
            "tytul": "Zaciśnięcie gardła i nerwowe drżenie głosu",
            "szablon": "Nagły skok wysokości głosu o {f0_shift} Hz oraz mikroskopijne drżenie fałdów głosowych. Świadczy o suchości w gardle i reakcji stresowej układu nerwowego.",
        }
    }

    # Słownik uników i taktyk słownych
    EVASION_DICTIONARY = {
        "unik": {
            "tytul": "Zręczny unik i ucieczka od odpowiedzi",
            "opis": "Rozmówca w ogóle nie odpowiada na zadane pytanie. Mówi płynnie, ale o zupełnie innej sprawie, licząc że widz nie zauważy podmiany tematu.",
        },
        "whataboutism": {
            "tytul": "Odbicie piłeczki ('A co robili inni?')",
            "opis": "Zamiast wytłumaczyć własne działania, polityk natychmiast wytyka błędy swoim rywalom politycznym, aby odwrócić od siebie uwagę.",
        },
        "kontratak": {
            "tytul": "Atak na pytającego zamiast odpowiedzi",
            "opis": "Mówca podważa intencje lub obiektywizm dziennikarza ('Dlaczego pan o to pyta?'), aby postawić pytającego w roli oskarżonego.",
        },
        "odpowiedz_czesciowa": {
            "tytul": "Częściowa odpowiedź z przemilczeniem sedna",
            "opis": "Odpowiedział na łatwiejszą część pytania, ale całkowicie pominął trudniejszy konkret (np. kwotę, datę lub odpowiedzialność).",
        },
        "zmiana_tematu": {
            "tytul": "Przesunięcie tematu na wygodne tory (tzw. mostek)",
            "opis": "Użycie formuły w stylu 'Prawdziwym problemem jest jednak...' i płynne przejście do przygotowanego wcześniej przemówienia.",
        }
    }

    @classmethod
    def translate_facs(cls, au_code: str, duration_ms: int = 150) -> Dict[str, str]:
        """Tłumaczy kod FACS na prosty opis."""
        entry = cls.FACS_DICTIONARY.get(au_code)
        if entry:
            return {
                "naglowek": entry["tytul"],
                "proste_wyjasnienie": entry["opis"],
                "emocja": entry["emocja"],
                "czas_trwania": f"{duration_ms} ms (ułamek sekundy)"
            }
        return {
            "naglowek": f"Krótki grymas twarzy ({au_code})",
            "proste_wyjasnienie": "Błyskawiczna zmiana ułożenia mięśni twarzy poniżej progu świadomej kontroli.",
            "emocja": "Niejednoznaczna",
            "czas_trwania": f"{duration_ms} ms"
        }

    @classmethod
    def translate_stress(
        cls,
        typ_reakcji: str,
        baza: float,
        aktualne: float,
        f0_shift: float = 0.0
    ) -> Dict[str, str]:
        """Tłumaczy skok stresu fizjologicznego na język codzienny."""
        entry = cls.BIOMETRIC_DICTIONARY.get(typ_reakcji)
        odchylenie = int(((aktualne - baza) / (baza or 1)) * 100) if baza else 0
        if entry:
            szablon = entry["szablon"].format(
                baza=int(baza),
                aktualne=int(aktualne),
                odchylenie=odchylenie,
                f0_shift=int(f0_shift)
            )
            return {
                "naglowek": entry["tytul"],
                "proste_wyjasnienie": szablon,
                "poziom_napiecia": "Wysoki" if odchylenie > 80 else "Umiarkowany"
            }
        return {
            "naglowek": "Zauważalna zmiana mowy ciała",
            "proste_wyjasnienie": f"Wskaźnik zmienił się o {odchylenie}% względem spokojnego początku rozmowy.",
            "poziom_napiecia": "Umiarkowany"
        }

    @classmethod
    def translate_congruence(
        cls,
        slowa: str,
        reakcja_ciala: str,
        indeks: float
    ) -> Dict[str, str]:
        """Tłumaczy Indeks Kongruencji (dysonans słowa vs ciało) na prosty język."""
        if indeks < 0.4:
            ocena = "Wyraźna sprzeczność (ciało mówi co innego niż usta)"
            wniosek = f"Gdy padły słowa: „{slowa}”, ciało zareagowało odruchem obronnym: {reakcja_ciala}. Ta niezgodność sugeruje silny dyskomfort wewnętrzny lub nieszczerość."
        elif indeks < 0.7:
            ocena = "Pewne napięcie pod fasadą spokoju"
            wniosek = f"Wypowiedź pozornie pewna, ale zdradzająca sygnały tłumionego stresu ({reakcja_ciala})."
        else:
            ocena = "Pełna spójność i swoboda"
            wniosek = "Mowa ciała, ton głosu i wypowiadane słowa są ze sobą w zgodzie. Rozmówca czuje się pewnie."

        return {
            "naglowek": ocena,
            "proste_wyjasnienie": wniosek,
            "indeks_procent": f"{int(indeks * 100)}%"
        }

plain_language_service = PlainLanguageTranslator()
