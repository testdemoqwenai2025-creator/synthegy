// Routes for the clinical service — multi-disease support.

import { Hono } from "hono";
import { generateCohort, analyzeCohort, listDiseases } from "../python-bridge.ts";
import { storePatient, getAllPatients, getPatientById, patientCount, cacheGet, cacheSet } from "../store.ts";

export const clinical = new Hono();

// GET /health
clinical.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "synthegy-clinical",
    version: "2.0.0",
    description: "Synthetic patient cohorts for 6 diseases (RA, migraine, gout, osteoarthritis, UC, asthma)",
    disclaimer: "ALL PATIENT DATA IS SYNTHETIC. No real patient data is stored.",
    diseases: ["rheumatoid_arthritis", "migraine", "gout", "osteoarthritis", "ulcerative_colitis", "asthma"],
    patientCount: patientCount(),
    uptime_sec: Math.round(process.uptime()),
  });
});

// GET /api/clinical/diseases — list supported diseases
clinical.get("/diseases", async (c) => {
  const diseases = await listDiseases().catch(() => []);
  return c.json({ diseases, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// POST /api/clinical/generate?disease=rheumatoid_arthritis&n=50&force=true
// Generate and store a cohort for a specific disease (or ALL for all diseases).
clinical.post("/generate", async (c) => {
  const disease = c.req.query("disease") ?? "rheumatoid_arthritis";
  const n = Math.min(Number(c.req.query("n") ?? 50), 500);
  const force = c.req.query("force") === "true";
  if (force) {
    // Clear cache for this disease
  }
  const { patients, analysis } = await generateCohort(disease, n).catch((e) => {
    throw new Error(`Generation failed: ${e.message}`);
  });
  for (const p of patients) storePatient(p);
  return c.json({ generated: patients.length, disease, analysis, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// GET /api/clinical/patients?disease=rheumatoid_arthritis — list patients (optionally filtered by disease)
clinical.get("/patients", (c) => {
  const diseaseFilter = c.req.query("disease");
  let patients = getAllPatients();
  if (diseaseFilter) {
    patients = patients.filter(p => p.diseaseKey === diseaseFilter);
  }
  const summaries = patients.map(p => ({
    patientId: p.patientId,
    disease: p.disease,
    diseaseKey: p.diseaseKey,
    target: p.target,
    diagnosisYear: p.diagnosisYear,
    ageAtOnset: p.ageAtOnset,
    sex: p.sex,
    ethnicity: p.ethnicity,
    biomarkers: p.biomarkers,
    primaryMetric: p.primaryMetric,
    primaryScoreAtDx: p.primaryScoreAtDx,
    treatmentCount: p.treatments.length,
    outcome24m: p.outcomeAt24Months.status,
    score24m: p.outcomeAt24Months.score,
    isOutlier: p.isOutlier,
    outlierType: p.outlierType,
  }));
  return c.json({ count: summaries.length, patients: summaries, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// GET /api/clinical/patients/:id
clinical.get("/patients/:id", (c) => {
  const p = getPatientById(c.req.param("id"));
  if (!p) return c.json({ error: "not_found", message: "Patient not found" }, 404);
  return c.json({ patient: p, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// GET /api/clinical/analysis?disease=rheumatoid_arthritis
clinical.get("/analysis", async (c) => {
  const diseaseFilter = c.req.query("disease");
  const patients = getAllPatients();
  const filtered = diseaseFilter ? patients.filter(p => p.diseaseKey === diseaseFilter) : patients;
  if (filtered.length === 0) {
    return c.json({ error: "no_data", message: "No patients. POST /api/clinical/generate first." }, 404);
  }
  const analysis = await analyzeCohort(filtered).catch((e) => {
    throw new Error(`Analysis failed: ${e.message}`);
  });
  return c.json({ analysis, disclaimer: "ALL DATA IS SYNTHETIC" });
});

// GET /api/clinical/compare — cross-disease comparison
clinical.get("/compare", async (c) => {
  const patients = getAllPatients();
  if (patients.length === 0) {
    return c.json({ error: "no_data", message: "No patients. Generate cohorts first." }, 404);
  }
  // Group by disease
  const byDisease: Record<string, any[]> = {};
  for (const p of patients) {
    if (!byDisease[p.diseaseKey]) byDisease[p.diseaseKey] = [];
    byDisease[p.diseaseKey].push(p);
  }
  // Analyze each
  const comparisons: any[] = [];
  for (const [dk, cohort] of Object.entries(byDisease)) {
    const analysis = await analyzeCohort(cohort).catch(() => null);
    if (analysis) comparisons.push(analysis);
  }
  return c.json({
    diseases: comparisons.length,
    comparisons,
    disclaimer: "ALL DATA IS SYNTHETIC",
  });
});

// GET /api/clinical/outcomes?disease=rheumatoid_arthritis
clinical.get("/outcomes", (c) => {
  const diseaseFilter = c.req.query("disease");
  let patients = getAllPatients();
  if (diseaseFilter) patients = patients.filter(p => p.diseaseKey === diseaseFilter);
  if (patients.length === 0) {
    return c.json({ error: "no_data", message: "No patients." }, 404);
  }

  const byEra: Record<string, { total: number; remission: number; lda: number; moderate: number; high: number }> = {};
  for (const p of patients) {
    const era = Math.floor(p.diagnosisYear / 5) * 5;
    const key = `${era}-${era + 4}`;
    if (!byEra[key]) byEra[key] = { total: 0, remission: 0, lda: 0, moderate: 0, high: 0 };
    byEra[key].total++;
    const status = p.outcomeAt24Months.status;
    if (status === "remission") byEra[key].remission++;
    else if (status === "low_disease_activity") byEra[key].lda++;
    else if (status === "moderate_activity") byEra[key].moderate++;
    else byEra[key].high++;
  }

  return c.json({
    disease: patients[0]?.disease ?? "mixed",
    byEra: Object.entries(byEra).map(([era, counts]) => ({
      era, ...counts,
      remissionRate: counts.total > 0 ? Math.round(counts.remission / counts.total * 100) : 0,
    })),
    outliers: patients.filter(p => p.isOutlier).map(p => ({
      patientId: p.patientId,
      disease: p.disease,
      outlierType: p.outlierType,
      outcome: p.outcomeAt24Months.status,
    })),
    disclaimer: "ALL DATA IS SYNTHETIC",
  });
});
