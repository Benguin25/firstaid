export const CREATE_PATIENTS = `
  CREATE TABLE IF NOT EXISTS patients (
    id                   TEXT PRIMARY KEY,
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL,
    legal_first_name     TEXT NOT NULL,
    legal_middle_name    TEXT,
    legal_last_name      TEXT NOT NULL,
    preferred_name       TEXT,
    date_of_birth        TEXT NOT NULL,
    sex_at_birth         TEXT NOT NULL,
    gender_identity      TEXT,
    health_card_number   TEXT UNIQUE NOT NULL,
    version_code         TEXT NOT NULL,
    province_of_coverage TEXT NOT NULL DEFAULT 'ON',
    card_expiry          TEXT,
    phone                TEXT NOT NULL,
    email                TEXT,
    address_line1        TEXT NOT NULL,
    city                 TEXT NOT NULL,
    province             TEXT NOT NULL DEFAULT 'ON',
    postal_code          TEXT NOT NULL,
    emergency_name       TEXT,
    emergency_relation   TEXT,
    emergency_phone      TEXT,
    preferred_language   TEXT NOT NULL DEFAULT 'English',
    interpreter_needed   TEXT
  )
`;

export const CREATE_VISITS = `
  CREATE TABLE IF NOT EXISTS visits (
    id             TEXT PRIMARY KEY,
    created_at     TEXT NOT NULL,
    patient_id     TEXT NOT NULL,
    triage_result  TEXT,
    symptoms       TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )
`;

export const CREATE_HCV_CHECKS = `
  CREATE TABLE IF NOT EXISTS hcv_checks (
    id                   TEXT PRIMARY KEY,
    created_at           TEXT NOT NULL,
    patient_id           TEXT,
    health_card_number   TEXT NOT NULL,
    version_code         TEXT NOT NULL,
    response_code        TEXT NOT NULL,
    is_valid             INTEGER NOT NULL,
    name_match           INTEGER,
    dob_match            INTEGER,
    raw_response         TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  )
`;
