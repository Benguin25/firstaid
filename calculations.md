# Triage scoring — calculations & logic

All scoring runs **locally on-device**. There are no API calls, no LLM, no
external services. The full pipeline lives in:

- Question bank: [src/data/questionBank.ts](src/data/questionBank.ts)
- Algorithm: [src/lib/triage.ts](src/lib/triage.ts)
- UI flow: [src/screens/Onboarding/StepSymptoms.tsx](src/screens/Onboarding/StepSymptoms.tsx)

The patient is **never shown** the score, tier, or priority. Those values are
computed silently and stored alongside their answers for the doctor
dashboard (planned).

---

## 1. Question bank

The bank is a transcription of `message.txt`, organized into routed sections.
Each option has a hand-authored `weight` (1–10) where 10 = immediately
life-threatening and 1 = non-urgent.

| Section code        | Source section in bank                  | Use                                    |
| ------------------- | --------------------------------------- | -------------------------------------- |
| `CARDIOVASCULAR`    | Section 2                               | Routed from chief complaint (a)        |
| `RESPIRATORY`       | Section 3                               | Routed from (b)                        |
| `PAIN`              | Section 8                               | Routed from (c) + augments most others |
| `TRAUMA`            | Section 5                               | Routed from (d)                        |
| `INFECTIOUS`        | Section 7                               | Routed from (e)                        |
| `GASTROINTESTINAL`  | Section 6                               | Routed from (f)                        |
| `NEUROLOGICAL`      | Section 4                               | Routed from (g)                        |
| `MENTAL_HEALTH`     | Section 9                               | Routed from (h)                        |
| `DERMATOLOGICAL`    | Section 11                              | Routed from (i)                        |
| `UROLOGICAL`        | Section 12                              | Routed from (j)                        |
| `REPRODUCTIVE`      | Section 13                              | Routed from (k)                        |
| `ENT`               | Section 14                              | Routed from (l)                        |
| `MUSCULOSKELETAL`   | Section 15                              | Routed from (m)                        |
| `PHARMACY`          | Section 19                              | Routed from (n)                        |
| `GENERAL`           | Section 21                              | Routed from (o) + always-final flag    |
| `OPHTHALMOLOGICAL`  | Section 16 (omitted in MVP)             | —                                      |
| `ENDOCRINE`         | Section 18 (omitted in MVP)             | —                                      |
| Section 17 (paeds)  | Skipped — adult-only check-in           | —                                      |
| Section 20 (vitals) | Skipped — measured by clinical staff    | —                                      |

Question types:

- **`single`** — pill chips, exactly one answer, auto-advances 400 ms after tap.
- **`multi`** — pill chips, any number of answers, requires *Continue*.
- **`scale`** — 1–10 number grid, exactly one answer, auto-advances 300 ms after tap. Only used for the self-rated severity question.

---

## 2. Question selection — `selectNextQuestion(asked, category)`

A deterministic walk, not a random sampler. Order:

1. **Q001 — chief complaint.** Always asked first. The picked option's
   `route` field assigns the active `category`.
2. **`QSEV` — self-rated severity (1–10).** Always asked second, regardless
   of category. Each option carries `weight: 0` so it does not pollute
   max/mean signal weights.
