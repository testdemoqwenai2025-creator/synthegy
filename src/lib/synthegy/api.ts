// Synthegy frontend API client.
//
// All requests are routed through the Caddy gateway using the XTransformPort
// query parameter (port 3001 = synthegy-backend). The API key is attached
// automatically. Responses are typed and errors are normalised.

const BACKEND_PORT = 3001;
const API_KEY =
  process.env.NEXT_PUBLIC_SYNTHYGY_API_KEY || "synthegy-demo-key";

// --- Types (mirror backend validators) -----------------------------------

export interface EvaluatorFlag {
  step: string;
  issue: string;
  suggestion: string;
}

export interface EvaluatorResult {
  score: number;
  verdict: "accept" | "revise" | "reject" | string;
  strategyAlignment: string;
  flags: EvaluatorFlag[];
  oneLineSummary: string;
}

export interface EvaluateResponse {
  runId: string;
  sessionId: string;
  createdAt: number;
  latencyMs: number;
  result: EvaluatorResult;
}

export interface Session {
  id: string;
  label: string;
  chemistId: string | null;
  createdAt: number;
  updatedAt: number;
  runCount: number;
}

export interface Run {
  id: string;
  sessionId: string;
  workflowId: string;
  target: string | null;
  smiles: string | null;
  instruction: string;
  score: number | null;
  verdict: string | null;
  strategyAlignment: string | null;
  oneLineSummary: string | null;
  flags: EvaluatorFlag[];
  latencyMs: number | null;
  createdAt: number;
}

export interface SessionDetail {
  session: Omit<Session, "runCount">;
  runs: Run[];
}

export interface Scenario {
  id: string;
  workflowId: "retrosynthesis" | "mechanism" | "alignment";
  title: string;
  target: string;
  smiles: string;
  instruction: string;
  steps: { agent: string; label: string; detail: string; status: string }[];
  verdict: string;
}

export interface UseCase {
  id: string;
  sector: "Pharmaceuticals" | "Materials Science" | "Agrochemicals" | "Fine Chemicals";
  title: string;
  summary: string;
  outcome: string;
  metrics: { label: string; value: string }[];
}

// --- Collections (named compound sets) ------------------------------------

export interface Collection {
  id: string;
  label: string;
  description: string | null;
  chemistId: string | null;
  itemCount: number;
  createdAt: number;
  updatedAt: number;
}

// A collection as returned by GET /:id (no itemCount field, has items[] instead).
export type CollectionWithoutCount = Omit<Collection, "itemCount">;

export interface CollectionItem {
  id: string;
  collectionId: string;
  cid: number;
  name: string | null;
  molecularFormula: string | null;
  molecularWeight: string | null;
  canonicalSMILES: string;
  inchikey: string | null;
  xlogp: number | null;
  tpsa: number | null;
  source: string | null;
  addedAt: number;
}

export interface CollectionItemInput {
  cid: number;
  name?: string;
  molecularFormula?: string;
  molecularWeight?: string;
  canonicalSMILES: string;
  inchikey?: string;
  xlogp?: number;
  tpsa?: number;
  source?: string;
}

