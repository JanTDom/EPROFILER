# PROFILER — Multimodal Video & Behavioral Intelligence System

## 1. System Mission & Core Capabilities
**PROFILER** is an advanced video intelligence and behavioral profiling platform for forensic analysis of political speeches, high-stakes interviews, and public appearances. The system automatically ingests video and speech to extract:
* **Micro-Expressions & Emotional States:** Ekman FACS (Facial Action Coding System) action units, suppressed emotions (micro-smiles, flashes of contempt, suppressed anger, fear).
* **Baseline Calibration & Deviation:** Mathematical tracking of individual communicative baselines ($B_0$) vs. stress-induced physiological spikes (blink rates, pitch jitter/shimmer, vocal tremors).
* **Verbal vs. Non-Verbal Congruence:** Automatic detection of cognitive dissonance where spoken claims contradict bodily leakage cues.
* **Intentions & Agendas:** Classifying communicative posture (dominance, appeasement, evasion, provocation, moral posturing).
* **Strengths, Insecurities & Vulnerability Triggers:** Identifying topics that reliably break composure or provoke defensive pivots.
* **Rhetorical Deconstruction:** Question-answer divergence scoring, fallacy detection (whataboutism, ad hominem, strawman), and psycholinguistic markers (distancing pronouns, over-compensatory certainty).

---

## 2. Integrated Domain Skills
This project repository incorporates 5 dedicated engineering and domain skills located in `.agents/skills/`:

1. **`behavioral-profiling-and-analysis`**
   * FACS Action Unit mapping (AU1–AU24), micro-expression detection (< 200ms).
   * Vocal prosody analysis ($F_0$ pitch variability, jitter, shimmer, response latency).
   * Congruence Index ($C_{\text{score}}$) mathematical formulation.
   * Behavioral trait quantification (resilience, trigger sensitivity, composure).

2. **`video-multimodal-ai-pipeline`**
   * Video preprocessing: FFmpeg 720p web streaming proxy, 16kHz PCM audio extraction, keyframe sampling.
   * Transcription & Diarization: WhisperX word-level timestamps + PyAnnote 3.1 speaker clustering.
   * Multimodal AI: Gemini 2.0 / 1.5 Pro video token analysis with structured JSON schemas.
   * Local CV & prosody extraction: MediaPipe, Py-Feat, Parselmouth-Praat.
   * Queue architecture: BullMQ / Celery worker pipelines with progress telemetry.

3. **`video-intelligence-timeline-ui`**
   * DAW/NLE multi-track synchronized timeline (Video + Audio Waveform + Stress Heatmap + Hotspots + Word-by-word Transcript).
   * 60 FPS HTML5 Canvas rendering for high-density stress curves and AUs.
   * Interactive word-level scrubbing and playback synchronization.
   * Forensics Studio dark theme (`#0a0d14`), radar trait charts, and slow-motion (0.25x) micro-expression inspector.

4. **`political-discourse-and-rhetoric-nlp`**
   * Question-Answer semantic divergence scoring ($D_{\text{QA}}$).
   * Evasion and pivot classification (bridging, attacking the premise, filibustering).
   * Rhetorical fallacies and Polish political discourse specifics (Sejm, Polish news broadcast rhetorical tropes).
   * LIWC psycholinguistics (pronoun shift analysis, agency avoidance).

5. **`video-rag-and-profiler-database`**
   * PostgreSQL + `pgvector` database schema for subjects, interviews, segments, and timestamped behavioral events.
   * Semantic vector search across video moments (e.g., "Moments of high stress when discussing defence budget").
   * Longitudinal subject dossiers tracking composure and behavioral evolution over time.

---

## 3. Engineering & Stack Standards
* **Frontend:** Next.js 15 (App Router), React 19, TypeScript (strict mode), Tailwind CSS, Lucide Icons, Canvas API for timelines, Wavesurfer.js / Video.js.
* **Backend & API:** Fast API (Python 3.11+) for media/ML processing; Next.js Server Actions / API Routes with Zod runtime validation.
* **Queues & Storage:** Redis + BullMQ / Celery; S3-compatible object storage (MinIO / Supabase / Cloudflare R2) for media proxies.
* **Database:** PostgreSQL with `pgvector` extension for embeddings and timeline indexing.
