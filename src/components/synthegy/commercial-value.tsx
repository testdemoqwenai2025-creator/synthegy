"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Calculator, TrendingUp, Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { COMMERCIAL_PARAMS } from "@/lib/synthegy/data";

type ParamValues = Record<string, number>;

export function CommercialValue() {
  const [values, setValues] = React.useState<ParamValues>(() => {
    const init: ParamValues = {};
    for (const p of COMMERCIAL_PARAMS) init[p.label] = p.defaultValue;
    return init;
  });

  const set = (label: string, v: number) =>
    setValues((prev) => ({ ...prev, [label]: v }));

  const calc = React.useMemo(() => {
    const projects = values["Annual route-design projects"];
    const hoursPerProject = values["Avg. chemist-hours per project"];
    const costPerHour = values["Loaded chemist cost"];
    const timeReductionPct = values["Synthegy time reduction"];
    const failureAvoidancePct = values["Failed-route avoidance"];
    const costPerFailure = values["Avg. cost of a late failure"];

    const baselineLaborCost = projects * hoursPerProject * costPerHour;
    const laborSavings = baselineLaborCost * (timeReductionPct / 100);

    const failuresAvoided = projects * (failureAvoidancePct / 100);
    const failureSavings = failuresAvoided * costPerFailure;

    const totalAnnualSavings = laborSavings + failureSavings;

    // 3-year cumulative, conservative 8% annual ramp on adoption.
    const ramp = [0.4, 0.75, 1.0];
    const cumulative = ramp.reduce((acc, r) => acc + totalAnnualSavings * r, 0);

    return {
      baselineLaborCost,
      laborSavings,
      failuresAvoided,
      failureSavings,
      totalAnnualSavings,
      cumulative,
      hoursSaved: projects * hoursPerProject * (timeReductionPct / 100),
    };
  }, [values]);

  const chartData = [
    { name: "Baseline", Labor: calc.baselineLaborCost, Failure: 0, fill: "var(--muted-foreground)" },
    {
      name: "With Synthegy",
      Labor: calc.baselineLaborCost - calc.laborSavings,
      Failure: Math.max(0, calc.failureSavings),
      fill: "var(--primary)",
    },
  ];

  const cumulativeData = [
    { year: "Year 1", savings: calc.totalAnnualSavings * 0.4 },
    { year: "Year 2", savings: calc.totalAnnualSavings * 0.75 },
    { year: "Year 3", savings: calc.totalAnnualSavings * 1.0 },
  ];

  return (
    <section id="commercial" className="relative scroll-mt-24 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">
            <Calculator className="mr-1.5 h-3 w-3" />
            Commercial value model
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            What &ldquo;strategy-aware&rdquo; is worth on your P&amp;L
          </h2>
          <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
            Synthegy pays back through two channels: faster route evaluation (chemist time
            reclaimed) and earlier failure detection (late-stage routes caught before they burn
            budget). Adjust the sliders to match your portfolio.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Sliders */}
          <div className="lg:col-span-5">
            <Card className="border-border/60 bg-card">
              <CardContent className="space-y-6 p-5">
                {COMMERCIAL_PARAMS.map((p) => (
                  <div key={p.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <label className="text-[12px] font-medium text-foreground">{p.label}</label>
                      <span className="font-mono text-[12px] text-primary">
                        {formatValue(values[p.label], p.unit)}
                      </span>
                    </div>
                    <Slider
                      value={[values[p.label]]}
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      onValueChange={(v) => set(p.label, v[0])}
                      className="mt-2"
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Outputs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Headline KPIs */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Annual savings"
                value={money(calc.totalAnnualSavings)}
                accent="primary"
              />
              <KpiCard
                icon={<Clock className="h-4 w-4" />}
                label="Chemist hours / yr"
                value={Math.round(calc.hoursSaved).toLocaleString()}
                accent="accent"
              />
              <KpiCard
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Late failures caught"
                value={calc.failuresAvoided.toFixed(0)}
                accent="primary"
              />
              <KpiCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="3-yr cumulative"
                value={money(calc.cumulative)}
                accent="accent"
              />
            </div>

            {/* Charts */}
            <Card className="border-border/60 bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      Annual cost — baseline vs. Synthegy
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Labor + late-failure exposure, ${" "}
                      {money(calc.baselineLaborCost)} baseline
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                        formatter={(v: number) => money(v)}
                      />
                      <Bar dataKey="Labor" stackId="a" name="Labor cost" radius={[0, 0, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="Failure"
                        stackId="a"
                        name="Failure exposure"
                        fill="var(--accent)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card">
              <CardContent className="p-5">
                <div className="text-sm font-semibold text-foreground">
                  Cumulative savings ramp (3 years)
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Conservative adoption curve — 40 / 75 / 100% of portfolio in years 1 / 2 / 3.
                </div>
                <div className="mt-4 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="year"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "var(--foreground)",
                        }}
                        formatter={(v: number) => money(v)}
                      />
                      <Area
                        type="monotone"
                        dataKey="savings"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#savingsGrad)"
                        name="Annual savings"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "primary" | "accent";
}) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-4">
        <div
          className={
            "inline-flex h-7 w-7 items-center justify-center rounded-md ring-1 " +
            (accent === "primary"
              ? "bg-primary/10 text-primary ring-primary/30"
              : "bg-accent/10 text-accent ring-accent/30")
          }
        >
          {icon}
        </div>
        <div className="mt-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function formatValue(v: number, unit: string) {
  if (unit.startsWith("$")) {
    return `$${v.toLocaleString()}`;
  }
  if (unit === "%") return `${v}%`;
  return `${v.toLocaleString()} ${unit}`;
}

function money(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}