// --- Core fetch wrapper ---------------------------------------------------

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string> }
): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("XTransformPort", String(BACKEND_PORT));
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      url.searchParams.set(k, v);
    }
  }
  const headers = new Headers(init?.headers);
  headers.set("x-api-key", API_KEY);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url.toString(), {
    ...init,
    headers,
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with ${res.status}`) || `Request failed with ${res.status}`;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

// --- Endpoint wrappers ----------------------------------------------------

export const api = {
  health: () => apiFetch<{ status: string; uptime_sec: number; version: string }>("/health"),

  // Sessions
  listSessions: () =>
    apiFetch<{ count: number; sessions: Session[] }>("/api/sessions"),
  createSession: (label: string, chemistId?: string) =>
    apiFetch<{ session: Session }>(
      "/api/sessions",
      { method: "POST", body: JSON.stringify({ label, chemistId }) }
    ),
  getSession: (id: string) =>
    apiFetch<SessionDetail>(`/api/sessions/${id}`),
  updateSession: (id: string, label: string) =>
    apiFetch<{ ok: boolean; updatedAt: number }>(
      `/api/sessions/${id}`,
      { method: "PATCH", body: JSON.stringify({ label }) }
    ),
  deleteSession: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

  // Evaluate (LLM)
  evaluate: (params: {
    target?: string;
    smiles?: string;
    instruction: string;
    workflowId?: "retrosynthesis" | "mechanism" | "alignment";
    sessionId?: string;
    enrichedContext?: {
      source: "pubchem";
      cid?: number;
      molecularFormula?: string;
      molecularWeight?: string;
      canonicalSMILES?: string;
      iupacName?: string;
      xLogP?: number;
      tpsa?: number;
      rotatableBondCount?: number;
      heavyAtomCount?: number;
      complexity?: number;
      synonyms?: string[];
      description?: string;
    };
  }) =>
    apiFetch<EvaluateResponse>("/api/evaluate", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  // Scenarios + use cases (from backend DB)
  listScenarios: () =>
    apiFetch<{ count: number; scenarios: Scenario[] }>("/api/scenarios"),
  listUseCases: (sector?: string) =>
    apiFetch<{ count: number; sectors: string[]; useCases: UseCase[] }>(
      "/api/use-cases",
      { query: sector ? { sector } : undefined }
    ),

  // Collections (named compound sets)
  listCollections: () =>
    apiFetch<{ count: number; collections: Collection[] }>("/api/collections"),
  createCollection: (label: string, description?: string) =>
    apiFetch<{ collection: Collection }>("/api/collections", {
      method: "POST",
      body: JSON.stringify({ label, description }),
    }),
  getCollection: (id: string) =>
    apiFetch<{ collection: CollectionWithoutCount; items: CollectionItem[] }>(
      `/api/collections/${id}`
    ),
  updateCollection: (id: string, patch: { label?: string; description?: string | null }) =>
    apiFetch<{ ok: boolean; updatedAt: number }>(
      `/api/collections/${id}`,
      { method: "PATCH", body: JSON.stringify(patch) }
    ),
  deleteCollection: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/collections/${id}`, { method: "DELETE" }),
  addCollectionItem: (collectionId: string, item: CollectionItemInput) =>
    apiFetch<{ ok: boolean; itemId: string; addedAt: number }>(
      `/api/collections/${collectionId}/items`,
      { method: "POST", body: JSON.stringify(item) }
    ),
  addCollectionItemsBulk: (collectionId: string, items: CollectionItemInput[]) =>
    apiFetch<{ ok: boolean; added: number; skipped: number; addedAt: number }>(
      `/api/collections/${collectionId}/items/bulk`,
      { method: "POST", body: JSON.stringify({ items }) }
    ),
  removeCollectionItem: (collectionId: string, cid: number) =>
    apiFetch<{ ok: boolean }>(
      `/api/collections/${collectionId}/items/${cid}`,
      { method: "DELETE" }
    ),

  // Feedback (active learning loop)
  recordFeedback: (runId: string, signal: "accept" | "revise" | "reject", chemistId?: string, note?: string) =>
    apiFetch<{ ok: boolean; id: string; runId: string; signal: string; recordedAt: number }>(
      "/api/feedback",
      { method: "POST", body: JSON.stringify({ runId, signal, chemistId, note }) }
    ),
  feedbackStats: () =>
    apiFetch<{ totalFeedback: number; bySignal: Record<string, number>; agreementRate: number; correlation: Array<{ chemistSignal: string; evaluatorVerdict: string; count: number; avgScore: number }> }>("/api/feedback/stats"),
  feedbackProfile: () =>
    apiFetch<{ totalFeedback: number; accepted: number; revised: number; rejected: number; avgAcceptedScore: number; avgRevisedScore: number; acceptedKeywords: string[]; revisedKeywords: string[]; insights: string[]; profile: string }>("/api/feedback/profile"),
};
