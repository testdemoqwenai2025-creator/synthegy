// Routes for the clinical service.

import { Hono } from "hono";
import { generateCohort, analyzeCohort } from "../python-bridge.ts";
import { storePatient, getAllPatients, getPatientById, patientCount, cacheGet, cacheSet } from "../store.ts";

export const clinical = new Hono();

// GET /health
clinical.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "synthegy-clinical",
    version: "1.0.0",
    description: "Synthetic patient cohort (Rheumatoid Arthritis, 50 patients, 30-year epidemiological basis)",
    disclaimer: "ALL PATIENT DATA IS SYNTHETIC. No real patient data is stored. Replace with real data via CSV import when available.",
    disease: "Rheumatoid Arthritis (ICD-10 M06.9)",
    patientCount: patientCount(),
    uptime_sec: Math.round(process.uptime()),
  });
});

// POST /api/clinical/generate?n=50
// Generates and stores a fresh synthetic cohort. Idempotent — if patients
// already exist, returns them unless ?force=true.
clinical.post("/generate", async (c) => {
  const n = Math.min(Number(c.req.query("n") ?? 50), 500);
  const force = c.req.query("force") === "true";
  if (patientCount() > 0 && !force) {
    return c.json({ message: "Cohort already generated. Use ?force=true to regenerate.", patientCount: patientCount() });
  }
  const { patients, analysis } = await generateCohort(n).catch((e) => {
    throw new Error(`Generation failed: ${e.message}`);
  });
  // Store all patients
  for (const p of patients) storePatient(p);
  return c.json({
    generated: patients.length,
    analysis,
    disclaimer: "ALL DATA IS SYNTHETIC",
  });
});

// GET /api/clinical/patients — list all patients (summary fields only)
clinical.get("/patients", (c) => {
  const patients = getAllPatients();
  const summaries = patients.map(p => ({
    patientId: p.patientId,
    diagnosisYear: p.diagnosisYear,
    ageAtOnset: p.ageAtOnset,
    sex: p.sex,
    ethnicity: p.ethnicity,
    acpaPositive: p.biomarkers.acpaPositive,
    rfPositive: p.biomarkers.rfPositive,
    das28AtDx: p.biomarkers.das28AtDiagnosis,
    treatmentCount: p.treatments.length,
    outcome24m: p.outcomeAt24Months.status,
    das28_24m: p.outcomeAt24Months.das28,
    isOutlier: p.isOutlier,
    outlierType: p.outlierType,
  }));
  return c.json({ count: summaries.length, patients: summaries, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// GET /api/clinical/patients/:id — full patient record
clinical.get("/patients/:id", (c) => {
  const p = getPatientById(c.req.param("id"));
  if (!p) return c.json({ error: "not_found", message: "Patient not found" }, 404);
  return c.json({ patient: p, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// GET /api/clinical/analysis — aggregate cohort statistics
clinical.get("/analysis", async (c) => {
  const cacheKey = "analysis:latest";
  const cached = cacheGet(cacheKey);
  if (cached) return c.json({ analysis: cached, cached: true, disclaimer: "ALL DATA IS SYNTHETIC" });
  const patients = getAllPatients();
  if (patients.length === 0) {
    return c.json({ error: "no_data", message: "No patients. POST /api/clinical/generate first." }, 404);
  }
  const analysis = await analyzeCohort(patients).catch((e) => {
    throw new Error(`Analysis failed: ${e.message}`);
  });
  cacheSet(cacheKey, analysis);
  return c.json({ analysis, cached: false, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// GET /api/clinical/outcomes — outcome distribution + treatment response breakdown
clinical.get("/outcomes", (c) => {
  const patients = getAllPatients();
  if (patients.length === 0) {
    return c.json({ error: "no_data", message: "No patients." }, 404);
  }

  // Outcome by treatment era
  const byEra: Record<string, { total: number; remission: number; lda: number; moderate: number; high: number }> = {};
  for (const p of patients) {
    const era = Math.floor(p.diagnosisYear / 5) * 5; // 5-year buckets
    const key = `${era}-${era + 4}`;
    if (!byEra[key]) byEra[key] = { total: 0, remission: 0, lda: 0, moderate: 0, high: 0 };
    byEra[key].total++;
    const status = p.outcomeAt24Months.status;
    if (status === "remission") byEra[key].remission++;
    else if (status === "low_disease_activity") byEra[key].lda++;
    else if (status === "moderate_activity") byEra[key].moderate++;
    else byEra[key].high++;
  }

  // Biomarker correlation with outcome
  const acpaPos = patients.filter(p => p.biomarkers.acpaPositive);
  const acpaNeg = patients.filter(p => !p.biomarkers.acpaPositive);
  const acpaPosRemission = acpaPos.filter(p => p.outcomeAt24Months.status === "remission").length;
  const acpaNegRemission = acpaNeg.filter(p => p.outcomeAt24Months.status === "remission").length;

  return c.json({
    byEra: Object.entries(byEra).map(([era, counts]) => ({
      era,
      ...counts,
      remissionRate: counts.total > 0 ? Math.round(counts.remission / counts.total * 100) : 0,
    })),
    biomarkerCorrelation: {
      acpaPositive: { count: acpaPos.length, remissionRate: acpaPos.length > 0 ? Math.round(acpaPosRemission / acpaPos.length * 100) : 0 },
      acpaNegative: { count: acpaNeg.length, remissionRate: acpaNeg.length > 0 ? Math.round(acpaNegRemission / acpaNeg.length * 100) : 0 },
    },
    outliers: patients.filter(p => p.isOutlier).map(p => ({
      patientId: p.patientId,
      outlierType: p.outlierType,
      outcome: p.outcomeAt24Months.status,
    })),
    disclaimer: "ALL DATA IS SYNTHETIC",
  });
});
