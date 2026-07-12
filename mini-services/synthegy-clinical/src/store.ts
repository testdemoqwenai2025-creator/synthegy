// SQLite store for the clinical service. Stores generated patients + analysis.

import { Database } from "bun:sqlite";
import { resolve } from "node:path";

const DB_PATH = resolve(import.meta.dir, "..", "synthegy-clinical.db");
const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY,
    disease TEXT NOT NULL,
    icd10 TEXT,
    diagnosis_year INTEGER,
    age_at_onset INTEGER,
    current_age INTEGER,
    sex TEXT,
    ethnicity TEXT,
    bmi REAL,
    smoker INTEGER,
    is_outlier INTEGER DEFAULT 0,
    outlier_type TEXT,
    data_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_patients_year ON patients(diagnosis_year);
  CREATE INDEX IF NOT EXISTS idx_patients_outlier ON patients(is_outlier);

  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    payload TEXT,
    created_at INTEGER NOT NULL
  );
`);

export function storePatient(p: any): void {
  db.prepare(
    `INSERT OR REPLACE INTO patients
     (patient_id, disease, icd10, diagnosis_year, age_at_onset, current_age,
      sex, ethnicity, bmi, smoker, is_outlier, outlier_type, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    p.patientId, p.disease, p.icd10, p.diagnosisYear, p.ageAtOnset, p.currentAge,
    p.sex, p.ethnicity, p.bmi, p.smoker ? 1 : 0, p.isOutlier ? 1 : 0,
    p.outlierType ?? null, JSON.stringify(p), Date.now()
  );
}

export function getAllPatients(): any[] {
  const rows = db.prepare(`SELECT data_json FROM patients ORDER BY diagnosis_year`).all() as { data_json: string }[];
  return rows.map(r => JSON.parse(r.data_json));
}

export function getPatientById(id: string): any | null {
  const row = db.prepare(`SELECT data_json FROM patients WHERE patient_id = ?`).get(id) as { data_json: string } | null;
  return row ? JSON.parse(row.data_json) : null;
}

export function patientCount(): number {
  return (db.prepare(`SELECT COUNT(*) AS c FROM patients`).get() as { c: number }).c;
}

export function cacheGet<T>(key: string): T | null {
  const row = db.prepare(`SELECT payload FROM cache WHERE key = ?`).get(key) as { payload: string } | null;
  if (!row) return null;
  try { return JSON.parse(row.payload) as T; } catch { return null; }
}

export function cacheSet<T>(key: string, value: T): void {
  db.prepare(`INSERT OR REPLACE INTO cache (key, payload, created_at) VALUES (?, ?, ?)`).run(key, JSON.stringify(value), Date.now());
}

export { db };
