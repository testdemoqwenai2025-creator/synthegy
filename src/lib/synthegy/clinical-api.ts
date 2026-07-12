// Frontend API client for the clinical service (port 3005).

const CLINICAL_PORT = 3005;
const API_KEY = process.env.NEXT_PUBLIC_SYNTHYGY_API_KEY || "synthegy-demo-key";

export interface PatientSummary {
  patientId: string;
  diagnosisYear: number;
  ageAtOnset: number;
  sex: string;
  ethnicity: string;
  acpaPositive: boolean;
  rfPositive: boolean;
  das28AtDx: number;
  treatmentCount: number;
  outcome24m: string;
  das28_24m: number;
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
  totalPatients: number;
  demographics: { femalePct: number; meanAgeAtOnset: number; smokerPct: number };
  biomarkers: { acpaPositivePct: number; rfPositivePct: number; meanDas28AtDx: number };
  outcomes: { remissionRate: number; ldaRate: number; moderateRate: number; highRate: number };
  treatmentResponse: { mtxTreatedCount: number; mtxAcr50Rate: number; biologicTreatedCount: number; biologicAcr50Rate: number };
  adverseEvents: { anyAePct: number; seriousAeCount: number };
  outliers: number;
  diagnosisYearRange: [number, number];
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
  generate: (n: number = 50) =>
    clinFetch<{ generated: number; analysis: CohortAnalysis }>(`/api/clinical/generate?n=${n}`, { method: "POST" }),

  listPatients: () =>
    clinFetch<{ count: number; patients: PatientSummary[] }>("/api/clinical/patients"),

  getPatient: (id: string) =>
    clinFetch<{ patient: PatientFull }>(`/api/clinical/patients/${id}`),

  analysis: () =>
    clinFetch<{ analysis: CohortAnalysis }>("/api/clinical/analysis"),

  outcomes: () =>
    clinFetch<OutcomeAnalysis>("/api/clinical/outcomes"),
};
