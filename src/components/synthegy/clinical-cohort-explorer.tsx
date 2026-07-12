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
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clinicalApi, type PatientSummary, type CohortAnalysis, type OutcomeAnalysis, type PatientFull } from "@/lib/synthegy/clinical-api";
import { cn } from "@/lib/utils";

const OUTCOME_COLORS: Record<string, string> = {
  remission: "var(--primary)",
  low_disease_activity: "var(--chart-5)",
  moderate_activity: "var(--accent)",
  high_activity: "var(--destructive)",
};

const OUTCOME_LABELS: Record<string, string> = {
  remission: "Remission",
  low_disease_activity: "Low disease activity",
  moderate_activity: "Moderate activity",
  high_activity: "High activity",
};

export function ClinicalCohortExplorer() {
  const [patients, setPatients] = React.useState<PatientSummary[]>([]);
  const [analysis, setAnalysis] = React.useState<CohortAnalysis | null>(null);
  const [outcomes, setOutcomes] = React.useState<OutcomeAnalysis | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure cohort is generated
      await clinicalApi.generate(50).catch(() => {}); // ignore if already exists
      const [p, a, o] = await Promise.all([
        clinicalApi.listPatients(),
        clinicalApi.analysis(),
        clinicalApi.outcomes(),
      ]);
      setPatients(p.patients);
      setAnalysis(a.analysis);
      setOutcomes(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clinical data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const regenerate = async () => {
    setLoading(true);
    try {
      await clinicalApi.generate(50);
      // Need to force regenerate — call generate with force
      const res = await fetch(`/api/clinical/generate?n=50&force=true&XTransformPort=3005`, {
        method: "POST",
        headers: { "x-api-key": "synthegy-demo-key" },
      });
      await res.json();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed");
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
                50 synthetic RA patients · 30-year epidemiological basis · 5 outliers
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={regenerate} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          <AlertTriangle className="mr-1.5 inline h-3 w-3" />
          ALL PATIENT DATA IS SYNTHETIC. No real patient data is used. This pipeline
          is designed for development — when real data is available, swap the generator
          for a CSV/DB import and the analysis stays identical.
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

        {!loading && analysis && outcomes && (
          <div className="mt-4 space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard icon={<Users className="h-3.5 w-3.5" />} label="Patients" value={String(analysis.totalPatients)} sub={`${analysis.outliers} outliers`} />
              <KpiCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Remission rate" value={`${analysis.outcomes.remissionRate}%`} sub="at 24 months" />
              <KpiCard icon={<Activity className="h-3.5 w-3.5" />} label="ACPA positive" value={`${analysis.biomarkers.acpaPositivePct}%`} sub="biomarker" />
              <KpiCard icon={<Pill className="h-3.5 w-3.5" />} label="Biologic ACR50" value={`${analysis.treatmentResponse.biologicAcr50Rate}%`} sub={`${analysis.treatmentResponse.biologicTreatedCount} treated`} />
            </div>

            {/* Outcome distribution chart */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md border border-border/60 bg-background p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Outcome distribution (24 months)
                </div>
                <div className="mt-2 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Remission", value: analysis.outcomes.remissionRate, key: "remission" },
                          { name: "Low activity", value: analysis.outcomes.ldaRate, key: "low_disease_activity" },
                          { name: "Moderate", value: analysis.outcomes.moderateRate, key: "moderate_activity" },
                          { name: "High activity", value: analysis.outcomes.highRate, key: "high_activity" },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={(e: { name?: string; value?: number }) => `${e.name}: ${e.value}%`}
                      >
                        {[
                          { key: "remission", color: OUTCOME_COLORS.remission },
                          { key: "low_disease_activity", color: OUTCOME_COLORS.low_disease_activity },
                          { key: "moderate_activity", color: OUTCOME_COLORS.moderate_activity },
                          { key: "high_activity", color: OUTCOME_COLORS.high_activity },
                        ].map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Outcome by era chart */}
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
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                      />
                      <Bar dataKey="remissionRate" name="Remission %" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Biomarker correlation */}
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Biomarker correlation with remission
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">ACPA+</Badge>
                  <span className="text-foreground">
                    {outcomes.biomarkerCorrelation.acpaPositive.remissionRate}% remission
                    <span className="text-muted-foreground"> ({outcomes.biomarkerCorrelation.acpaPositive.count} pts)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-muted-foreground/30 bg-muted/20 text-muted-foreground">ACPA−</Badge>
                  <span className="text-foreground">
                    {outcomes.biomarkerCorrelation.acpaNegative.remissionRate}% remission
                    <span className="text-muted-foreground"> ({outcomes.biomarkerCorrelation.acpaNegative.count} pts)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Patient table */}
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Patient roster (click to expand)
              </div>
              <div className="mt-2 max-h-[400px] space-y-1 overflow-y-auto scrollbar-slim">
                {patients.map((p) => (
                  <PatientRow key={p.patientId} patient={p} />
                ))}
              </div>
            </div>

            {/* Outliers */}
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
  const [fullPatient, setFullPatient] = React.useState<PatientFull | null>(null);
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
        <span className="text-[11px] text-muted-foreground">age {patient.ageAtOnset}</span>
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
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">DAS28 {patient.das28_24m}</span>
        </div>
      </button>
      {expanded && fullPatient && (
        <div className="border-t border-border/60 bg-muted/10 p-3">
          <div className="grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-4">
            <div><span className="text-muted-foreground">ACPA:</span> <span className={fullPatient.biomarkers.acpaPositive ? "text-primary" : "text-muted-foreground"}>{fullPatient.biomarkers.acpaPositive ? "Positive" : "Negative"}</span></div>
            <div><span className="text-muted-foreground">RF:</span> <span className={fullPatient.biomarkers.rfPositive ? "text-primary" : "text-muted-foreground"}>{fullPatient.biomarkers.rfPositive ? "Positive" : "Negative"}</span></div>
            <div><span className="text-muted-foreground">CRP at dx:</span> <span className="text-foreground">{fullPatient.biomarkers.crpAtDiagnosis} mg/L</span></div>
            <div><span className="text-muted-foreground">DAS28 at dx:</span> <span className="text-foreground">{fullPatient.biomarkers.das28AtDiagnosis}</span></div>
            <div><span className="text-muted-foreground">Tender joints:</span> <span className="text-foreground">{fullPatient.biomarkers.tenderJointCount}</span></div>
            <div><span className="text-muted-foreground">Swollen joints:</span> <span className="text-foreground">{fullPatient.biomarkers.swollenJointCount}</span></div>
            <div><span className="text-muted-foreground">BMI:</span> <span className="text-foreground">{fullPatient.bmi}</span></div>
            <div><span className="text-muted-foreground">Smoker:</span> <span className={fullPatient.smoker ? "text-destructive" : "text-muted-foreground"}>{fullPatient.smoker ? "Yes" : "No"}</span></div>
          </div>

          <div className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Treatment sequence</div>
            <div className="mt-1 space-y-1">
              {fullPatient.treatments.map((t, i) => (
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
              {fullPatient.adverseEvents.map((ae, i) => (
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
