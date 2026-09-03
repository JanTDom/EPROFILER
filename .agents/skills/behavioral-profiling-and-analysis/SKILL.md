---
name: behavioral-profiling-and-analysis
description: Advanced psychological, behavioral, and non-verbal profiling for video analysis of politicians, public figures, and interviewees. Covers Facial Action Coding System (FACS), micro-expressions, baseline deviation, vocal prosody stress metrics, verbal/non-verbal congruence, emotional state mapping, strengths/weaknesses detection, and deception/evasion indicators.
---

# Behavioral Profiling & Psychological Video Analysis

This skill provides the domain-specific methodology, psychological heuristics, and mathematical models needed to analyze human behavior, intentions, emotional states, vulnerabilities, and cognitive stress in recorded video interviews and political speeches.

---

## 1. The Core Scientific Framework

Analysis must never rely on single, isolated gestures (e.g., "crossing arms = defensive"). Professional profiling requires **triangulated multimodal clustering**:
1. **Facial Micro-Expressions & FACS (Facial Action Coding System)**
2. **Vocal Prosody & Acoustic Stress (Acoustics & Latency)**
3. **Kinesics & Autonomic Nervous System Indicators (Body Language & Physiology)**
4. **Verbal / Psycholinguistic Congruence (Discourse vs. Behavior)**

```
┌───────────────────────────────────────────────────────────┐
│                    TRIANGULATION ENGINE                   │
│                                                           │
│  [ FACS / Micro-Expressions ]    [ Vocal Prosody / Pitch ]│
│               │                              │            │
│               ▼                              ▼            │
│       ┌───────────────────────────────────────────┐       │
│       │        BASELINE DEVIATION CALCULATOR      │       │
│       └───────────────────────────────────────────┘       │
│               ▲                              ▲            │
│               │                              │            │
│  [ Kinesics / Autonomic Cues ]  [ Verbal / Lexical Claim ]│
└───────────────────────────────────────────────────────────┘
```

---

## 2. Baseline Calibration Methodology (The Ground Truth Rule)

Never evaluate a subject without first establishing an individual **Baseline Profile ($B_0$)** during neutral, comfortable, or biographical segments (typically the first 1–3 minutes of an interview).

### Baseline Metrics to Measure:
* **Blink Rate:** Baseline is usually 15–25 blinks per minute (bpm).
* **Mean Fundamental Frequency ($F_0$):** Typical vocal pitch and natural pitch variance.
* **Speech Cadence:** Average words per minute (WPM) and natural pause duration (typically 200–500ms).
* **Gaze & Head Movement Dynamics:** Default eye contact duration, natural nodding patterns.
* **Postural Stability:** Resting posture, hand gesture volume (illustrators vs. pacifiers).

### Deviation Trigger ($\Delta_{\text{stress}}$):
Any statistically significant shift ($> 2\sigma$ from $B_0$) immediately flags a **Hotspot of Cognitive or Emotional Stress**:
* Rapid blink flurry ($> 50\text{ bpm}$) following a specific question $\rightarrow$ Acute stress / cognitive load spike.
* Sudden cessation of blinking (frozen gaze) $\rightarrow$ Threat assessment / hyper-vigilance.
* Pitch elevation accompanied by throat clearing or swallowing $\rightarrow$ Sympathetic nervous system activation (dry mouth, vocal cord constriction).

---

## 3. Facial Action Coding System (FACS) & Emotion Mapping

Map camera frames and detected facial landmarks to Paul Ekman's FACS Action Units (AUs):

| Emotion / State | Primary Action Units (AUs) | Observable Facial Cues | Micro-Expression Nuances (< 200ms) |
| :--- | :--- | :--- | :--- |
| **Authentic Joy (Duchenne)** | AU6 + AU12 | Cheek raiser + lip corner puller | Crow's feet wrinkle at eye corners. AU12 alone (without AU6) indicates a polite/fake smile. |
| **Suppressed Anger** | AU4 + AU5 + AU7 + AU23/24 | Brow lowerer + upper lid raise + lip tightener/pressor | Thinning of lips (AU23/24) often leaks seconds before verbal confrontation. |
| **Fear / Apprehension** | AU1 + AU2 + AU4 + AU20 | Inner/outer brow raise + brow knit + lip stretcher | Fleeting brow knit with horizontal forehead wrinkles during probing questions. |
| **Contempt / Superiority** | Unilateral AU14 or AU12 | Unilateral dimple or asymmetric sneer | Highly predictive in political debates; reveals dismissive disdain for opponent or moderator. |
| **Disgust / Repulsion** | AU9 + AU10 | Nose wrinkler + upper lip raiser | Often seen when a politician is confronted with a scandal or an opponent's quote. |
| **Cognitive Strain / Processing** | AU4 + prolonged gaze aversion | Brow furrow + saccadic eye movement | Indicates heavy memory retrieval, spontaneous fabrication, or strategic framing. |

