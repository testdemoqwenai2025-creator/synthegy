"use client";

import * as React from "react";
import {
  Dna,
  Search,
  Loader2,
  ExternalLink,
  Network,
  FileText,
  TrendingUp,
  Microscope,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  bioApi,
  type PdbEntry,
  type KnowledgeGraph,
  type PatentResult,
} from "@/lib/synthegy/bio-api";
import { cn } from "@/lib/utils";

interface BioIntelligenceProps {
  compoundName: string;
  compoundSmiles: string;
  targets: Array<{ chemblId: string; name: string; geneSymbol?: string }>;
}

export function BioIntelligence({ compoundName, compoundSmiles, targets }: BioIntelligenceProps) {
  const [graph, setGraph] = React.useState<KnowledgeGraph | null>(null);
  const [loadingGraph, setLoadingGraph] = React.useState(false);
  const [graphError, setGraphError] = React.useState<string | null>(null);

  // Auto-build knowledge graph when targets change.
  React.useEffect(() => {
    if (!compoundName || targets.length === 0) return;
    let cancelled = false;
    setLoadingGraph(true);
    setGraphError(null);
    bioApi
      .buildGraph(compoundName, compoundSmiles, targets)
      .then((r) => { if (!cancelled) setGraph(r.graph); })
      .catch((e) => { if (!cancelled) setGraphError(e instanceof Error ? e.message : "Graph failed"); })
      .finally(() => { if (!cancelled) setLoadingGraph(false); });
    return () => { cancelled = true; };
  }, [compoundName, compoundSmiles, targets]);

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3 ring-1 ring-chart-3/30">
            <Dna className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Biological intelligence
            </div>
            <div className="text-[11px] text-muted-foreground">
              RCSB PDB (220K structures) · KEGG pathways · OpenTargets diseases · Google Patents (100M+)
            </div>
          </div>
        </div>

        <Tabs defaultValue="graph" className="mt-4">
          <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
            <TabsTrigger value="graph" className="flex-1 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-chart-3/10 data-[state=active]:ring-1 data-[state=active]:ring-chart-3/30">
              <Network className="mr-1.5 inline h-3 w-3" />
              Knowledge graph
            </TabsTrigger>
            <TabsTrigger value="proteins" className="flex-1 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-chart-3/10 data-[state=active]:ring-1 data-[state=active]:ring-chart-3/30">
              <Microscope className="mr-1.5 inline h-3 w-3" />
              Protein structures
            </TabsTrigger>
            <TabsTrigger value="patents" className="flex-1 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-chart-3/10 data-[state=active]:ring-1 data-[state=active]:ring-chart-3/30">
              <FileText className="mr-1.5 inline h-3 w-3" />
              Patents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-4">
            <GraphTab graph={graph} loading={loadingGraph} error={graphError} compoundName={compoundName} />
          </TabsContent>
          <TabsContent value="proteins" className="mt-4">
            <ProteinTab compoundName={compoundName} targets={targets} />
          </TabsContent>
          <TabsContent value="patents" className="mt-4">
            <PatentTab compoundName={compoundName} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// --- Knowledge graph tab ---

function GraphTab({ graph, loading, error, compoundName }: { graph: KnowledgeGraph | null; loading: boolean; error: string | null; compoundName: string }) {
  if (loading) return <LoadingBox label={`Building knowledge graph for ${compoundName}...`} />;
  if (error) return <ErrorBox message={error} />;
  if (!graph) return <EmptyBox message="No graph data." />;

  const diseases = graph.diseases.slice(0, 12);
  const pathways = graph.pathways.slice(0, 6);
  const targets = graph.targets;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-chart-3/30 bg-chart-3/5 px-3 py-2 text-[12px] text-chart-3">
        <strong>{graph.nodes.length}</strong> nodes · <strong>{graph.edges.length}</strong> edges ·
        compound → {targets.length} target(s) → {pathways.length} pathway(s) → {diseases.length} disease(s)
      </div>

      {/* Targets */}
      {targets.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Targets (from ChEMBL)
          </div>
          <div className="mt-1.5 space-y-1">
            {targets.map((t) => (
              <div key={t.chemblId} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5">
                <span className="font-mono text-[11px] text-muted-foreground">{t.chemblId}</span>
                <span className="text-[12px] text-foreground">{t.name}</span>
                {t.geneSymbol && (
                  <Badge variant="outline" className="text-[10px]">{t.geneSymbol}</Badge>
                )}
                {t.ensemblId && (
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{t.ensemblId}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pathways */}
      {pathways.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            KEGG pathways
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pathways.map((p) => (
              <a
                key={p.pathwayId}
                href={`https://www.kegg.jp/entry/${p.pathwayId.replace("map", "hsa")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] text-foreground hover:border-chart-3/40"
              >
                {p.name.length > 40 ? p.name.slice(0, 40) + "…" : p.name}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Diseases */}
      {diseases.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Associated diseases (from OpenTargets)
          </div>
          <div className="mt-1.5 space-y-1">
            {diseases.map((d) => (
              <div key={d.diseaseId} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5">
                <span className="text-[12px] text-foreground">{d.diseaseName}</span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-chart-3" style={{ width: `${d.score * 100}%` }} />
                  </div>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{d.score.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Protein structures tab ---

function ProteinTab({ compoundName, targets }: { compoundName: string; targets: Array<{ name: string }> }) {
  const [query, setQuery] = React.useState(targets[0]?.name ?? compoundName);
  const [entries, setEntries] = React.useState<PdbEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasRun, setHasRun] = React.useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await bioApi.searchProteins(query, 8);
      setEntries(res.entries);
      setTotal(res.total);
      setHasRun(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (query) run();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-chart-3"
          placeholder="Search PDB structures (e.g. cyclooxygenase, EGFR)"
        />
        <Button size="sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {hasRun && total > 0 && (
        <div className="text-[11px] text-muted-foreground">
          {total.toLocaleString()} structures in PDB. Showing top {entries.length}.
        </div>
      )}

      {loading && <LoadingBox label="Searching RCSB PDB..." />}

      {!loading && entries.length > 0 && (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-slim">
          {entries.map((e) => (
            <div key={e.pdbId} className="rounded-md border border-border/60 bg-background px-3 py-2">
              <div className="flex items-baseline gap-2">
                <a
                  href={`https://www.rcsb.org/structure/${e.pdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[12px] font-semibold text-chart-3 hover:underline"
                >
                  {e.pdbId}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                {e.method && <span className="text-[10px] text-muted-foreground">{e.method}</span>}
                {e.resolution && <span className="text-[10px] text-muted-foreground">{e.resolution.toFixed(1)} Å</span>}
                {e.organism && <span className="text-[10px] italic text-muted-foreground">{e.organism}</span>}
              </div>
              <div className="mt-0.5 text-[12px] text-foreground">{e.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Patents tab ---

function PatentTab({ compoundName }: { compoundName: string }) {
  const [query, setQuery] = React.useState(`${compoundName} synthesis`);
  const [patents, setPatents] = React.useState<PatentResult[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasRun, setHasRun] = React.useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await bioApi.searchPatents(query, 8);
      setPatents(res.patents);
      setTotal(res.total);
      setHasRun(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Patent search failed");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (query) run();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-chart-3"
          placeholder="Search patents (e.g. aspirin synthesis)"
        />
        <Button size="sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {hasRun && total > 0 && (
        <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground">
          <TrendingUp className="mr-1.5 inline h-3 w-3 text-chart-3" />
          <strong>{total.toLocaleString()}</strong> patents found on Google Patents. Showing top {patents.length}.
        </div>
      )}

      {loading && <LoadingBox label="Searching Google Patents..." />}

      {!loading && patents.length > 0 && (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-slim">
          {patents.map((p) => (
            <a
              key={p.patentId}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border border-border/60 bg-background px-3 py-2 transition-colors hover:border-chart-3/40"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] font-semibold text-chart-3">{p.patentId}</span>
                {p.assignee && <span className="text-[10px] text-muted-foreground">{p.assignee}</span>}
                {p.publicationDate && <span className="text-[10px] text-muted-foreground">{p.publicationDate.slice(0, 4)}</span>}
              </div>
              <div className="mt-0.5 text-[12px] text-foreground">{p.title}</div>
              {p.snippet && <div className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{p.snippet}</div>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Shared helpers ---

function LoadingBox({ label }: { label: string }) {
  return (
    <div className="flex h-24 items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-chart-3" />
        <p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive">{message}</div>;
}

function EmptyBox({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center text-[12px] text-muted-foreground">{message}</div>;
}
