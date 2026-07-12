"use client";

import {
  Monitor,
  ArrowDown,
  Shield,
  Gauge,
  ScrollText,
  Server,
  Database,
  Cpu,
  Lock,
  Atom,
  Activity,
  FlaskRound,
  BookOpen,
  Microscope,
  Network,
  FileText,
  Users,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FRONTEND_FEATURES = [
  { label: "Next.js 16 App Router", note: "SSR + client islands" },
  { label: "Typed API client", note: "src/lib/synthegy/api.ts" },
  { label: "Session-aware UI", note: "localStorage + auto-resume" },
  { label: "shadcn/ui + framer-motion", note: "console-grade UX" },
];

const MIDDLEWARE_FEATURES = [
  { icon: ScrollText, label: "Request logger", note: "structured logs + request id" },
  { icon: Lock, label: "API-key auth", note: "x-api-key header / ?apiKey=" },
  { icon: Gauge, label: "Rate limiter", note: "token bucket, 20/min/IP" },
  { icon: Shield, label: "Error handler", note: "structured JSON, no stack leaks" },
];

const BACKEND_FEATURES = [
  { icon: Server, label: "Bun + Hono", note: "port 3001" },
  { icon: Database, label: "SQLite (bun:sqlite)", note: "sessions + runs + audit" },
  { icon: Cpu, label: "LLM Strategic Evaluator", note: "z-ai-web-dev-sdk" },
  { icon: ScrollText, label: "REST: /api/* ", note: "scenarios, sessions, evaluate" },
];

const MOLECULE_FEATURES = [
  { icon: Server, label: "Bun + Hono", note: "port 3002" },
  { icon: Database, label: "SQLite cache", note: "30-day TTL on properties" },
  { icon: Atom, label: "PubChem PUG REST", note: "124M compounds · substructure + property filter" },
  { icon: Activity, label: "ChEMBL REST API", note: "2.4M bioactive · mechanisms + IC50/Ki" },
];

const ORD_FEATURES = [
  { icon: Server, label: "Bun + Hono + Python", note: "port 3003" },
  { icon: Database, label: "SQLite cache", note: "30-day TTL on reactions + ADMET" },
  { icon: FlaskRound, label: "Open Reaction Database", note: "550+ datasets, 100K+ real reactions" },
  { icon: BookOpen, label: "Europe PMC", note: "40M+ biomedical citations · literature confidence" },
];

const BIO_FEATURES = [
  { icon: Server, label: "Bun + Hono", note: "port 3004" },
  { icon: Microscope, label: "RCSB PDB", note: "220K+ 3D protein structures" },
  { icon: Network, label: "Knowledge graph", note: "KEGG pathways + OpenTargets diseases" },
  { icon: FileText, label: "Google Patents", note: "100M+ patents · free search" },
];

const CLINICAL_FEATURES = [
  { icon: Server, label: "Bun + Python", note: "port 3005" },
  { icon: Users, label: "6 disease cohorts", note: "300 synthetic patients · RA, migraine, gout, OA, UC, asthma" },
  { icon: Activity, label: "Cohort analysis", note: "outcomes, biomarkers, response rates, cross-disease" },
  { icon: TrendingUp, label: "Outcome trends", note: "by diagnosis era (1995-2025) · 30 outliers" },
];

export function Architecture() {
  return (
    <section
      id="architecture"
      className="relative scroll-mt-24 border-t border-border/40 py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-chart-3/30 bg-chart-3/5 text-chart-3">
            Seven-tier architecture
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Seven tiers, ten data sources, one reasoning platform — bench to bedside
          </h2>
          <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
            Synthegy now spans seven tiers: the LLM Strategic Evaluator with active-learning
            feedback loop (port 3001), a PubChem + ChEMBL molecule service (port 3002), an
            experimental-data service wrapping ORD + RDKit ADMET + Europe PMC (port 3003), a
            biological-intelligence service connecting RCSB PDB + KEGG + OpenTargets + Google
            Patents (port 3004), and a clinical cohort service with 50 synthetic RA patients
            on a 30-year epidemiological basis (port 3005) — ready to swap for real patient
            data via CSV import.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {/* Frontend tier */}
          <TierCard
            tier="01"
            title="Frontend"
            subtitle="Next.js 16 · port 3000"
            icon={Monitor}
            accent="primary"
            features={FRONTEND_FEATURES}
          />

          {/* Middleware tier */}
          <TierCard
            tier="02"
            title="Middleware"
            subtitle="Hono · gateway layer"
            icon={Shield}
            accent="accent"
            features={MIDDLEWARE_FEATURES.map((f) => ({
              label: f.label,
              note: f.note,
              icon: f.icon,
            }))}
          />

          {/* Backend tier */}
          <TierCard
            tier="03"
            title="Backend"
            subtitle="Bun + Hono · port 3001"
            icon={Server}
            accent="chart3"
            features={BACKEND_FEATURES.map((f) => ({
              label: f.label,
              note: f.note,
              icon: f.icon,
            }))}
          />

          {/* Molecule tier */}
          <TierCard
            tier="04"
            title="Molecule"
            subtitle="Bun + Hono · port 3002"
            icon={Atom}
            accent="primary"
            features={MOLECULE_FEATURES.map((f) => ({
              label: f.label,
              note: f.note,
              icon: f.icon,
            }))}
          />

          {/* Experimental data tier */}
          <TierCard
            tier="05"
            title="Experimental"
            subtitle="Bun + Python · port 3003"
            icon={FlaskRound}
            accent="accent"
            features={ORD_FEATURES.map((f) => ({
              label: f.label,
              note: f.note,
              icon: f.icon,
            }))}
          />

          {/* Biological intelligence tier */}
          <TierCard
            tier="06"
            title="Biological"
            subtitle="Bun + Hono · port 3004"
            icon={Microscope}
            accent="chart3"
            features={BIO_FEATURES.map((f) => ({
              label: f.label,
              note: f.note,
              icon: f.icon,
            }))}
          />

          {/* Clinical cohort tier */}
          <TierCard
            tier="07"
            title="Clinical"
            subtitle="Bun + Python · port 3005"
            icon={Users}
            accent="primary"
            features={CLINICAL_FEATURES.map((f) => ({
              label: f.label,
              note: f.note,
              icon: f.icon,
            }))}
          />
        </div>

        {/* Request flow */}
        <Card className="mt-6 border-border/60 bg-card">
          <CardContent className="p-5">
            <div className="text-sm font-semibold text-foreground">Request flow</div>
            <div className="mt-3 flex flex-col items-stretch gap-2 text-[12px] sm:flex-row sm:items-center">
              <FlowStep
                step="Browser"
                detail="chemist clicks Run evaluator"
                color="primary"
              />
              <FlowArrow />
              <FlowStep
                step="Caddy gateway"
                detail="?XTransformPort=3001"
                color="accent"
              />
              <FlowArrow />
              <FlowStep
                step="Middleware chain"
                detail="logger → auth → rate-limit"
                color="accent"
              />
              <FlowArrow />
              <FlowStep
                step="Hono router"
                detail="POST /api/evaluate"
                color="chart3"
              />
              <FlowArrow />
              <FlowStep
                step="LLM + SQLite"
                detail="persist run, return JSON"
                color="chart3"
              />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              The same chain runs for <code className="font-mono text-foreground">/api/sessions</code>,{" "}
              <code className="font-mono text-foreground">/api/scenarios</code>, and{" "}
              <code className="font-mono text-foreground">/api/use-cases</code>. Health checks
              (<code className="font-mono text-foreground">/health</code>) bypass auth and rate
              limits for smoke tests.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function TierCard({
  tier,
  title,
  subtitle,
  icon: Icon,
  accent,
  features,
}: {
  tier: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accent: "primary" | "accent" | "chart3";
  features: { label: string; note: string; icon?: React.ElementType }[];
}) {
  const ring =
    accent === "primary"
      ? "ring-primary/30 bg-primary/5 text-primary"
      : accent === "accent"
      ? "ring-accent/30 bg-accent/5 text-accent"
      : "ring-chart-3/30 bg-chart-3/5 text-chart-3";
  const bar =
    accent === "primary" ? "bg-primary" : accent === "accent" ? "bg-accent" : "bg-chart-3";

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card">
      <div className={`h-1 w-full ${bar}`} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${ring}`}>
            <Icon className="h-5 w-5" />
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">tier {tier}</span>
        </div>
        <div className="mt-4">
          <div className="text-base font-semibold text-foreground">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        <ul className="mt-4 space-y-2.5">
          {features.map((f, i) => {
            const FIcon = f.icon;
            return (
              <li key={i} className="flex items-start gap-2">
                {FIcon ? (
                  <FIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                )}
                <div>
                  <div className="text-[12px] font-medium text-foreground">{f.label}</div>
                  <div className="text-[11px] text-muted-foreground">{f.note}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function FlowStep({
  step,
  detail,
  color,
}: {
  step: string;
  detail: string;
  color: "primary" | "accent" | "chart3";
}) {
  const cls =
    color === "primary"
      ? "border-primary/30 bg-primary/5 text-primary"
      : color === "accent"
      ? "border-accent/30 bg-accent/5 text-accent"
      : "border-chart-3/30 bg-chart-3/5 text-chart-3";
  return (
    <div className={`flex-1 rounded-md border px-3 py-2 ${cls}`}>
      <div className="text-[12px] font-semibold">{step}</div>
      <div className="font-mono text-[10px] opacity-80">{detail}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center px-1 py-1 text-muted-foreground sm:px-2">
      <ArrowDown className="h-3.5 w-3.5 sm:hidden" />
      <span className="hidden sm:inline">→</span>
    </div>
  );
}