3. **Routed follow-ups.** Pulled from the active category's section in the
   order they appear in the bank (the bank is hand-ordered by clinical
   importance), with two augmentations applied via `buildQueue`:

   - **Pain augmentation.** For categories where pain is a useful
     discriminator (`CARDIOVASCULAR`, `GASTROINTESTINAL`, `TRAUMA`,
     `NEUROLOGICAL`, `MUSCULOSKELETAL`, `UROLOGICAL`, `ENT`,
     `DERMATOLOGICAL`), `Q701` (pain severity) is injected at position 1
     of the section queue.
   - **Trajectory tail.** `Q2003` ("getting better, worse, or staying the
     same?") is appended to every queue if not already present, so the
     final question — when budget allows — captures direction-of-travel.
   - **Thin sections.** For categories with `< 4` questions in the queue
     (notably `PHARMACY` and `GENERAL`), a `Q2001` general-flag question is
     injected before the trajectory tail to give the model enough signal to
     score against.

A question is skipped if its id is already in `asked`.

### Hard cap

`MAX_QUESTIONS = 10`. The chief complaint and severity count toward this
limit, so the patient sees **at most 10 cards** total.

### Dynamic early stop — `shouldStopEarly(asked)`

After at least 3 questions, we check:

- `maxWeight === 10` (a definitively critical signal was recorded), AND
- at least 2 selected options have `weight ≥ 8` (so the critical signal is
  corroborated, not a one-off worst-case tap).

If both hold, we stop questioning early — the patient is unambiguously high
priority and dragging them through more questions wouldn't change the
outcome.

---

## 3. Scoring — `computeScore(asked, selfSeverity)`

### Step 1 — collect signal weights

Flatten `asked` into a single array of `weight` values from selected
options. Filter out `weight === 0` (the severity question's options have
weight 0 by design — its influence enters via the separate
`selfSeverity` blend, not via this pool).

If the array is empty *and* `selfSeverity` is null, return a default
"DISMISSED" score with everything zeroed.

### Step 2 — base score

```
baseScore = 0.7 × (maxWeight / 10) + 0.3 × (meanWeight / 10)
```

- `maxWeight` — the worst single signal recorded.
- `meanWeight` — average of all non-zero signal weights.

The 70/30 blend lets the worst signal dominate (a single weight-10 answer
forces the score to ≥ 0.70) while still rewarding patients with multiple
moderate-acuity answers over a single moderate one.

### Step 3 — severity blend

```
score = (1 − k) × baseScore + k × (selfSeverity / 10)
where k = SEVERITY_BLEND_WEIGHT = 0.15
```

If `selfSeverity` is null, `score = baseScore`. The blend weight `k = 0.15`
is intentionally small — the user explicitly said "take that into account
but not too much". Self-reports are noisy; bank-derived signals are
clinical. So:

- A patient with `maxWeight = 10` and `selfSeverity = 1` still scores
  ≥ `0.85 × 0.70 + 0.15 × 0.10 = 0.61` — well into HIGH.
- A patient with all weight-1 answers and `selfSeverity = 10` scores
  `0.85 × 0.10 + 0.15 × 1.0 = 0.235` — still LOW/DISMISSED, but bumped
  up enough to flag for triage attention.

The final value is clamped to `min(1, score)`.

### Step 4 — tier (1–5)

Tier is derived **from `maxWeight` alone**, mirroring the bank's scoring
guide. Severity does not change tier directly except for one nudge (below).

| `maxWeight` | Tier | Label        |
| ----------- | ---- | ------------ |
| `10`        | 1    | Critical     |
| `8–9`       | 2    | Emergent     |
| `6–7`       | 3    | Urgent       |
| `3–5`       | 4    | Semi-urgent  |
| `1–2`       | 5    | Non-urgent   |

### Step 5 — severity tier nudge

```
if selfSeverity ≥ 8 AND tier === 5 → tier = 4
```

Someone who self-reports 8+ severity should not be sent home outright,
even if every bank-derived signal they triggered was low-acuity. They get
bumped from tier 5 (non-urgent / dismissed) to tier 4 (semi-urgent / can
wait). This is the *only* way severity directly changes classification.

### Step 6 — priority class

| Tier   | Priority    | Patient guidance (clinician-facing only) |
| ------ | ----------- | ---------------------------------------- |
| 1, 2, 3 | `HIGH`      | Urgent care — be seen ASAP               |
| 4       | `LOW`       | Can wait — walk-in queue is reasonable   |
| 5       | `DISMISSED` | Likely doesn't need a hospital           |

These three classes are exactly what the user asked for. They are
**stored in the database** (inside `symptoms_text` as JSON) and surface in
the doctor dashboard. **Nothing about the score is shown to the patient.**

---

## 4. Worked examples

### Example A — clear cardiac emergency

Chief complaint: "Chest pain or heart concern" (route `CARDIOVASCULAR`).
Severity: 9.
Q101: "Radiating to left arm" → weight 10.
Q701: "8–9 — very severe" → weight 8.
Q103: "Less than 1 hour" → weight 10.

After Q103 we have `maxWeight = 10` and 3 weights ≥ 8 → `shouldStopEarly`
fires after 5 questions total (Q001, QSEV, Q101, Q701, Q103).

- `signalWeights = [9 (Q001), 10, 8, 10]` (severity excluded; chief complaint counts)
- `maxWeight = 10`, `meanWeight = 9.25`
- `baseScore = 0.7 × 1.0 + 0.3 × 0.925 = 0.978`
- `score = 0.85 × 0.978 + 0.15 × 0.9 = 0.966`
- `tier = 1`, `priority = HIGH`

### Example B — borderline

Chief complaint: "Stomach or digestive issue" (route `GASTROINTESTINAL`,
weight 5).
Severity: 4.
Q501: "Nausea and vomiting" → weight 5.
Q502: "Central / umbilical" → weight 7.
Q701: "4–5 — moderate" → weight 5.
Q503: "Comes and goes in waves" → weight 6.
Q504: "No change with movement" → weight 3.
Q505: "Not vomiting" → weight 1.
Q507: "No" dehydration → weight 1.
Q2003: "Staying the same" → weight 4.

10 questions reached.

- `signalWeights = [5, 5, 7, 5, 6, 3, 1, 1, 4]`
- `maxWeight = 7`, `meanWeight ≈ 4.11`
- `baseScore = 0.7 × 0.7 + 0.3 × 0.411 = 0.613`
- `score = 0.85 × 0.613 + 0.15 × 0.4 = 0.581`
- `tier = 3` (max 6–7), `priority = HIGH`

### Example C — mild and brief

Chief complaint: "Skin, rash, or eye issue" (weight 3).
Severity: 2.
Q1001: "Localised rash or irritation" → weight 3.
Q1002: "Mild irritation" → weight 3.
Q1003: "No" pus/discharge → weight 1.
Q1004: "More than 1 week" → weight 3.
Q2003: "Slightly improving" → weight 2.

7 questions total.

- `signalWeights = [3, 3, 3, 1, 3, 2]`
- `maxWeight = 3`, `meanWeight ≈ 2.5`
- `baseScore = 0.7 × 0.3 + 0.3 × 0.25 = 0.285`
- `score = 0.85 × 0.285 + 0.15 × 0.2 = 0.272`
- `tier = 4` (max 3–5), `priority = LOW`

### Example D — DISMISSED (with severity nudge)

Chief complaint: "Medication or prescription need" (weight 2).
Severity: 9.
Q1801: "Regular prescription refill" → weight 1.
Q2003: "Slightly improving" → weight 2.

4 questions total.

- `signalWeights = [2, 1, 2]`
- `maxWeight = 2`, `meanWeight ≈ 1.67`
- `baseScore = 0.7 × 0.2 + 0.3 × 0.167 = 0.190`
- `score = 0.85 × 0.190 + 0.15 × 0.9 = 0.297`
- Raw tier from maxWeight = 5 → **bumped to 4** by the severity nudge
  (selfSeverity ≥ 8) → `priority = LOW` instead of `DISMISSED`.

---

## 5. What gets persisted

When the patient submits, we send to Supabase
([`OnboardingContext.tsx` `buildPatientInsert`](src/screens/Onboarding/OnboardingContext.tsx)):

- `body_map: {}` (legacy column, unused)
- `symptoms_text` — JSON-stringified payload:
  ```json
  {
    "category": "CARDIOVASCULAR",
    "score": {
      "score": 0.97,
      "baseScore": 0.98,
      "maxWeight": 10,
      "meanWeight": 9.25,
      "selfSeverity": 9,
      "tier": 1,
      "priority": "HIGH"
    },
    "asked": [
      { "questionId": "Q001", "questionText": "...", "selected": [{ "id": "a", "label": "...", "weight": 9 }] },
      { "questionId": "QSEV", "questionText": "...", "selected": [{ "id": "9", "label": "9", "weight": 0 }] },
      ...
    ]
  }
  ```

The full `asked` log is preserved so the doctor dashboard can replay the
patient's reasoning.
