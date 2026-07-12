"use client";

import * as React from "react";
import {
  History,
  Loader2,
  RefreshCw,
  Database,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type Run } from "@/lib/synthegy/api";
import { useSynthegySession } from "@/hooks/use-synthegy-session";
import { cn } from "@/lib/utils";

export function SessionHistory({ refreshKey }: { refreshKey: number }) {
  // Pass refreshKey so the session hook re-hydrates from localStorage when
  // a new run is persisted (the evaluator may have just created a session).
  const { sessionId, label, loading: sessionLoading } = useSynthegySession(refreshKey);
  const [runs, setRuns] = React.useState<Run[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!sessionId) {
      setRuns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getSession(sessionId);
      setRuns(detail.runs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
              <History className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Persisted run history
              </div>
              <div className="text-[11px] text-muted-foreground">
                Loaded from <code className="font-mono text-foreground">GET /api/sessions/:id</code>{" "}
                on the Synthegy backend
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading || !sessionId}
            className="h-8 gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh
          </Button>
        </div>

        {/* Session meta */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          <Database className="h-3 w-3 text-primary" />
          <span>
            session:{" "}
            <span className="font-mono text-foreground">
              {sessionLoading ? "loading..." : sessionId || "(none)"}
            </span>
          </span>
          {label && (
            <>
              <span>·</span>
              <span>label: <span className="text-foreground">{label}</span></span>
            </>
          )}
          <span>·</span>
          <span>{runs.length} run{runs.length === 1 ? "" : "s"}</span>
        </div>

        {/* Runs */}
        <div className="mt-4 space-y-2">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
              {error}
            </div>
          )}

          {!error && !loading && runs.length === 0 && (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
              <History className="mx-auto h-6 w-6 text-muted-foreground/50" />
              <p className="mt-2 text-[12px] text-muted-foreground">
                No runs yet. Run the Strategic Evaluator above — your results will appear here,
                persisted server-side.
              </p>
            </div>
          )}

          {runs.map((run) => {
            const expanded = expandedId === run.id;
            return (
              <div
                key={run.id}
                className="overflow-hidden rounded-md border border-border/60 bg-background"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : run.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/30"
                >
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <VerdictPill verdict={run.verdict} />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                    {run.instruction}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {run.score != null ? run.score.toFixed(2) : "--"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRel(run.createdAt)}
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-border/60 bg-muted/10 px-3 py-3">
                    <div className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
                      <Meta label="Run ID" value={run.id} mono />
                      <Meta label="Workflow" value={run.workflowId} mono />
                      <Meta label="Target" value={run.target ?? "—"} />
                      <Meta label="Latency" value={run.latencyMs != null ? `${run.latencyMs}ms` : "—"} />
                    </div>
                    {run.smiles && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          SMILES
                        </div>
                        <code className="mt-0.5 block break-all rounded bg-background px-2 py-1 font-mono text-[11px] text-foreground">
                          {run.smiles}
                        </code>
                      </div>
                    )}
                    {run.strategyAlignment && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Strategy alignment
                        </div>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-foreground">
                          {run.strategyAlignment}
                        </p>
                      </div>
                    )}
                    {run.flags.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                          Flags ({run.flags.length})
                        </div>
                        <div className="mt-1 space-y-1.5">
                          {run.flags.map((f, i) => (
                            <div key={i} className="rounded border border-border/60 bg-background px-2 py-1.5">
                              <div className="text-[11px] font-mono text-foreground">{f.step}</div>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{f.issue}</p>
                              {f.suggestion && (
                                <p className="mt-0.5 text-[11px] text-foreground">
                                  <span className="text-primary">→</span> {f.suggestion}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {run.oneLineSummary && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-[12px] text-foreground">
                        {run.oneLineSummary}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Trash2 className="h-3 w-3" />
          <span>
            Runs are stored in the backend&apos;s SQLite database and survive page reloads.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function VerdictPill({ verdict }: { verdict: string | null }) {
  if (!verdict) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        pending
      </span>
    );
  }
  const isAccept = verdict === "accept";
  const isRevise = verdict === "revise";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1",
        isAccept && "bg-primary/10 text-primary ring-primary/30",
        isRevise && "bg-accent/10 text-accent ring-accent/30",
        !isAccept && !isRevise && "bg-destructive/10 text-destructive ring-destructive/30"
      )}
    >
      {isAccept ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {verdict}
    </span>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-0.5 text-foreground truncate", mono && "font-mono text-[11px]")}>
        {value}
      </div>
    </div>
  );
}

function formatRel(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
