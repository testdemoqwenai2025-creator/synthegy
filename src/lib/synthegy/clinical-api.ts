// Frontend API client for the clinical service (port 3005).

const CLINICAL_PORT = 3005;
const API_KEY = process.env.NEXT_PUBLIC_SYNTHYGY_API_KEY || "synthegy-demo-key";

export interface PatientSummary {
  patientId: string;
  disease: string;
  diseaseKey: string;
  target: string;
  diagnosisYear: number;
  ageAtOnset: number;
  sex: string;
  ethnicity: string;
  biomarkers: Record<string, boolean | number>;
  primaryMetric: string;
  primaryScoreAtDx: number;
  treatmentCount: number;
  outcome24m: string;
  score24m: number;
  isOutlier: boolean;
  outlierType: string | null;
}

export interface PatientFull extends PatientSummary {
  disease: string;
  icd10: string;
  currentAge: number;
  bmi: number;
  smoker: boolean;
  biomarkers: {
    acpaPositive: boolean;
    rfPositive: boolean;
    crpAtDiagnosis: number;
    esrAtDiagnosis: number;
    das28AtDiagnosis: number;
    tenderJointCount: number;
    swollenJointCount: number;
  };
  treatments: Array<{
    drug: string;
    class: string;
    startMonth: number;
    durationMonths: number;
    response: string;
    adverseEvent?: string;
  }>;
  outcomeAt24Months: {
    das28: number;
    crp: number;
    status: string;
  };
  adverseEvents: string[];
  synthetic: boolean;
}

export interface CohortAnalysis {
  disease?: string;
  diseaseKey?: string;
  totalPatients: number;
  demographics: { femalePct: number; meanAgeAtOnset: number; smokerPct: number };
  biomarkers: { acpaPositivePct: number; rfPositivePct: number; meanDas28AtDx: number };
  outcomes: { remissionRate: number; ldaRate: number; moderateRate: number; highRate: number };
  treatmentResponse: { stdTreatedCount?: number; mtxTreatedCount?: number; stdAcr50Rate?: number; mtxAcr50Rate?: number; biologicTreatedCount: number; biologicAcr50Rate: number };
  adverseEvents: { anyAePct: number; seriousAeCount: number };
  outliers: number;
  diagnosisYearRange: [number, number];
  primaryMetric?: string;
}

export interface OutcomeAnalysis {
  byEra: Array<{ era: string; total: number; remission: number; lda: number; moderate: number; high: number; remissionRate: number }>;
  biomarkerCorrelation: {
    acpaPositive: { count: number; remissionRate: number };
    acpaNegative: { count: number; remissionRate: number };
  };
  outliers: Array<{ patientId: string; outlierType: string; outcome: string }>;
}

async function clinFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("XTransformPort", String(CLINICAL_PORT));
  const res = await fetch(url.toString(), { ...init, headers: { "x-api-key": API_KEY, ...(init?.headers || {}) } });
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(body && typeof body === "object" && "message" in body ? String((body as { message: unknown }).message) : `Failed (${res.status})`);
  return body as T;
}

export const clinicalApi = {
  generate: (disease: string = "rheumatoid_arthritis", n: number = 50, force: boolean = false) =>
    clinFetch<{ generated: number; disease: string; analysis: CohortAnalysis }>(`/api/clinical/generate?disease=${disease}&n=${n}${force ? "&force=true" : ""}`, { method: "POST" }),

  listDiseases: () =>
    clinFetch<{ diseases: Array<{ key: string; name: string; icd10: string; target: string; meanAgeOnset: number; femalePct: number }> }>("/api/clinical/diseases"),

  listPatients: (disease?: string) =>
    clinFetch<{ count: number; patients: PatientSummary[] }>(`/api/clinical/patients${disease ? `?disease=${disease}` : ""}`),

  getPatient: (id: string) =>
    clinFetch<{ patient: PatientFull }>(`/api/clinical/patients/${id}`),

  analysis: (disease?: string) =>
    clinFetch<{ analysis: CohortAnalysis }>(`/api/clinical/analysis${disease ? `?disease=${disease}` : ""}`),

  compare: () =>
    clinFetch<{ diseases: number; comparisons: CohortAnalysis[]; disclaimer: string }>("/api/clinical/compare"),

  outcomes: (disease?: string) =>
    clinFetch<OutcomeAnalysis>(`/api/clinical/outcomes${disease ? `?disease=${disease}` : ""}`),

  // New endpoints
  govData: (disease: string) =>
    clinFetch<{ disease: string; who_data: any[]; fda_adverse_events: any[]; fda_drug_labels: any[]; null_fields: string[]; totalGovRecords: number }>(`/api/clinical/gov-data?disease=${disease}`),

  predictCohort: (disease?: string) =>
    clinFetch<{ totalPredicted: number; meanRemissionProb: number; highConfidenceCount: number; predictions: any[] }>(`/api/clinical/predict-cohort${disease ? `?disease=${disease}` : ""}`),

  cdiscExport: (disease?: string) =>
    clinFetch<{ studyId: string; format: string; domains: Record<string, any>; totalRecords: number }>(`/api/clinical/cdisc-export${disease ? `?disease=${disease}` : ""}`),

  compoundMatch: (targets: any[], diseases?: string[]) =>
    clinFetch<{ totalMatches: number; matches: any[]; diseasesWithMatch: string[] }>(`/api/clinical/compound-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets, diseases }),
    }),
};
