---
name: video-rag-and-profiler-database
description: Database architecture, vector RAG (Retrieval-Augmented Generation), and longitudinal behavioral dossier tracking for video profiling platforms. Covers PostgreSQL/pgvector schemas for subjects, interviews, timestamped behavioral events, and semantic cross-video querying of stress spikes, lies, and rhetorical patterns.
---

# Video RAG & Profiler Dossier Database Architecture

This skill governs data persistence, vector embeddings, semantic retrieval, and longitudinal psychological profiling across multiple video appearances of public figures and politicians.

---

## 1. Relational & Vector Schema (PostgreSQL + pgvector)

A complete production schema designed for millisecond-level timeline queries and semantic vector search across video segments:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Subjects (Politicians, Executives, Interviewees)
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    affiliation VARCHAR(255), -- Political party, organization
    avatar_url TEXT,
    baseline_blink_bpm NUMERIC(5,2),
    baseline_pitch_f0_hz NUMERIC(6,2),
    aggregate_ocean_scores JSONB, -- { "openness": 65, "conscientiousness": 70, ... }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Videos & Interviews
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_url TEXT,
    media_proxy_url TEXT NOT NULL, -- 720p web streaming proxy
    duration_ms INTEGER NOT NULL,
    interview_date DATE,
    outlet_name VARCHAR(255),
    interviewer_name VARCHAR(255),
    processing_status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, PROCESSING, READY, FAILED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Granular Timeline Segments & Transcripts (with Vector Embeddings)
CREATE TABLE interview_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    speaker_tag VARCHAR(50) NOT NULL, -- e.g. "SPEAKER_01"
    is_subject BOOLEAN DEFAULT FALSE,
    transcript_text TEXT NOT NULL,
    word_tokens JSONB, -- [{ "w": "word", "s": 1200, "e": 1450, "p": 0.98 }]
    sentiment_score NUMERIC(4,3), -- -1.0 to +1.0
    embedding vector(1536), -- text-embedding-3-small or Gemini text-embedding-004
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON interview_segments USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_segments_time ON interview_segments (interview_id, start_ms, end_ms);

-- 4. Timestamped Behavioral & FACS Events (Micro-expressions, Stress Spikes)
CREATE TABLE behavioral_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    start_ms INTEGER NOT NULL,
    end_ms INTEGER NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- 'MICRO_EXPRESSION', 'STRESS_SPIKE', 'INCONGRUENCE'
    primary_emotion VARCHAR(50), -- 'CONTEMPT', 'SUPPRESSED_ANGER', 'FEAR'
    action_units VARCHAR(50)[], -- ['AU4', 'AU15', 'AU23']
    stress_level_score INTEGER CHECK (stress_level_score BETWEEN 0 AND 100),
    congruence_index NUMERIC(3,2), -- 0.00 to 1.00
    confidence_score NUMERIC(3,2),
    context_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_behavioral_lookup ON behavioral_events (interview_id, start_ms);
CREATE INDEX idx_behavioral_stress ON behavioral_events (subject_id, stress_level_score DESC);

-- 5. Rhetorical & Evasion Events
CREATE TABLE rhetorical_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES interview_segments(id) ON DELETE CASCADE,
    fallacy_type VARCHAR(100), -- 'WHATABOUTISM', 'AD_HOMINEM', 'EVASION_PIVOT'
    evasion_score NUMERIC(3,2), -- 0.00 (direct) to 1.00 (complete evasion)
    question_text TEXT,
    deflection_bridge_phrase TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. Multimodal Video RAG Queries

Query cross-interview databases to detect psychological and behavioral patterns:

### Example: "Find moments where Subject X showed severe stress or evasion when asked about corruption or defence funds":

```sql
SELECT 
    s.full_name,
    i.title AS interview_title,
    i.media_proxy_url,
    seg.start_ms,
    seg.end_ms,
    seg.transcript_text,
    b.primary_emotion,
    b.stress_level_score,
    r.fallacy_type
FROM interview_segments seg
JOIN interviews i ON seg.interview_id = i.id
JOIN subjects s ON seg.subject_id = s.id
LEFT JOIN behavioral_events b 
    ON b.interview_id = seg.interview_id 
    AND b.start_ms BETWEEN seg.start_ms - 2000 AND seg.end_ms + 2000
LEFT JOIN rhetorical_events r 
    ON r.segment_id = seg.id
WHERE seg.subject_id = $1
  AND (
    seg.embedding <=> $query_embedding < 0.35
    OR seg.transcript_text ILIKE '%korupcj%' 
    OR seg.transcript_text ILIKE '%przetarg%'
  )
  AND (b.stress_level_score > 70 OR r.evasion_score > 0.7)
ORDER BY b.stress_level_score DESC NULLS LAST
LIMIT 10;
```

---

## 3. Longitudinal Profiler Dossier Synthesis

Synthesize data across 5–10 interviews over time to uncover:
1. **Persistent Vulnerability Clusters:** Topics that reliably break the subject's composure across different journalists and years.
2. **Evolution of Defense Mechanisms:** Did the subject shift from aggressive counter-attacks to passive stonewalling?
3. **Composure Drift:** Is the subject experiencing progressive cognitive fatigue or emotional burnout compared to their 2-year historical baseline?
