# Cura

[Live dashboard](https://firstaid-theta.vercel.app/dashboard) · [Patient app](https://firstaid-theta.vercel.app/)

A mobile-first ER triage app that replaces the waiting room's "first come, first served" queue with priority-based queueing — so the heart attack patient doesn't wait behind the sore throat.

---

## The problem

Walk-in ERs use a single FIFO queue. A patient with crushing chest pain joins the same line as a patient with a rash. Triage nurses re-rank manually, but they're the bottleneck — and patients wait blind, with no sense of why someone who arrived after them is being seen first.

## The solution

Patients self-check-in on a phone. They scan their health card, answer 5–10 adaptive symptom questions, and the app:

1. Computes a CTAS level (Canadian Triage Acuity Scale, 1–5) and a priority score on-device
2. Drops them into a live queue staff see, sorted by priority
3. Generates an AI clinical summary the doctor can read in ten seconds before walking in

Patients see their estimated wait. Staff see who needs them most. No clipboard.

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile / web | React Native (Expo, Expo Router) |
| Database + realtime | Supabase (Postgres + Realtime channels) |
| AI | Claude Haiku 4.5 — clinical summary (text) + health card OCR (vision) |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Styling | Tailwind |

---

## Algorithm — how triage works

**Inputs:** chief complaint (1 of 21 categories) → 5–10 adaptive symptom answers → self-rated severity (1–10).

### Adaptive questioning

A bank of **137 questions across 21 categories**, each answer carrying a clinical weight `1–10`. The engine routes the patient through the subset relevant to their chief complaint, always asks self-severity right after, and **stops early** once enough high-weight signals have been collected (≥ 2 answers weighted ≥ 8 with a max of 10). Most patients finish in 3–6 minutes.

### Score

```
baseScore  = 0.7 × (maxWeight / 10) + 0.3 × (meanWeight / 10)
finalScore = 0.85 × baseScore + 0.15 × (selfSeverity / 10)
```

The heaviest signal dominates — you don't want a 10/10 chest-pain answer averaged down to neutral by ten unremarkable ones. Mean weight provides a tiebreaker for overall acuity. Self-severity nudges; it doesn't drive.

### CTAS tier

| Tier | Max signal weight | Label |
|---|---|---|
| 1 | ≥ 10 | Critical |
| 2 | ≥ 8 | Emergent |
| 3 | ≥ 6 | Urgent |
| 4 | ≥ 3 | Semi-urgent |
| 5 | < 3 | Non-urgent |

A self-rated severity of 8+ promotes tier 5 → tier 4 — we don't send someone home if they're hurting, even if their answers don't trigger any flags.

### Dynamic queue priority

Rank isn't frozen at intake. Every minute, each patient's effective priority climbs by a CTAS-weighted wait penalty:

```
dynamicPriority = priorityScore + minutesWaiting × WAIT_WEIGHT[ctas]
WAIT_WEIGHT = { 1: 0, 2: 0.3, 3: 0.6, 4: 1.0, 5: 1.2 }
```

A CTAS-1 patient is already at the top — waiting can't push them higher. A CTAS-4 patient who's been waiting 90 minutes will catch up to a CTAS-3 who just walked in. This prevents low-acuity patients from being indefinitely starved while still putting the sickest first.

### Wait time estimate

Derived from who's ahead in the queue, weighted by their CTAS level — not a flat per-tier bucket. Calibrates from the DB's historical samples; falls back to defaults until enough data exists.

---

## Features

- **Health card scan** — Claude Vision parses an Ontario OHIP card photo into name, DOB, and card number. Saves two minutes of typing.
- **Adaptive triage interview** — 5–10 questions max, dynamic stopping, self-severity blend, runs entirely on-device
- **Body map** — tap-to-select pain regions, persisted with the visit
- **AI clinical summary** — Haiku reads the patient's Q&A and writes a 2–3 sentence pre-read for the attending physician
- **Live staff dashboard** — Supabase Realtime; queue re-ranks itself as patients arrive and waits accumulate
- **Search + filter** — by name, health card number, or status (waiting / in-progress)
- **Patient detail view** — vitals, allergies, full Q&A, body map, probable conditions, status controls
- **Status workflow** — waiting → in-progress → discharged, with escalation to a higher tier when a patient deteriorates
- **Estimated wait time** — calibrates from historical data, shown to both patient and staff

---

## Project structure

```
firstaid/
├── app/                       # Expo Router screens
│   ├── onboarding/            # Health card scan + intake
│   └── dashboard/             # Staff queue + patient detail
├── src/
│   ├── data/
│   │   ├── questionBank.ts    # 137 weighted questions, 21 categories
│   │   └── bodyMap.ts         # Body region definitions
│   ├── hooks/
│   │   ├── useQueue.ts        # Realtime queue + dynamic re-ranking
│   │   ├── usePatient.ts      # Single patient + triage row
│   │   └── useEstimateWait.ts # Per-patient wait estimate
│   ├── lib/
│   │   ├── triage.ts          # Adaptive questioning + score engine
│   │   ├── aiSummary.ts       # Claude clinical summary
│   │   ├── parseHealthCard.ts # Claude Vision OHIP OCR
│   │   ├── estimateWait.ts    # Wait time math
│   │   └── supabase.ts        # Supabase client
│   └── types/                 # Shared TypeScript types
└── database/
    └── database.sql           # Postgres schema
```

---

## Getting started

```bash
cd firstaid
npm install
npx expo start          # press w for web, scan QR for device
```

Required env vars in `firstaid/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_ANTHROPIC_API_KEY=...
```

Apply the schema once in the Supabase SQL editor (`database/database.sql`).

---

## Status

Hackathon MVP. Working: intake → triage → queue → detail → status workflow, health card OCR, AI summary. In progress: authentication / role-based access, structured post-visit records.
