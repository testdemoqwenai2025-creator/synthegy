"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Pill, Atom, Leaf, FlaskConical, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { USE_CASES, type UseCase } from "@/lib/synthegy/data";
import { cn } from "@/lib/utils";

const SECTOR_META: Record<
  UseCase["sector"],
  { icon: React.ElementType; accent: string; ring: string; bg: string }
> = {
  Pharmaceuticals: {
    icon: Pill,
    accent: "text-primary",
    ring: "ring-primary/30",
    bg: "bg-primary/5",
  },
  "Materials Science": {
    icon: Atom,
    accent: "text-accent",
    ring: "ring-accent/30",
    bg: "bg-accent/5",
  },
  Agrochemicals: {
    icon: Leaf,
    accent: "text-chart-5",
    ring: "ring-chart-5/30",
    bg: "bg-chart-5/5",
  },
  "Fine Chemicals": {
    icon: FlaskConical,
    accent: "text-chart-3",
    ring: "ring-chart-3/30",
    bg: "bg-chart-3/5",
  },
};

const FILTERS: ("All" | UseCase["sector"])[] = [
  "All",
  "Pharmaceuticals",
  "Materials Science",
  "Agrochemicals",
  "Fine Chemicals",
];

export function UseCases() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("All");
  const filtered = React.useMemo(
    () => (filter === "All" ? USE_CASES : USE_CASES.filter((u) => u.sector === filter)),
    [filter]
  );

  return (
    <section id="cases" className="relative scroll-mt-24 border-t border-border/40 bg-muted/15 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              Field deployment
            </Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Where Synthegy is already moving the needle
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
              Six illustrative deployments across pharmaceuticals, materials, agrochemicals and fine
              chemicals — each shows the same pattern: strategy-aware reasoning catches what
              rule-based pipelines miss, and ships a route the bench team can actually use.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/60 bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((uc, idx) => {
            const meta = SECTOR_META[uc.sector];
            const Icon = meta.icon;
            return (
              <motion.div
                key={uc.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <Card className="group h-full overflow-hidden border-border/60 bg-card transition-colors hover:border-primary/40">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1",
                          meta.bg,
                          meta.accent,
                          meta.ring
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        {uc.sector}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold leading-snug text-foreground">
                      {uc.title}
                    </h3>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                      {uc.summary}
                    </p>
                    <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Outcome
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-foreground">
                        {uc.outcome}
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
                      {uc.metrics.map((m) => (
                        <div key={m.label}>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {m.label}
                          </div>
                          <div className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground">
                            {m.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-[12px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Read deployment notes
                      <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
