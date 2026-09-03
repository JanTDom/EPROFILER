# DYSKURS — System Analizy Dyskursu Politycznego w Nagraniach Wideo

Aplikacja webowa dla analityków mediów i komunikacji, badająca wystąpienia, wywiady i debaty osób publicznych. Narzędzie dostarcza materiał dowodowy do ludzkiej interpretacji:
* **Detekcja uników:** Badanie relacji pytanie–odpowiedź i wykrywanie pivotów, whataboutismu oraz zmian tematu.
* **Analiza technik retorycznych:** Wskazywanie technik erystycznych z dosłownym cytatem i kalibrowaną pewnością.
* **Prozodia mowy:** Badanie odchyleń od indywidualnego profilu bazowego ($B_0$) mówcy (tempo, pauzy, wahania, ton F0).
* **Dynamika interakcji:** Rejestracja przerywań i bilansu czasu w debatach.
* **Brak fałszywej pewności:** Żadnych arbitralnych ocen „kłamie" – wyłączne formułowanie hipotez w oparciu o twarde dowody cytowane.

---

## 1. Architektura Monorepo

* **`frontend/`**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
  * Odtwarzacz wideo zintegrowany ze streamingiem HTTP Range (płynny scrubbing).
  * Oś czasu i wizualizacja postępu w czasie rzeczywistym przez Server-Sent Events (SSE).
* **`backend/`**: FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 (asyncio + asyncpg / SQLite fallback).
  * `app/services/validator.py`: Rygorystyczny walidator jakościowy blokujący zapis ocen bez dowodu tekstowego i kalibracji pewności.
  * `app/services/media.py`: Pobieranie z YouTube i serwisów wideo przez `yt-dlp` oraz konwersja `ffmpeg` (proxy 720p H.264 faststart + audio 16kHz WAV).
* **`storage/`**: Magazyn plików wideo, audio i klatek.

---

## 2. Uruchomienie Systemu

### Opcja A: Pełny stos w Dockerze (zalecane)
Wymaga zainstalowanego Dockera:
```bash
docker compose up --build
```
* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend API & Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Opcja B: Uruchomienie lokalne (Development)

1. **Backend:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 3. Plan Wdrożenia w Fazach

* [x] **Faza 1 – Szkielet i Ingestion:** Monorepo, FastAPI + Next.js + baza danych + kolejka. Wgranie pliku/URL, `yt-dlp`, `ffmpeg`, proxy 720p, audio 16kHz, telemetria postępu SSE.
* [ ] **Faza 2 – Transkrypcja i Diaryzacja:** `faster-whisper` (pl, word-level) + `pyannote.audio`, interfejs przypinania mówców do bazy `persons`.
* [ ] **Faza 3 – Warstwa Retoryczna:** Integracja modeli Gemini z promptami wewnętrznymi (sekcje 6.2 i 6.3), walidacja dowodów, markery na osi czasu.
* [ ] **Faza 4 – Prozodia i Baseline:** Ekstrakcja cech prozodycznych (openSMILE / parselmouth), budowanie `person_baselines`, liczenie odchyleń $\Delta$.
* [ ] **Faza 5 – Dynamika Debat:** Przerywania, nakładanie głosów, bilans czasu per mówca.
* [ ] **Faza 6 – Synteza Profilu:** Łączenie danych w spójny profil osoby (prompt 6.5), niespójności w czasie (6.4).
* [ ] **Faza 7 – Eksport i Dopracowanie:** Generowanie raportów DOCX (`python-docx`, autor: „Domaniewski", en-dashy `–`) i PDF.

---

## 4. Ramy Prawne i Etyczne (Wbudowane w System)
* **Zgodność z AI Act:** Analiza bazuje na tekście i prozodii wypowiedzi publicznych. System nie dokonuje biometrycznego rozpoznawania emocji z mimiki.
* **Zakres:** Wyłącznie osoby pełniące funkcje publiczne i publiczne wystąpienia.
* **Rozróżnienie:** Wyraźne rozdzielenie **obserwacji** (zmierzone dane, transkrypcja, tempo) od **interpretacji** (hipotezy badawcze).
