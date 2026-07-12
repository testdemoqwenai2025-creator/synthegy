"use client";

import * as React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Loader2,
  BookOpen,
  ExternalLink,
  Quote,
  TrendingUp,
  Pill,
  Brain,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ordApi, type AdmetResult, type LiteratureResult } from "@/lib/synthegy/ord-api";
import { cn } from "@/lib/utils";

interface CompoundIntelligenceProps {
  smiles: string;
  name?: string;
}

export function CompoundIntelligence({ smiles, name }: CompoundIntelligenceProps) {
  const [admet, setAdmet] = React.useState<AdmetResult | null>(null);
  const [lit, setLit] = React.useState<LiteratureResult | null>(null);
  const [loadingAdmet, setLoadingAdmet] = React.useState(false);
  const [loadingLit, setLoadingLit] = React.useState(false);
  const [admetError, setAdmetError] = React.useState<string | null>(null);
  const [litError, setLitError] = React.useState<string | null>(null);

  // Auto-fetch ADMET + literature whenever the SMILES changes.
  React.useEffect(() => {
    if (!smiles.trim()) return;
    let cancelled = false;
    setLoadingAdmet(true);
    setLoadingLit(true);
    setAdmetError(null);
    setLitError(null);
    setAdmet(null);
    setLit(null);

    ordApi
      .admet(smiles)
      .then((r) => { if (!cancelled) setAdmet(r); })
      .catch((e) => { if (!cancelled) setAdmetError(e instanceof Error ? e.message : "ADMET failed"); })
      .finally(() => { if (!cancelled) setLoadingAdmet(false); });

    const litQuery = name ? `${name} synthesis` : `${smiles} synthesis`;
    ordApi
      .literature(litQuery, 3)
      .then((r) => { if (!cancelled) setLit(r); })
      .catch((e) => { if (!cancelled) setLitError(e instanceof Error ? e.message : "Literature search failed"); })
      .finally(() => { if (!cancelled) setLoadingLit(false); });

    return () => { cancelled = true; };
  }, [smiles, name]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <AdmetCard loading={loadingAdmet} result={admet} error={admetError} smiles={smiles} />
      <LiteratureCard loading={loadingLit} result={lit} error={litError} />
    </div>
  );
}

// =========================================================================
// ADMET card
// =========================================================================

