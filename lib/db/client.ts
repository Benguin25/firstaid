import * as SQLite from 'expo-sqlite';
import { CREATE_PATIENTS, CREATE_VISITS, CREATE_HCV_CHECKS } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('cura.db');
    _db.execSync(CREATE_PATIENTS);
    _db.execSync(CREATE_VISITS);
    _db.execSync(CREATE_HCV_CHECKS);
  }
  return _db;
}

export interface PatientRow {
  id: string;
  created_at: string;
  updated_at: string;
  legal_first_name: string;
  legal_middle_name: string | null;
  legal_last_name: string;
  preferred_name: string | null;
  date_of_birth: string;
  sex_at_birth: string;
  gender_identity: string | null;
  health_card_number: string;
  version_code: string;
  province_of_coverage: string;
  card_expiry: string | null;
  phone: string;
  email: string | null;
  address_line1: string;
  city: string;
  province: string;
  postal_code: string;
  emergency_name: string | null;
  emergency_relation: string | null;
  emergency_phone: string | null;
  preferred_language: string;
  interpreter_needed: string | null;
}

export interface HCVCheckRow {
  id: string;
  created_at: string;
  patient_id: string | null;
  health_card_number: string;
  version_code: string;
  response_code: string;
  is_valid: number;
  name_match: number | null;
  dob_match: number | null;
  raw_response: string | null;
}

export function insertPatient(patient: PatientRow): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO patients (
      id, created_at, updated_at,
      legal_first_name, legal_middle_name, legal_last_name, preferred_name,
      date_of_birth, sex_at_birth, gender_identity,
      health_card_number, version_code, province_of_coverage, card_expiry,
      phone, email, address_line1, city, province, postal_code,
      emergency_name, emergency_relation, emergency_phone,
      preferred_language, interpreter_needed
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?
    )`,
    [
      patient.id, now, now,
      patient.legal_first_name, patient.legal_middle_name ?? null, patient.legal_last_name, patient.preferred_name ?? null,
      patient.date_of_birth, patient.sex_at_birth, patient.gender_identity ?? null,
      patient.health_card_number, patient.version_code, patient.province_of_coverage, patient.card_expiry ?? null,
      patient.phone, patient.email ?? null, patient.address_line1, patient.city, patient.province, patient.postal_code,
      patient.emergency_name ?? null, patient.emergency_relation ?? null, patient.emergency_phone ?? null,
      patient.preferred_language, patient.interpreter_needed ?? null,
    ]
  );
}

export function findPatientByHealthCard(healthCardNumber: string): PatientRow | null {
  return getDb().getFirstSync<PatientRow>(
    'SELECT * FROM patients WHERE health_card_number = ?',
    [healthCardNumber]
  );
}

export function insertHCVCheck(check: HCVCheckRow): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.runSync(
    `INSERT INTO hcv_checks (
      id, created_at, patient_id,
      health_card_number, version_code,
      response_code, is_valid,
      name_match, dob_match, raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      check.id, now, check.patient_id ?? null,
      check.health_card_number, check.version_code,
      check.response_code, check.is_valid,
      check.name_match ?? null, check.dob_match ?? null,
      check.raw_response ?? null,
    ]
  );
}
