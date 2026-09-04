# PROFILER — Multimodal Video & Behavioral Intelligence System

Zaawansowana aplikacja webowa do forensiczej analizy wystąpień, wywiadów i debat osób publicznych (polityków, liderów opinii). System łączy **badanie treści i retoryki** z **obserwacją mowy ciała i biometrii (mimika FACS, drżenie głosu, mruganie, ucieczka wzroku)**, prezentując wyniki w **prostym, intuicyjnym języku zrozumiałym dla każdego**.

---

## 1. Kluczowe Możliwości PROFILERA

* **Prosty język analizy (dla każdego):**
  Zamiast niezrozumiałego żargonu (np. *„aktywacja AU14”*), PROFILER generuje jasne podsumowania:
  * 🧠 **Nastroje i Emocje:** *„Pewny siebie na początku, od 12. minuty narasta zniecierpliwienie i tłumiona złość.”*
  * 🎯 **Intencje i Uniki:** *„Zamiast odpowiedzieć, próbuje zdominować dziennikarza i ucieka od podania kwot.”*
  * ⚡ **Czułe Punkty:** *„Pytanie o przetargi wywołało 3-krotny skok mrugania i nagłą ucieczkę wzroku.”*
  * ⚖️ **Zgodność (Ciało vs Słowa):** *„Dysonans: Mówi 'jestem spokojny', ale jednocześnie przecząco kręci głową i zaciska wargi.”*
* **Wizja i Mimika (FACS):** Detekcja mikroekspresji twarzy trwających ułamki sekund (<200ms) z możliwością podglądu w zwolnionym tempie (0.25x).
* **Fizjologia i Akustyka:** Pomiar częstotliwości mrugania względem bazy ($B_0$) oraz mikroskopijnego drżenia i załamań głosu (Praat F0/jitter).
* **Nienegocjowalna wiarygodność:** Żadnych arbitralnych wyroków „kłamie”. Każda ocena ma twardy dowód cytowany, wideo z momentu zdarzenia i kalibrowaną pewność.

---

## 2. Architektura Systemu

* **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
  * Odtwarzacz wideo z trybem slow-motion (0.25x) dla mikroekspresji.
  * Karty prostego języka dla każdego widza + zwijany panel twardych danych dla ekspertów.
  * Telemetria postępu w czasie rzeczywistym (Server-Sent Events).
* **Backend:** FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 (asyncio + PostgreSQL/SQLite).
  * `app/services/plain_language.py`: Silnik tłumaczący pomiary na naturalny język polski.
  * `app/services/validator.py`: Rygorystyczny walidator jakościowy blokujący fałszywą pewność.
  * `app/services/media.py`: Pobieranie `yt-dlp` oraz transkodowanie `ffmpeg` (proxy 720p faststart + audio 16kHz WAV).
* **Baza Danych:** Modele `recordings`, `persons`, `markers`, `biometric_events`, `congruence_events`, `psychometric_profiles`.

---

## 3. Uruchomienie Aplikacji

### Szybki start lokalny (Development):
```bash
cd PROJEKTY/PROFILER
./run_dev.sh
```
* **Frontend Web:** [http://localhost:3000](http://localhost:3000)
* **Backend API & Dokumentacja Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Uruchomienie w Dockerze:
```bash
docker compose up --build
```

---

## 4. Zgodność Prawna i Standardy Etyczne (AI Act)
* **Osoby publiczne:** System analizuje wyłącznie publiczne wystąpienia osób pełniących funkcje publiczne w ramach działalności medioznawczej i dziennikarskiej (art. 85 RODO / prawo prasowe).
* **Brak profilowania pracowników i studentów:** Narzędzie wyklucza zakazane przez art. 5 AI Act zastosowania biometryczne w miejscu pracy i edukacji.
* **Przejrzystość:** Wyniki są podawane jako hipotezy badawcze oparte na pomiarach, a nie wyroki prawne.