---

## 4. Vocal Prosody & Acoustic Stress Analysis

Analyze extracted audio channels for micro-acoustic properties:

1. **Fundamental Frequency ($F_0$) & Pitch Jitter:**
   * Acute stress triggers cricothyroid muscle tension, driving $F_0$ upward by 10%–35%.
   * Elevated **Jitter** (pitch perturbation) and **Shimmer** (amplitude perturbation) indicate loss of fine motor vocal control under anxiety.
2. **Response Latency ($\tau_{\text{resp}}$):**
   * Instantaneous zero-latency responses to complex allegations often indicate **pre-scripted talking points**.
   * Abnormally high latency ($> 2.5\text{s}$) paired with filler vocalizations ("umm", "well", "look") flags cognitive restructuring or narrative hesitation.
3. **Vocal Dysfluency & Speech Rate Dynamics:**
   * Sudden acceleration of WPM suggests defensive flight response (trying to rush past dangerous topic).
   * Sudden deceleration with heavy emphasis signals authoritarian dominance posturing or calculated deterrence.

---

## 5. Profiling Dimensions & Trait Quantification

When synthesizing profile data, categorize into structured, scoreable dimensions (scale 0–100 with confidence intervals):

### A. Intentions & Agendas
* **Dominance Posture:** Interruption frequency, vocal volume, downward head tilt, space expansion.
* **Appeasement / De-escalation:** Submissive head tilts, vocal softening, open palm gestures.
* **Evasion / Deflection:** Pivot latency, conversational bridging, answering an unasked question.
* **Performative Indignation:** Exaggerated gestures that appear *after* rather than *synchronously with* the spoken words.

### B. Strengths & Weaknesses
* **Psychological Resilience:** Speed of return to $B_0$ baseline following aggressive interrogation.
* **Vulnerability Triggers:** Specific topics (e.g., family wealth, loyalty, past votes) that consistently induce micro-stress clusters.
* **Rhetorical Coherence:** Ability to maintain logical narrative structure under time pressure.
* **Self-Regulation:** Suppression efficiency of leakage cues during hostile interactions.

### C. Fears & Insecurities
* **Status Loss Anxiety:** Defensive sneers, repeated appeals to authority/credentials, volume spikes.
* **Exposure / Discovery Fear:** Suprasternal notch touching (throat shield), sudden foot/torso repositioning away from interviewer, repeated lip licking.

---

## 6. Verbal vs. Non-Verbal Congruence Scoring

Calculate the **Congruence Index ($C_{\text{score}}$)** for each timestamped claim:

$$C_{\text{score}} = 1.0 - \left( w_f \cdot \mathcal{D}_{\text{facial}} + w_p \cdot \mathcal{D}_{\text{prosody}} + w_k \cdot \mathcal{D}_{\text{kinesic}} \right)$$

* **Incongruence Example (Classic Leakage):**
  * Spoken Words: *"I have full confidence in our current minister."* (Positive Valence)
  * Non-Verbal Leakage: Micro-head shake (negative kinesics) + AU15 lip depressor (sadness/doubt) + pitch drop.
  * **Flag:** High-probability cognitive dissonance or deceptive affirmation.

---

## 7. Output Schema for Behavioral Profiler Engines

Whenever generating profiling evaluations, adhere strictly to this structured JSON contract:

```json
{
  "timestamp_range": { "start_ms": 14200, "end_ms": 19800 },
  "subject_id": "politician_a",
  "topic_detected": "campaign_finance_inquiry",
  "baseline_deviation_score": 78,
  "confidence": 0.89,
  "metrics": {
    "blink_rate_bpm": 62,
    "blink_baseline_ratio": 2.8,
    "pitch_shift_hz": 42.5,
    "response_latency_sec": 2.1
  },
  "micro_expressions": [
    { "time_ms": 15120, "action_units": ["AU4", "AU15", "AU23"], "primary_state": "suppressed_defensiveness", "duration_ms": 120 }
  ],
  "congruence": {
    "verbal_sentiment": "calm_confident_assertion",
    "nonverbal_leakage": "acute_distress_and_containment",
    "congruence_index": 0.28,
    "interpretation": "High cognitive dissonance. Verbal denial contradicts severe autonomic stress markers."
  },
  "profile_insights": {
    "intent": "deflect_and_discredit_questioner",
    "vulnerability_flag": "financial_disclosures",
    "emotional_temperament": "combative_under_scrutiny"
  }
}
```
