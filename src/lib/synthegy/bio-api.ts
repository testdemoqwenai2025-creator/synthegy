// Frontend API client for the bio service (port 3004) + feedback endpoints (port 3001).

const BIO_PORT = 3004;
const API_KEY = process.env.NEXT_PUBLIC_SYNTHYGY_API_KEY || "synthegy-demo-key";

// --- Bio types ---

export interface PdbEntry {
  pdbId: string;
  title: string;
  method: string | null;
  resolution: number | null;
  releaseDate: string | null;
  ligands: string[];
  organism: string | null;
  uniprotIds: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: "compound" | "target" | "pathway" | "disease";
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraph {
  compound: { name: string; smiles: string };
  nodes: GraphNode[];
  edges: GraphEdge[];
  targets: Array<{ chemblId: string; name: string; geneSymbol: string | null; ensemblId: string | null }>;
  pathways: Array<{ pathwayId: string; name: string }>;
  diseases: Array<{ diseaseId: string; diseaseName: string; score: number; datasource: string }>;
  fetchedAt: number;
}

export interface PatentResult {
  patentId: string;
  title: string;
  snippet: string;
  assignee: string | null;
  filingDate: string | null;
  publicationDate: string | null;
  url: string;
}

// --- Bio fetch ---

async function bioFetch<T>(path: string, init?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("XTransformPort", String(BIO_PORT));
  if (init?.query) for (const [k, v] of Object.entries(init.query)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { ...init, headers: { "x-api-key": API_KEY, ...(init?.headers || {}) } });
  const text = await res.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(body && typeof body === "object" && "message" in body ? String((body as { message: unknown }).message) : `Failed (${res.status})`);
  return body as T;
}

export const bioApi = {
  searchProteins: (q: string, limit: number = 8) =>
    bioFetch<{ total: number; entries: PdbEntry[] }>("/api/bio/proteins/search", { query: { q, limit: String(limit) } }),

  getProtein: (pdbId: string) =>
    bioFetch<{ entry: PdbEntry }>(`/api/bio/proteins/${pdbId}`),

  buildGraph: (compoundName: string, compoundSmiles: string, targets: Array<{ chemblId: string; name: string; geneSymbol?: string }>) =>
    bioFetch<{ graph: KnowledgeGraph }>("/api/bio/graph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compoundName, compoundSmiles, targets }),
    }),

  searchPatents: (q: string, limit: number = 8) =>
    bioFetch<{ total: number; patents: PatentResult[] }>("/api/bio/patents", { query: { q, limit: String(limit) } }),
};

// --- Feedback types + endpoints (backend port 3001) ---

export interface FeedbackStats {
  totalFeedback: number;
  bySignal: Record<string, number>;
  agreementRate: number;
  correlation: Array<{ chemistSignal: string; evaluatorVerdict: string; count: number; avgScore: number }>;
}

export interface FeedbackProfile {
  totalFeedback: number;
  accepted: number;
  revised: number;
  rejected: number;
  avgAcceptedScore: number;
  avgRevisedScore: number;
  acceptedKeywords: string[];
  revisedKeywords: string[];
  insights: string[];
  profile: string;
}
