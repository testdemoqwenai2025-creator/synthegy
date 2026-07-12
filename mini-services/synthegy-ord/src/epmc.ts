// Europe PMC REST API client.
//
// Europe PMC (https://europepmc.org/) is a free, open literature database
// covering biomedical and life sciences — 40M+ citations, 8M+ full-text OA.
// No API key required.
//
// Used here to compute a "literature confidence" score for a compound or
// reaction — how many papers mention it, and which are the most cited.

const EPMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest";

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
  confidenceScore: number; // 0-1 based on total hit count
  fetchedAt: number;
}

interface EpmcResponse {
  hitCount: number;
  resultList?: {
    result?: Array<{
      pmid?: string;
      pmcid?: string;
      doi?: string;
      title?: string;
      journalTitle?: string;
      pubYear?: string;
      authorString?: string;
      citedByCount?: number;
      abstractText?: string;
      hasTextMinedTerms?: boolean;
    }>;
  };
}

export async function searchLiterature(
  query: string,
  limit: number = 5
): Promise<LiteratureResult> {
  const clean = query.trim();
  if (!clean) {
    return { query: "", totalHits: 0, papers: [], confidenceScore: 0, fetchedAt: Date.now() };
  }
  // Use the search endpoint with core result type for abstracts + citations
  const url = `${EPMC_BASE}/search?query=${encodeURIComponent(
    clean
  )}&format=json&pageSize=${Math.min(limit, 25)}&resultType=core&sort=CITED desc`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Europe PMC returned ${res.status}`);
  }
  const data = (await res.json()) as EpmcResponse;
  const results = data.resultList?.result ?? [];

  const papers: LiteraturePaper[] = results.map((r) => ({
    pmid: r.pmid ?? null,
    pmcid: r.pmcid ?? null,
    doi: r.doi ?? null,
    title: r.title ?? "(untitled)",
    journalTitle: r.journalTitle ?? null,
    pubYear: r.pubYear ?? null,
    authors: r.authorString ? r.authorString.split(", ").slice(0, 5) : [],
    citedByCount: r.citedByCount ?? 0,
    abstract: r.abstractText ?? null,
    europepmcUrl: r.pmid
      ? `https://europepmc.org/article/MED/${r.pmid}`
      : r.pmcid
      ? `https://europepmc.org/article/PMC/${r.pmcid}`
      : null,
  }));

  // Confidence score: 0 hits = 0, 1-9 = 0.3, 10-99 = 0.6, 100-999 = 0.85, 1000+ = 1.0
  const hits = data.hitCount;
  const confidenceScore =
    hits === 0 ? 0 :
    hits < 10 ? 0.3 :
    hits < 100 ? 0.6 :
    hits < 1000 ? 0.85 :
    1.0;

  return {
    query: clean,
    totalHits: hits,
    papers,
    confidenceScore,
    fetchedAt: Date.now(),
  };
}
