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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EvaluatorResult {
  score: number;
  verdict: "accept" | "revise" | "reject" | string;
  strategyAlignment: string;
  flags: { step: string; issue: string; suggestion: string }[];
  oneLineSummary: string;
}

const PRESET_INSTRUCTIONS = [
  "Avoid unnecessary protecting groups. Prefer convergent routes.",
  "No toxic reagents. Must be amenable to 50 kg scale.",
  "Maximise late-stage diversification. Retain a halide handle through 6 steps.",
  "Prefer atom-economical steps. Avoid heavy metals.",
];

export function LiveEvaluator() {
  const [instruction, setInstruction] = React.useState(PRESET_INSTRUCTIONS[0]);
  const [target, setTarget] = React.useState("Atovaquone (antimalarial)");
  const [smiles, setSmiles] = React.useState("O=C(O)C1=CC(O)=C(C2=CC=CC=C2Cl)C(O)=C1");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<EvaluatorResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    if (!instruction.trim()) {
      setError("Please enter a chemist instruction first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/synthegy/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, smiles, instruction }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Evaluator failed to respond.");
        return;
      }
      setResult(data.result as EvaluatorResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
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

            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Target molecule
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
              {(result || error) && (
                <Button variant="outline" onClick={reset} disabled={loading}>
                  <X className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              The evaluator scores a fixed candidate route against your instruction. In production
              this is wired to your own pathway tree from the Search Orchestrator agent.
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
                  loading ? "animate-pulse bg-accent" : result ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              strategic-evaluator://run/latest
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {loading ? "reasoning" : result ? "complete" : "awaiting input"}
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

            {!error && !result && !loading && (
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

            {result && !loading && <ResultView result={result} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: EvaluatorResult }) {
  const verdictColor =
    result.verdict === "accept"
      ? "text-primary bg-primary/10 ring-primary/30"
      : result.verdict === "revise"
      ? "text-accent bg-accent/10 ring-accent/30"
      : "text-destructive bg-destructive/10 ring-destructive/30";

  return (
    <div className="space-y-5">
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
        Re-runs in &lt; 2 seconds · no filters, no rules — just natural-language reasoning.
      </div>
    </div>
  );
}
