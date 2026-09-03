---
name: political-discourse-and-rhetoric-nlp
description: Advanced NLP, rhetorical deconstruction, and psycholinguistic discourse analysis for political interviews, debates, and speeches. Detects answer evasion, topic pivoting, logical fallacies (whataboutism, ad hominem), manipulative framing, LIWC psycholinguistic markers (distancing language, agency avoidance), and semantic claim-question relevance.
---

# Political Discourse & Rhetorical NLP Analysis

This skill provides the linguistic algorithms, taxonomy of rhetorical evasion, and prompt engineering protocols necessary to analyze speech text, dialogue transcripts, and political rhetoric.

---

## 1. The Evasion & Pivot Detection Algorithm

In political interviews, the primary sign of vulnerability or hidden agenda is the **Question-Answer Divergence ($D_{\text{QA}}$)**:

```
[ Interviewer Question (Q) ]
            │
            ▼
┌─────────────────────────────────────────┐
│     Semantic Intent & Topic Vector      │
└─────────────────────────────────────────┘
            │
            ▼
    [ Embeddings Cosine & NLI Check ] ◄─── [ Politician Answer (A) ]
            │
            ▼
┌─────────────────────────────────────────┐
│        RELEVANCE & EVASION SCORER       │
│  - Direct Answer Score (0.0 - 1.0)      │
│  - Pivot Transition Point (timestamp)   │
│  - Evasion Strategy Classification      │
└─────────────────────────────────────────┘
```

### Evasion Taxonomies:
1. **The Political Pivot / Bridge:**
   * *Formula:* Acknowledges keyword $\rightarrow$ pivots via transitional phrase ("*What the public really cares about is...*", "*The fundamental question is not X, but Y*").
2. **Attacking the Premise:**
   * *Formula:* Discredits the validity or neutrality of the question ("*That is a loaded question based on false assumptions*").
3. **Whataboutism / Counter-Accusation:**
   * *Formula:* Deflects scrutiny by invoking past scandals of the opposition ("*Why didn't you ask about what our predecessors did in 2018?*").
4. **Generalization & Filibustering (Word Salad / Gish Gallop):**
   * *Formula:* Floods the answer with generic statistics or patriotic platitudes to burn the interview segment clock without committing to a concrete stance.

---

## 2. Psycholinguistic Profiling & LIWC Dimensions

Language patterns reveal subconscious psychological states:

| Linguistic Marker | Observable Pattern | Psychological Diagnostic |
| :--- | :--- | :--- |
| **Pronoun Shift: Distancing** | Sudden drop in 1st-person singular (*"I", "me", "my"*) to passive voice or 3rd-person (*"The decision was made", "One could argue"*) | Psychological detachment, avoidance of personal accountability, guilt or fear of legal exposure. |
| **Tribal / Collectivist Shield** | Heavy reliance on 1st-person plural (*"We", "Our movement", "Poles"*) | Hiding personal vulnerability behind collective identity. |
| **Over-Compensatory Certainty** | Hyper-frequent use of absolutes (*"Never", "100%", "Completely impossible", "Without a shadow of doubt"*) | Often compensates for internal doubt or deliberate deception; high cognitive strain. |
| **Temporal Lacunae & Hesitation** | Disproportionate usage of cognitive fillers (*"Look", "Listen", "Let me be clear", "To be completely honest"*) | Buys time for narrative fabrication; preface phrases like "to be honest" paradoxically flag upcoming spin. |

---

## 3. Automated Fallacy Detection Taxonomy

When processing transcripts, tag rhetorical manipulation techniques with severity ratings:

```json
{
  "fallacies": [
    {
      "type": "WHATABOUTISM",
      "text_snippet": "A co robili nasi konkurenci przez osiem lat?",
      "severity": "HIGH",
      "function": "Evade accountability by shifting moral burden to absent third party"
    },
    {
      "type": "AD_HOMINEM_CIRCUMSTANTIAL",
      "text_snippet": "Pan zadaje to pytanie tylko dlatego, że reprezentuje pan stację sprzyjającą opozycji.",
      "severity": "CRITICAL",
      "function": "Discredit the interviewer's motive rather than answering the inquiry"
    },
    {
      "type": "FALSE_DILEMMA",
      "text_snippet": "Albo popieracie naszą ustawę, albo stoicie po stronie chaosu i wrogów państwa.",
      "severity": "HIGH",
      "function": "Artificially restrict debate space to force binary capitulation"
    },
    {
      "type": "STRAWMAN",
      "text_snippet": "Mój oponent uważa, że powinniśmy całkowicie zlikwidować programy socjalne.",
      "severity": "MEDIUM",
      "function": "Caricaturize moderate critique into an absurd, easily defeated extreme"
    }
  ]
}
```

---

## 4. Question-Answer Alignment Pipeline (Embedding & LLM Evaluation)

Evaluate the interview turns in Python / TypeScript using cross-encoder relevance models or LLM verification:

```python
from sentence_transformers import CrossEncoder

# Cross-encoder trained on MS MARCO / QA relevance
model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

question = "Did you personally authorize the transfer of the 5 million dollars?"
answer_direct = "No, I did not authorize any transfer."
answer_evasive = "Look, financial allocations in a multi-billion enterprise follow complex protocols established by previous administrations."

score_direct = model.predict([question, answer_direct])   # High score (~8.5)
score_evasive = model.predict([question, answer_evasive]) # Low score (~ -1.2)
```

---

## 5. Polish Political Discourse Specifics (Specyfika Polskiej Debaty)

When analyzing Polish political discourse (Sejm speeches, TVN24, Polsat News, TVP Info interviews, Kanal Zero, podcasts):
* **Classic Polish Pivot Tropes:**
  * *"Panie redaktorze, proszę mi pozwolić dokończyć..."* (Used to stall interviewer from following up).
  * *"A za czasów naszych poprzedników..."* / *"Przez 8 lat..."* (Classic opposition deflection).
  * *"Polacy doskonale wiedzą, że..."* (False consensus appeal / Vox populi fallacy).
  * *"To jest narracja pisana obcym alfabetem / realizująca agendę..."* (Conspiracy / delegitimization framing).
* **Tone & Register Shifts:**
  * Sudden transition from formal *Pan/Pani* distancing to confrontational, condescending familiar tone or patronizing lecturing (*"Niech pan nie manipuluje"*).
