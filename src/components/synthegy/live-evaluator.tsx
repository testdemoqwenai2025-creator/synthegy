"use client";

import * as React from "react";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Lightbulb,
  Database,
  Clock,
  Atom,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { api, type EvaluateResponse } from "@/lib/synthegy/api";
import { useSynthegySession } from "@/hooks/use-synthegy-session";
import type { MoleculeRecord } from "@/lib/synthegy/molecule-api";

const PRESET_INSTRUCTIONS = [
  "Avoid unnecessary protecting groups. Prefer convergent routes.",
  "No toxic reagents. Must be amenable to 50 kg scale.",
  "Maximise late-stage diversification. Retain a halide handle through 6 steps.",
  "Prefer atom-economical steps. Avoid heavy metals.",
];

interface EnrichedMolecule {
  name: string;
  record: MoleculeRecord;
}

// Callback fired when a run is persisted — used by the parent to refresh
// the session-history panel.
export function LiveEvaluator({
  onRunPersisted,
  enrichedMolecule,
}: {
  onRunPersisted?: () => void;
  enrichedMolecule?: EnrichedMolecule | null;
}) {
  const [instruction, setInstruction] = React.useState(PRESET_INSTRUCTIONS[0]);
  const [target, setTarget] = React.useState("Atovaquone (antimalarial)");
  const [smiles, setSmiles] = React.useState("O=C(O)C1=CC(O)=C(C2=CC=CC=C2Cl)C(O)=C1");
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<EvaluateResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const { sessionId, label, ensureSession } = useSynthegySession();

  // When an enriched molecule is supplied (from the MoleculeExplorer),
  // sync the target + SMILES fields so the next evaluator run uses them.
  React.useEffect(() => {
    if (enrichedMolecule) {
      setTarget(enrichedMolecule.record.properties.iupacName ?? enrichedMolecule.name);
      setSmiles(enrichedMolecule.record.properties.canonicalSMILES);
    }
  }, [enrichedMolecule]);

  const run = async () => {
    if (!instruction.trim()) {
      setError("Please enter a chemist instruction first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      // Make sure we have a session to attach the run to.
      const sess = await ensureSession();
      // Build enrichedContext if we have a PubChem molecule.
      const enrichedContext = enrichedMolecule
        ? {
            source: "pubchem" as const,
            cid: enrichedMolecule.record.properties.cid,
            molecularFormula: enrichedMolecule.record.properties.molecularFormula,
            molecularWeight: enrichedMolecule.record.properties.molecularWeight,
            canonicalSMILES: enrichedMolecule.record.properties.canonicalSMILES,
            iupacName: enrichedMolecule.record.properties.iupacName,
            xLogP: enrichedMolecule.record.properties.xLogP,
            tpsa: enrichedMolecule.record.properties.tpsa,
            rotatableBondCount: enrichedMolecule.record.properties.rotatableBondCount,
            heavyAtomCount: enrichedMolecule.record.properties.heavyAtomCount,
            complexity: enrichedMolecule.record.properties.complexity,
            synonyms: enrichedMolecule.record.synonyms.slice(0, 12),
            description: enrichedMolecule.record.descriptions[0]?.description,
          }
        : undefined;
      const res = await api.evaluate({
        target,
        smiles,
        instruction,
        workflowId: "retrosynthesis",
        sessionId: sess?.id,
        enrichedContext,
      });
      setResponse(res);
      onRunPersisted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResponse(null);
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: input */}
      <div className="lg:col-span-5">
        <Card className="border-accent/30 bg-card">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Strategic Evaluator
                </div>
                <div className="text-sm font-semibold text-foreground">
                  Live LLM agent · natural language in, strategy score out
                </div>
              </div>
              <Sparkles className="h-5 w-5 text-accent" />
            </div>

            {/* Session badge — proves the run is persisted server-side */}
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[11px] text-muted-foreground">
                {sessionId ? (
                  <>
                    session:{" "}
                    <span className="text-foreground">
                      {sessionId.slice(0, 18)}
                    </span>
                    {sessionId.length > 18 ? "..." : ""}
                  </>
                ) : (
                  <span className="text-muted-foreground/70">
                    no session yet — one will be created on first run
                  </span>
                )}
              </span>
            </div>

            <div>
              <label className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>Target molecule</span>
                {enrichedMolecule && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-chart-3/10 px-2 py-0.5 text-[10px] font-medium text-chart-3 ring-1 ring-chart-3/30">
                    <Atom className="h-2.5 w-2.5" />
                    PubChem-enriched · CID {enrichedMolecule.record.properties.cid}
                  </span>
                )}
              </label>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="e.g. Atovaquone"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                SMILES (optional)
              </label>
              <input
                value={smiles}
                onChange={(e) => setSmiles(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="O=C(O)C1=..."
              />
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Chemist instruction
              </label>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={3}
                className="mt-1 resize-none bg-background text-sm focus-visible:ring-accent"
                placeholder="e.g. Avoid unnecessary protecting groups."
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lightbulb className="h-3 w-3" />
                Quick presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_INSTRUCTIONS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setInstruction(p)}
                    className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
                  >
                    preset {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={run} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Evaluator reasoning...
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-4 w-4" />
                    Run evaluator
                  </>
                )}
              </Button>
              {(response || error) && (
                <Button variant="outline" onClick={reset} disabled={loading}>
                  <X className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Calls the Synthegy backend at <code className="font-mono text-foreground">POST /api/evaluate</code> — the run is persisted to your session and appears in the history panel below.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right: result */}
      <div className="lg:col-span-7">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg shadow-black/30 min-h-[420px]">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  loading ? "animate-pulse bg-accent" : response ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              {response
                ? `strategic-evaluator://run/${response.runId.slice(0, 16)}`
                : "strategic-evaluator://run/latest"}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {loading ? "reasoning" : response ? "complete" : "awaiting input"}
            </div>
          </div>

          <div className="p-5">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <div className="text-sm font-medium text-foreground">Evaluator error</div>
                  <p className="mt-1 text-[12px] text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {!error && !response && !loading && (
              <div className="flex h-[340px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/30">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                  Press <span className="font-medium text-foreground">Run evaluator</span> to send
                  your instruction to the live Strategic Evaluator agent.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex h-[340px] flex-col items-center justify-center text-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Strategic Evaluator is scoring the candidate route...
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Reasoning over protecting groups, ring construction, step economy
                </p>
              </div>
            )}

            {response && !loading && <ResultView response={response} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({ response }: { response: EvaluateResponse }) {
  const { result, latencyMs, createdAt } = response;
  const verdictColor =
    result.verdict === "accept"
      ? "text-primary bg-primary/10 ring-primary/30"
      : result.verdict === "revise"
      ? "text-accent bg-accent/10 ring-accent/30"
      : "text-destructive bg-destructive/10 ring-destructive/30";

  return (
    <div className="space-y-5">
      {/* Persisted badge */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
          <Database className="mr-1 h-3 w-3" />
          persisted · {response.runId.slice(0, 20)}
        </Badge>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {latencyMs}ms
        </span>
        <span>·</span>
        <span>{new Date(createdAt).toLocaleTimeString()}</span>
      </div>

      {/* Score + verdict */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Strategy score
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tabular-nums text-foreground">
              {result.score.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">/ 1.00</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                result.verdict === "accept"
                  ? "bg-primary"
                  : result.verdict === "revise"
                  ? "bg-accent"
                  : "bg-destructive"
              )}
              style={{ width: `${Math.max(4, Math.min(100, result.score * 100))}%` }}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Verdict
          </div>
          <div className="mt-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium capitalize ring-1",
                verdictColor
              )}
            >
              {result.verdict === "accept" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {result.verdict}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{result.oneLineSummary}</p>
        </div>
      </div>

      {/* Strategy alignment */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Strategy alignment
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground">
          {result.strategyAlignment}
        </p>
      </div>

      {/* Flags */}
      {result.flags && result.flags.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Flags raised ({result.flags.length})
          </div>
          <div className="mt-2 space-y-2">
            {result.flags.map((f, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-mono font-medium text-foreground">
                    {f.step}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-accent/30 bg-accent/5 text-accent"
                  >
                    flag
                  </Badge>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">{f.issue}</p>
                {f.suggestion && (
                  <p className="mt-1.5 text-[12px] text-foreground">
                    <span className="text-primary">Suggestion:</span> {f.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <RotateCcw className="mr-1.5 inline h-3 w-3" />
        Run is persisted to your session — find it in the history panel below.
      </div>
    </div>
  );
}
