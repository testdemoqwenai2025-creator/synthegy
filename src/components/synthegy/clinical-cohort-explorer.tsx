"use client";

import * as React from "react";
import {
  Users,
  Loader2,
  AlertCircle,
  TrendingUp,
  Activity,
  Pill,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Globe,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clinicalApi, type PatientSummary, type CohortAnalysis, type OutcomeAnalysis } from "@/lib/synthegy/clinical-api";
import { cn } from "@/lib/utils";

const OUTCOME_COLORS: Record<string, string> = {
  remission: "var(--primary)",
  low_disease_activity: "var(--chart-5)",
  moderate_activity: "var(--accent)",
  high_activity: "var(--destructive)",
};
const OUTCOME_LABELS: Record<string, string> = {
  remission: "Remission",
  low_disease_activity: "Low activity",
  moderate_activity: "Moderate",
  high_activity: "High activity",
};

const DISEASE_LABELS: Record<string, string> = {
  rheumatoid_arthritis: "Rheumatoid Arthritis",
  migraine: "Migraine",
  gout: "Gout",
  osteoarthritis: "Osteoarthritis",
  ulcerative_colitis: "Ulcerative Colitis",
  asthma: "Asthma",
};

export function ClinicalCohortExplorer() {
  const [selectedDisease, setSelectedDisease] = React.useState("rheumatoid_arthritis");
  const [patients, setPatients] = React.useState<PatientSummary[]>([]);
  const [analysis, setAnalysis] = React.useState<CohortAnalysis | null>(null);
  const [outcomes, setOutcomes] = React.useState<OutcomeAnalysis | null>(null);
  const [comparison, setComparison] = React.useState<CohortAnalysis[]>([]);
  const [govData, setGovData] = React.useState<any | null>(null);
  const [predictions, setPredictions] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"single" | "compare">("single");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      for (const dk of Object.keys(DISEASE_LABELS)) {
        await clinicalApi.generate(dk, 50).catch(() => {});
      }
      const [p, a, o, cmp, gd, pred] = await Promise.all([
        clinicalApi.listPatients(selectedDisease),
        clinicalApi.analysis(selectedDisease),
        clinicalApi.outcomes(selectedDisease),
        clinicalApi.compare(),
        clinicalApi.govData(selectedDisease).catch(() => null),
        clinicalApi.predictCohort(selectedDisease).catch(() => null),
      ]);
      setPatients(p.patients);
      setAnalysis(a.analysis);
      setOutcomes(o);
      setComparison(cmp.comparisons);
      setGovData(gd);
      setPredictions(pred);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clinical data");
    } finally {
      setLoading(false);
    }
  }, [selectedDisease]);

  React.useEffect(() => { load(); }, [load]);

  const switchDisease = async (dk: string) => {
    setSelectedDisease(dk);
    setLoading(true);
    try {
      const [p, a, o, gd, pred] = await Promise.all([
        clinicalApi.listPatients(dk),
        clinicalApi.analysis(dk),
        clinicalApi.outcomes(dk),
        clinicalApi.govData(dk).catch(() => null),
        clinicalApi.predictCohort(dk).catch(() => null),
      ]);
      setPatients(p.patients);
      setAnalysis(a.analysis);
      setOutcomes(o);
      setGovData(gd);
      setPredictions(pred);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load disease");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive ring-1 ring-destructive/30">
              <Users className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Patient cohort explorer
              </div>
              <div className="text-[11px] text-muted-foreground">
                300 synthetic patients · 6 diseases · 50-year span (1975-2025) · real government data (FDA + WHO) · 30 outliers
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          <AlertTriangle className="mr-1.5 inline h-3 w-3" />
          ALL PATIENT DATA IS SYNTHETIC. No real patient data is used. Replace the
          generator with a CSV/DB import when real data is available.
        </div>

        {/* View toggle + disease selector */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border/60 bg-muted/20 p-0.5">
            <button
              onClick={() => setView("single")}
              className={cn("rounded px-3 py-1 text-[11px] font-medium transition-colors", view === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Single disease
            </button>
            <button
              onClick={() => setView("compare")}
              className={cn("rounded px-3 py-1 text-[11px] font-medium transition-colors", view === "compare" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Globe className="mr-1 inline h-3 w-3" />
              Cross-disease comparison
            </button>
          </div>
          {view === "single" && (
            <select
              value={selectedDisease}
              onChange={(e) => switchDisease(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-primary"
            >
              {Object.entries(DISEASE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-[12px] text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-4 flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-destructive" />
          </div>
        )}

        {/* === Cross-disease comparison view === */}
        {!loading && view === "compare" && comparison.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cross-disease outcomes (300 patients across 6 diseases)
            </div>

            {/* Comparison bar chart */}
            <div className="rounded-md border border-border/60 bg-background p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Remission rate by disease (%)
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.map(c => ({ disease: (c.disease ?? "").slice(0, 15), remission: c.outcomes.remissionRate, lda: c.outcomes.ldaRate, biologicResponse: c.treatmentResponse.biologicAcr50Rate }))} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="disease" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={50} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="remission" name="Remission %" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lda" name="Low activity %" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="biologicResponse" name="Biologic ACR50 %" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-1.5 pr-3">Disease</th>
                    <th className="py-1.5 pr-3">Patients</th>
                    <th className="py-1.5 pr-3">Female %</th>
                    <th className="py-1.5 pr-3">Mean onset</th>
                    <th className="py-1.5 pr-3">Remission %</th>
                    <th className="py-1.5 pr-3">Biologic ACR50 %</th>
                    <th className="py-1.5 pr-3">Serious AEs</th>
                    <th className="py-1.5 pr-3">Outliers</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((c) => (
                    <tr key={c.diseaseKey} className="border-b border-border/40 hover:bg-muted/20">
                      <td className="py-1.5 pr-3 font-medium text-foreground">{c.disease}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{c.totalPatients}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{c.demographics.femalePct}%</td>
                      <td className="py-1.5 pr-3 tabular-nums">{c.demographics.meanAgeAtOnset}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-primary">{c.outcomes.remissionRate}%</td>
                      <td className="py-1.5 pr-3 tabular-nums">{c.treatmentResponse.biologicAcr50Rate}%</td>
                      <td className="py-1.5 pr-3 tabular-nums">{c.adverseEvents.seriousAeCount}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-accent">{c.outliers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === Single disease view === */}
        {!loading && view === "single" && analysis && outcomes && (
          <div className="mt-4 space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard icon={<Users className="h-3.5 w-3.5" />} label="Patients" value={String(analysis.totalPatients)} sub={`${analysis.outliers} outliers`} />
              <KpiCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Remission rate" value={`${analysis.outcomes.remissionRate}%`} sub="at 24 months" />
              <KpiCard icon={<Activity className="h-3.5 w-3.5" />} label="Mean onset" value={`${analysis.demographics.meanAgeAtOnset}y`} sub={`${analysis.demographics.femalePct}% female`} />
              <KpiCard icon={<Pill className="h-3.5 w-3.5" />} label="Biologic ACR50" value={`${analysis.treatmentResponse.biologicAcr50Rate}%`} sub={`${analysis.treatmentResponse.biologicTreatedCount} treated`} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-background p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Outcome distribution — {analysis.disease}
                </div>
                <div className="mt-2 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Remission", value: analysis.outcomes.remissionRate },
                          { name: "Low activity", value: analysis.outcomes.ldaRate },
                          { name: "Moderate", value: analysis.outcomes.moderateRate },
                          { name: "High activity", value: analysis.outcomes.highRate },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={(e: { name?: string; value?: number }) => `${e.name}: ${e.value}%`}
                      >
                        <Cell fill={OUTCOME_COLORS.remission} />
                        <Cell fill={OUTCOME_COLORS.low_disease_activity} />
                        <Cell fill={OUTCOME_COLORS.moderate_activity} />
                        <Cell fill={OUTCOME_COLORS.high_activity} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-md border border-border/60 bg-background p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Remission rate by diagnosis era
                </div>
                <div className="mt-2 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={outcomes.byEra} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="era" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} unit="%" />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="remissionRate" name="Remission %" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Patient table */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Patient roster — {analysis.disease} (click to expand)
              </div>
              <div className="mt-2 max-h-[400px] space-y-1 overflow-y-auto scrollbar-slim">
                {patients.map((p) => (
                  <PatientRow key={p.patientId} patient={p} />
                ))}
              </div>
            </div>

            {/* Outliers */}
            {outcomes.outliers.length > 0 && (
              <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Outlier patients ({outcomes.outliers.length})
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {outcomes.outliers.map((o) => (
                    <Badge key={o.patientId} variant="outline" className="border-accent/30 bg-accent/5 text-accent text-[10px]">
                      {o.patientId} · {o.outlierType} · {OUTCOME_LABELS[o.outcome] ?? o.outcome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* === Unified data layers: 30yr synthetic | 50yr synthetic | real govt | Null === */}
            <div className="rounded-md border border-chart-3/30 bg-chart-3/5 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-chart-3">
                Data layers — 30yr synthetic | 50yr synthetic | real government | gaps
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <div className="rounded border border-border/60 bg-background p-2">
                  <div className="text-[10px] text-muted-foreground">30yr synthetic</div>
                  <div className="font-semibold text-foreground">{analysis.diagnosisYearRange[1] - analysis.diagnosisYearRange[0] >= 25 ? "✓ 1995-2025" : "Partial"}</div>
                  <div className="text-[10px] text-muted-foreground">{analysis.totalPatients} patients</div>
                </div>
                <div className="rounded border border-border/60 bg-background p-2">
                  <div className="text-[10px] text-muted-foreground">50yr synthetic</div>
                  <div className="font-semibold text-foreground">{analysis.diagnosisYearRange[0] <= 1980 ? `✓ ${analysis.diagnosisYearRange[0]}-${analysis.diagnosisYearRange[1]}` : "Partial"}</div>
                  <div className="text-[10px] text-muted-foreground">{analysis.outliers} outliers</div>
                </div>
                <div className="rounded border border-border/60 bg-background p-2">
                  <div className="text-[10px] text-muted-foreground">Real govt data</div>
                  <div className="font-semibold text-foreground">{govData ? `${govData.totalGovRecords} records` : "Null"}</div>
                  <div className="text-[10px] text-muted-foreground">{govData?.fda_adverse_events?.length ?? 0} FDA · {govData?.who_data?.length ?? 0} WHO</div>
                </div>
                <div className="rounded border border-border/60 bg-background p-2">
                  <div className="text-[10px] text-muted-foreground">Data gaps (Null)</div>
                  <div className="font-semibold text-foreground">{govData?.null_fields?.length ?? "Null"}</div>
                  <div className="text-[10px] text-muted-foreground">{govData?.null_fields?.[0]?.slice(0, 30) ?? "No gaps"}</div>
                </div>
              </div>
            </div>

            {/* === Government data panel === */}
            {govData && (
              <div className="rounded-md border border-border/60 bg-background p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <Activity className="h-3 w-3" />
                  Real government data — FDA adverse events + WHO + drug labels
                </div>
                <div className="mt-2 space-y-2">
                  {/* FDA adverse events */}
                  {govData.fda_adverse_events?.filter((ae: any) => ae.totalAdverseEvents !== "Null").length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">FDA adverse event counts (openFDA)</div>
                      <div className="mt-1 space-y-1">
                        {govData.fda_adverse_events?.filter((ae: any) => ae.totalAdverseEvents !== "Null").slice(0, 4).map((ae: any) => (
                          <div key={ae.drug} className="flex items-center gap-2 rounded border border-border/60 bg-background px-2 py-1 text-[11px]">
                            <span className="font-medium text-foreground">{ae.drug}</span>
                            <span className="font-mono tabular-nums text-primary">{ae.totalAdverseEvents.toLocaleString()}</span>
                            <span className="text-muted-foreground">events</span>
                            {ae.topReactions?.slice(0, 2).map((r: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[9px]">{r.reaction}</Badge>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* WHO data */}
                  {govData.who_data?.length > 0 ? (
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-muted-foreground">WHO Global Health Observatory</div>
                      <div className="mt-1 space-y-1">
                        {govData.who_data.slice(0, 3).map((w: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 rounded border border-border/60 bg-background px-2 py-1 text-[11px]">
                            <span className="font-mono text-muted-foreground">{w.country}</span>
                            <span className="text-muted-foreground">{w.year}</span>
                            <span className="font-medium text-foreground">{w.value} {w.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic">WHO: Null — no specific indicators for this disease</div>
                  )}
                  {/* Null fields */}
                  {govData.null_fields?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {govData.null_fields.map((nf: string, i: number) => (
                        <Badge key={i} variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[9px]">{nf}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === Outcome prediction panel === */}
            {predictions && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <TrendingUp className="h-3 w-3" />
                  Outcome prediction model — remission probability
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded border border-border/60 bg-background p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">Mean remission prob</div>
                    <div className="text-lg font-semibold tabular-nums text-primary">{(predictions.meanRemissionProb * 100).toFixed(0)}%</div>
                  </div>
                  <div className="rounded border border-border/60 bg-background p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">Predicted</div>
                    <div className="text-lg font-semibold tabular-nums text-foreground">{predictions.totalPredicted}</div>
                  </div>
                  <div className="rounded border border-border/60 bg-background p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">High confidence</div>
                    <div className="text-lg font-semibold tabular-nums text-foreground">{predictions.highConfidenceCount}</div>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  Model factors: age at onset, sex, smoking status, BMI, treatment intensity (biologic/advanced), diagnosis era, time to first treatment
                </div>
              </div>
            )}

            {/* === CDISC + CSV import pipeline === */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/clinical/cdisc-export?disease=${selectedDisease}&XTransformPort=3005&apiKey=synthegy-demo-key`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] text-foreground transition-colors hover:border-primary/40"
              >
                <FileText className="h-3.5 w-3.5" />
                CDISC SDTM export
              </a>
              <span className="text-[10px] text-muted-foreground">
                Regulatory-ready format (DM + AE + VS domains) · FDA submission standard
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}<span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span></div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function PatientRow({ patient }: { patient: PatientSummary }) {
  const [expanded, setExpanded] = React.useState(false);
  const [fullPatient, setFullPatient] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadFull = async () => {
    if (fullPatient) { setExpanded(!expanded); return; }
    setLoading(true);
    try {
      const res = await clinicalApi.getPatient(patient.patientId);
      setFullPatient(res.patient);
      setExpanded(true);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const outcomeColor = OUTCOME_COLORS[patient.outcome24m] ?? "var(--muted-foreground)";
  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background">
      <button onClick={loadFull} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/30">
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        <span className="font-mono text-[11px] text-muted-foreground">{patient.patientId}</span>
        <span className="text-[11px] text-muted-foreground">Dx {patient.diagnosisYear}</span>
        <span className="text-[11px] text-muted-foreground">{patient.sex}</span>
        <span className="text-[11px] text-muted-foreground">onset {patient.ageAtOnset}</span>
        <span className="text-[11px] text-muted-foreground">{patient.treatmentCount} tx</span>
        <div className="ml-auto flex items-center gap-2">
          {patient.isOutlier && (
            <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent text-[9px]">
              {patient.outlierType}
            </Badge>
          )}
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: outcomeColor }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: outcomeColor }} />
            {OUTCOME_LABELS[patient.outcome24m] ?? patient.outcome24m}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{patient.primaryMetric}: {patient.score24m}</span>
        </div>
      </button>
      {expanded && fullPatient && (
        <div className="border-t border-border/60 bg-muted/10 p-3">
          <div className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
            <div><span className="text-muted-foreground">Target:</span> <span className="text-foreground">{fullPatient.target}</span></div>
            <div><span className="text-muted-foreground">ICD-10:</span> <span className="font-mono text-foreground">{fullPatient.icd10}</span></div>
            <div><span className="text-muted-foreground">BMI:</span> <span className="text-foreground">{fullPatient.bmi}</span></div>
            <div><span className="text-muted-foreground">Smoker:</span> <span className={fullPatient.smoker ? "text-destructive" : "text-muted-foreground"}>{fullPatient.smoker ? "Yes" : "No"}</span></div>
          </div>

          {/* Biomarkers */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(fullPatient.biomarkers).map(([k, v]) => (
              <Badge key={k} variant="outline" className={typeof v === "boolean" && v ? "border-primary/30 bg-primary/5 text-primary text-[9px]" : "text-[9px]"}>
                {k}: {typeof v === "boolean" ? (v ? "+" : "−") : String(v)}
              </Badge>
            ))}
          </div>

          {/* Treatment sequence */}
          <div className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Treatment sequence</div>
            <div className="mt-1 space-y-1">
              {fullPatient.treatments.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded border border-border/60 bg-background px-2 py-1 text-[11px]">
                  <span className="font-mono text-muted-foreground">M{t.startMonth}</span>
                  <span className="font-medium text-foreground">{t.drug}</span>
                  <Badge variant="outline" className="text-[9px]">{t.class}</Badge>
                  <span className="ml-auto text-muted-foreground">{t.durationMonths}mo</span>
                  <span className={cn("text-[10px]", t.response === "ACR50" || t.response === "ACR70" ? "text-primary" : t.response === "none" ? "text-destructive" : "text-accent")}>
                    {t.response}
                  </span>
                  {t.adverseEvent && <Badge variant="outline" className="border-destructive/30 text-destructive text-[9px]">AE: {t.adverseEvent}</Badge>}
                </div>
              ))}
            </div>
          </div>

          {fullPatient.adverseEvents.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {fullPatient.adverseEvents.map((ae: string, i: number) => (
                <Badge key={i} variant="outline" className="border-destructive/30 bg-destructive/5 text-destructive text-[9px]">{ae}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
      {loading && (
        <div className="border-t border-border/60 bg-muted/10 p-2 text-center">
          <Loader2 className="mx-auto h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
