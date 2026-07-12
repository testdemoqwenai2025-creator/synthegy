// Frontend API client for the Synthegy ORD + ADMET + Literature service (port 3003).
// All requests routed via Caddy gateway with ?XTransformPort=3003.

const ORD_PORT = 3003;
const API_KEY = process.env.NEXT_PUBLIC_SYNTHYGY_API_KEY || "synthegy-demo-key";

// --- Types ----------------------------------------------------------------

export interface OrdReaction {
  reactionId: string;
  datasetId: string;
  datasetName?: string;
  inputs: { role: string; smiles: string }[];
  products: { smiles: string }[];
  temperature?: string;
  solvents?: string[];
  yieldRaw?: string;
  matchType?: string;
  querySmiles?: string;
}

export interface OrdSearchResult {
  query: string;
  datasetsSearched: number;
  totalMatches: number;
  reactions: OrdReaction[];
  cached?: boolean;
  error?: string;
}

export interface AdmetResult {
  smiles: string;
  descriptors: {
    molecularWeight: number;
    clogP: number;
    tpsa: number;
    hBondDonors: number;
    hBondAcceptors: number;
    rotatableBonds: number;
    heavyAtoms: number;
    rings: number;
    aromaticRings: number;
    formalCharge: number;
    stereoCenters: number;
  };
  rules: {
    lipinski: { pass: boolean; violations: number; note: string };
    veber: { pass: boolean; note: string };
    bbbPermeable: { pass: boolean; note: string };
    leadLike: { pass: boolean; note: string };
    fragmentLike: { pass: boolean; note: string };
  };
  alerts: {
    pains: string[];
    syntheticAccessibility: number;
  };
  drugLikenessScore: number;
  verdict: "excellent" | "good" | "marginal" | "poor";
  cached?: boolean;
}

export interface LiteraturePaper {
  pmid: string | null;
  pmcid: string | null;
  doi: string | null;
  title: string;
  journalTitle: string | null;
  pubYear: string | null;
  authors: string[];
  citedByCount: number;
  abstract: string | null;
  europepmcUrl: string | null;
}

export interface LiteratureResult {
  query: string;
  totalHits: number;
  papers: LiteraturePaper[];
  confidenceScore: number;
  fetchedAt: number;
  cached?: boolean;
}

// --- Core fetch -----------------------------------------------------------

async function ordFetch<T>(
  path: string,
  query?: Record<string, string>
): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("XTransformPort", String(ORD_PORT));
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "x-api-key": API_KEY },
  });
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = body && typeof body === "object" && "message" in body
      ? String((body as { message: unknown }).message)
      : `Request failed with ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

// --- Endpoint wrappers ----------------------------------------------------

export const ordApi = {
  health: () => ordFetch<{ status: string; uptime_sec: number }>("/health"),

  searchReactions: (smiles: string, limit: number = 10) =>
    ordFetch<OrdSearchResult>("/api/ord/reactions/search", {
      smiles, limit: String(limit),
    }),

  admet: (smiles: string) =>
    ordFetch<AdmetResult>("/api/ord/admet", { smiles }),

  literature: (q: string, limit: number = 5) =>
    ordFetch<LiteratureResult>("/api/ord/literature", {
      q, limit: String(limit),
    }),

  datasets: () =>
    ordFetch<{ datasets: string[] }>("/api/ord/datasets"),

  stats: () =>
    ordFetch<{ total: number; byKind: { kind: string; c: number }[] }>("/api/ord/stats"),
};
