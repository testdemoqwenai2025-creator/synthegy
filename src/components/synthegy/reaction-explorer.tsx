"use client";

import * as React from "react";
import {
  FlaskRound,
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
  Thermometer,
  Beaker,
  ArrowRight,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ordApi, type OrdSearchResult, type OrdReaction } from "@/lib/synthegy/ord-api";

export function ReactionExplorer({
  onReactionsFound,
}: {
  onReactionsFound?: (reactions: OrdReaction[]) => void;
}) {
  const [smiles, setSmiles] = React.useState("c1ccccc1");
  const [limit, setLimit] = React.useState(8);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<OrdSearchResult | null>(null);

  const run = async () => {
    if (!smiles.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ordApi.searchReactions(smiles, limit);
      setResult(res);
      onReactionsFound?.(res.reactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
              <FlaskRound className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Open Reaction Database explorer
              </div>
              <div className="text-[11px] text-muted-foreground">
                Search 100K+ real experimental reactions from{" "}
                <a
                  href="https://open-reaction-database.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  ORD
                </a>{" "}
                — fetched from Hugging Face, parsed via ord_schema + RDKit
              </div>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
            <Database className="mr-1 h-3 w-3" />
            550+ datasets
          </Badge>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Product SMILES (substructure search)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              value={smiles}
              onChange={(e) => setSmiles(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="e.g. c1ccccc1 (benzene), NC(=O)c1ccccc1 (benzamide)"
            />
            <Button onClick={run} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              Search reactions
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Try:</span>
            {[
              { label: "benzene", smi: "c1ccccc1" },
              { label: "benzamide", smi: "NC(=O)c1ccccc1" },
              { label: "pyridine", smi: "c1ccncc1" },
              { label: "indole", smi: "c1ccc2[nH]ccc2c1" },
              { label: "piperazine", smi: "C1CNCCN1" },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setSmiles(p.smi)}
                className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground">Max results:</label>
            <input
              type="number"
              min={1}
              max={25}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(25, Number(e.target.value) || 8)))}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-[12px] text-foreground">{error}</p>
          </div>
        )}

        {loading && (
          <div className="mt-4 flex h-32 items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                Fetching + parsing ORD datasets (this can take 10-30s)...
              </p>
            </div>
          </div>
        )}

        {!loading && result && result.totalMatches > 0 && (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] text-primary">
              <strong>{result.totalMatches}</strong> reactions found across{" "}
              <strong>{result.datasetsSearched}</strong> dataset(s). Each reaction
              includes real inputs, products, and conditions from experimental ELNs.
              {result.cached && <span className="ml-2 opacity-70">(cached)</span>}
            </div>
            <div className="max-h-[500px] space-y-2 overflow-y-auto scrollbar-slim">
              {result.reactions.map((r) => (
                <ReactionCard key={r.reactionId} reaction={r} />
              ))}
            </div>
          </div>
        )}

        {!loading && result && result.totalMatches === 0 && !error && (
          <div className="mt-4 rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center text-[12px] text-muted-foreground">
            No reactions found with that product substructure in the curated ORD datasets.
            Try a simpler SMILES (e.g. <code className="font-mono">c1ccccc1</code> for benzene).
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReactionCard({ reaction }: { reaction: OrdReaction }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="rounded-md border border-border/60 bg-background">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-muted-foreground">
            {reaction.reactionId}
          </div>
          {reaction.products[0] && (
            <div className="mt-0.5 truncate font-mono text-[12px] text-foreground">
              {reaction.products[0].smiles}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span>{reaction.inputs.length} inputs</span>
          {reaction.temperature && (
            <span className="inline-flex items-center gap-0.5">
              <Thermometer className="h-3 w-3" />
              {reaction.temperature}
            </span>
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border/60 bg-muted/10 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Inputs (reactants, reagents, catalysts)
          </div>
          <div className="mt-2 space-y-1.5">
            {reaction.inputs.map((inp, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {inp.role}
                </Badge>
                <code className="break-all font-mono text-[11px] text-foreground">
                  {inp.smiles}
                </code>
              </div>
            ))}
          </div>
          {reaction.solvents && reaction.solvents.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Solvents
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {reaction.solvents.map((s, i) => (
                  <code key={i} className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground ring-1 ring-border/60">
                    {s}
                  </code>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Beaker className="h-3 w-3" />
            Source: {reaction.datasetId}
            <ArrowRight className="h-3 w-3" />
            <a
              href={`https://open-reaction-database.org/dataset/${reaction.datasetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              View on ORD
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
