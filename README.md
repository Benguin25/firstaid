# Cura

## What is this?

firstAId is a mobile-first triage intake system designed to reduce wait times in hospitals and pharmacies. Patients check in through the app, answer a structured symptom questionnaire, and are automatically assigned a priority level. Staff see a live dashboard sorted by severity so the most critical patients are always seen first.

---

## The problem it solves

Walk-in patients currently wait in line regardless of how serious their condition is. A person having a cardiac event and a person with a mild rash join the same queue. firstAId fixes this by triaging patients at check-in using a structured symptom tree, then placing them in a priority queue so clinical staff can see who needs attention most urgently.

---

## Core features

| Feature | Description |
|---|---|
| Patient intake form | Collects name, DOB, contact info, height, weight, allergies, and chief complaint |
| Health card lookup | Returning patients are identified by health card — no need to re-enter info |
| Symptom questionnaire | Branching question tree covering ER and pharmacy scenarios |
| Automatic triage | Symptoms + pain level → severity tier (1–5) + priority score |
| Live queue dashboard | Staff view sorted by priority; updates in real time |
| Patient search | Search queue by name or health card number |
| Status management | Staff move patients through waiting → in-progress → discharged |
| Medical records | Post-treatment results linked to the patient visit |

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native (Expo) |
| Backend API | Python — FastAPI |
| Database | MySQL |
| Navigation | Expo Router |

---

## Project structure

```
firstaid/
│
├── app/                        # Expo Router screens
│   ├── dashboard/
│   │   ├── _layout.tsx         # Stack navigator (no header)
│   │   ├── index.tsx           # Staff queue dashboard + search
│   │   └── [id].tsx            # Individual patient detail screen
│   └── ...                     # Onboarding / intake screens (TBD)
│
├── src/
│   ├── hooks/
│   │   ├── useQueue.ts         # Fetches and sorts the patient queue
│   │   └── usePatient.ts       # Fetches a single patient + triage row
│   └── types/
│       └── supabase.ts         # Shared types: PatientRow, TriageStatus, CTAS levels
│
├── backend/
│   ├── main.py                 # FastAPI app entry point + CORS
│   ├── database.py             # MySQL connection pool
│   ├── models.py               # Pydantic request/response models
│   ├── triage.py               # Triage tree logic + priority scoring
│   ├── routes_triage.py        # API routes: /patients, /queue, /triage/status
│   └── .env                    # DB credentials (never commit this)
│
├── docs/
│   └── symptom_question_bank.txt   # Full 137-question symptom bank (21 categories)
│
└── README.md
```

---

## Database schema

Five tables. All linked through `patient.id` as the root foreign key.

```
patient
  └── patient_symptoms   (one row per symptom per visit)
  └── triage             (severity level, priority score, queue status)
  └── results            (filled by doctor post-treatment)
        └── medical_record  (archived visit record, links patient + result)
```

| Table | Purpose |
|---|---|
| `patient` | Basic intake info — name, DOB, contact, vitals, chief complaint |
| `patient_symptoms` | Normalised symptom rows (one per symptom) |
| `triage` | Triage output — severity 1–5, priority score, queue position, status |
| `results` | Doctor-filled diagnosis, treatment, and medication after the visit |
| `medical_record` | Final archived record linking the visit to results |

---

## Triage logic

Severity is determined by a top-down decision tree. The first branch that matches wins.

| Tier | Severity | Priority score | Queue outcome |
|---|---|---|---|
| Critical | 1 | 90 + pain level | Top of queue — seen immediately |
| Emergent | 2 | 70 + pain level | High priority — 15–30 min |
| Urgent | 3 | 50 + pain level | Standard queue — 45–90 min |
| Semi-urgent | 4 | 30 + pain level | Lower queue — 1.5–3 hrs |
| Non-urgent | 5 | 0 | Go home — not queued |

Three inputs feed the tree: the patient's **symptom set**, their **pain level (1–10)**, and their **chief complaint** (free text scanned for red-flag words). Pain level alone can override tier — a pain of 9/10 with no flagged symptoms still hits tier 1.

Within the same tier, patients are sorted by `priority_score DESC` then `arrival_time ASC` (earlier arrival wins the tie).

---

## API endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/patients` | Register patient, run triage, write queue row |
| `GET` | `/queue` | Return waiting queue sorted by priority |
| `PATCH` | `/triage/{patient_id}/status` | Update status: waiting / in-progress / discharged |
| `POST` | `/results` | Doctor submits diagnosis and treatment |
| `POST` | `/records` | Create medical record for a visit |
| `GET` | `/records/{patient_id}` | Fetch all records for a patient |

---

## Getting started

### Backend

```bash
# 1. Install dependencies
pip install fastapi uvicorn mysql-connector-python python-dotenv

# 2. Create your .env file
cp backend/.env.example backend/.env
# Fill in DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# 3. Run the database schema
mysql -u root -p < schema.sql

# 4. Start the API
cd backend
uvicorn main:app --reload
```

API runs at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Frontend

```bash
# 1. Install dependencies
npm install

# 2. Start Expo
npx expo start
```

> On a physical device, replace `localhost` in the API base URL with your machine's local IP address (e.g. `192.168.x.x`).

---

## Environment variables

Create a `.env` file in the `backend/` directory:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hospital_db
DB_USER=root
DB_PASSWORD=yourpassword
```

Never commit this file. It is listed in `.gitignore`.

---

## Symptom question bank

A structured question bank covering 21 medical categories is in `docs/symptom_question_bank.txt`. It contains 137 questions with per-answer triage weights (1–10). The frontend routes patients through a relevant subset based on their chief complaint — average completion time is 3–6 minutes.

Categories covered: Cardiovascular · Respiratory · Neurological · Trauma · Gastrointestinal · Infectious disease · Pain · Mental health · Allergic reactions & toxicology · Dermatological · Urological · Reproductive/Obstetric · ENT · Musculoskeletal · Ophthalmological · Paediatric · Endocrine/Metabolic · Pharmacy · Vitals · General flags

---

## Known limitations / work in progress

- Health card lookup is not yet a dedicated column — currently matched against `patient.id`
- Onboarding / patient-facing intake screens are in progress
- Authentication and role-based access (patient vs. staff) not yet implemented
- `queue_position` is a static integer — dynamic re-ranking on status change is planned
- `CTAS_COLORS`, `CTAS_LABELS`, and `STATUS_COLORS` are defined in `src/types/supabase.ts` and may need updating as triage levels are refined
- No test suite yet

---

## Contributing

This project is under active development. The schema, API routes, and triage logic are all subject to change. If you're updating this codebase, update this README to reflect any structural changes.

---

## License

TBD