function AdmetCard({
  loading,
  result,
  error,
  smiles,
}: {
  loading: boolean;
  result: AdmetResult | null;
  error: string | null;
  smiles: string;
}) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
            <Pill className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">
              ADMET profile
            </div>
            <div className="text-[11px] text-muted-foreground">
              Computed via RDKit — Lipinski, Veber, BBB, PAINS alerts
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-4 flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive">
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="mt-4 space-y-3">
            {/* Drug-likeness score */}
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Drug-likeness score
                </span>
                <span
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    result.verdict === "excellent" && "text-primary",
                    result.verdict === "good" && "text-primary",
                    result.verdict === "marginal" && "text-accent",
                    result.verdict === "poor" && "text-destructive"
                  )}
                >
                  {result.drugLikenessScore.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 text-[12px] capitalize text-foreground">
                {result.verdict}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    result.verdict === "excellent" || result.verdict === "good"
                      ? "bg-primary"
                      : result.verdict === "marginal"
                      ? "bg-accent"
                      : "bg-destructive"
                  )}
                  style={{ width: `${result.drugLikenessScore * 100}%` }}
                />
              </div>
            </div>

            {/* Rule results */}
            <div className="grid grid-cols-1 gap-1.5">
              <RuleRow
                label="Lipinski Rule of 5"
                pass={result.rules.lipinski.pass}
                note={result.rules.lipinski.note}
              />
              <RuleRow
                label="Veber (oral bioavailability)"
                pass={result.rules.veber.pass}
                note={result.rules.veber.note}
              />
              <RuleRow
                label="BBB permeability"
                pass={result.rules.bbbPermeable.pass}
                note={result.rules.bbbPermeable.note}
                icon={Brain}
              />
              <RuleRow
                label="Lead-like"
                pass={result.rules.leadLike.pass}
                note={result.rules.leadLike.note}
              />
              <RuleRow
                label="Fragment-like"
                pass={result.rules.fragmentLike.pass}
                note={result.rules.fragmentLike.note}
              />
            </div>

            {/* PAINS alerts */}
            {result.alerts.pains.length > 0 && (
              <div className="rounded-md border border-accent/30 bg-accent/5 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
                  <AlertTriangle className="h-3 w-3" />
                  PAINS alerts ({result.alerts.pains.length})
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.alerts.pains.map((p) => (
                    <span key={p} className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-accent">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Descriptors grid */}
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border/60 bg-border/40">
              {[
                { label: "MW", value: result.descriptors.molecularWeight },
                { label: "cLogP", value: result.descriptors.clogP },
                { label: "TPSA", value: result.descriptors.tpsa },
                { label: "HBD", value: result.descriptors.hBondDonors },
                { label: "HBA", value: result.descriptors.hBondAcceptors },
                { label: "RotB", value: result.descriptors.rotatableBonds },
                { label: "Heavy", value: result.descriptors.heavyAtoms },
                { label: "Rings", value: result.descriptors.rings },
                { label: "SA score", value: result.alerts.syntheticAccessibility },
              ].map((d) => (
                <div key={d.label} className="bg-card px-2 py-1.5 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">{d.label}</div>
                  <div className="text-[12px] font-medium tabular-nums text-foreground">
                    {typeof d.value === "number" ? d.value.toFixed(d.label === "SA score" ? 0 : d.value < 10 ? 1 : 0) : d.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RuleRow({
  label,
  pass,
  note,
  icon: Icon,
}: {
  label: string;
  pass: boolean;
  note: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5">
      {pass ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[12px] font-medium text-foreground">
          {Icon && <Icon className="h-3 w-3" />}
          {label}
        </div>
      </div>
      <span className={cn("text-[10px]", pass ? "text-primary" : "text-muted-foreground")}>
        {pass ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}

// =========================================================================
// Literature card
// =========================================================================

function LiteratureCard({
  loading,
  result,
  error,
}: {
  loading: boolean;
  result: LiteratureResult | null;
  error: string | null;
}) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/30">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Literature confidence
            </div>
            <div className="text-[11px] text-muted-foreground">
              From Europe PMC — 40M+ biomedical citations
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-4 flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive">
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="mt-4 space-y-3">
            {/* Confidence score */}
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Literature confidence
                </span>
                <span
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    result.confidenceScore >= 0.85 && "text-primary",
                    result.confidenceScore >= 0.5 && result.confidenceScore < 0.85 && "text-accent",
                    result.confidenceScore < 0.5 && "text-muted-foreground"
                  )}
                >
                  {(result.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 text-[12px] text-foreground">
                {result.totalHits.toLocaleString()} papers mention{" "}
                <span className="font-mono">&ldquo;{result.query}&rdquo;</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    result.confidenceScore >= 0.85 ? "bg-primary" : "bg-accent"
                  )}
                  style={{ width: `${result.confidenceScore * 100}%` }}
                />
              </div>
            </div>

            {/* Top papers */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Top papers (by citation count)
              </div>
              <div className="mt-2 space-y-2">
                {result.papers.map((p, i) => (
                  <div
                    key={p.pmid ?? p.doi ?? i}
                    className="rounded-md border border-border/60 bg-background p-2.5"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        #{i + 1}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {p.citedByCount.toLocaleString()} citations
                      </span>
                      {p.pubYear && (
                        <span className="text-[10px] text-muted-foreground">{p.pubYear}</span>
                      )}
                      {p.journalTitle && (
                        <span className="truncate text-[10px] italic text-muted-foreground">
                          {p.journalTitle}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[12px] leading-snug text-foreground">
                      {p.title.replace(/<[^>]+>/g, "")}
                    </div>
                    {p.europepmcUrl && (
                      <a
                        href={p.europepmcUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-accent hover:underline"
                      >
                        View on Europe PMC
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
