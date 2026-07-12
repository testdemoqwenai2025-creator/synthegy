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
};
