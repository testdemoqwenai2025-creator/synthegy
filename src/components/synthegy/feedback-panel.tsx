"use client";

import * as React from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Loader2,
  Brain,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/synthegy/api";
import { cn } from "@/lib/utils";

export function FeedbackPanel({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = React.useState<{
    totalFeedback: number;
    bySignal: Record<string, number>;
    agreementRate: number;
    correlation: Array<{ chemistSignal: string; evaluatorVerdict: string; count: number; avgScore: number }>;
  } | null>(null);
  const [profile, setProfile] = React.useState<{
    totalFeedback: number;
    accepted: number;
    revised: number;
    rejected: number;
    avgAcceptedScore: number;
    avgRevisedScore: number;
    acceptedKeywords: string[];
    revisedKeywords: string[];
    insights: string[];
    profile: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([api.feedbackStats(), api.feedbackProfile()]);
      setStats(s);
      setProfile(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/30">
              <Brain className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Active learning feedback loop
              </div>
              <div className="text-[11px] text-muted-foreground">
                Record accept/revise signals on evaluator runs — the system learns chemist preferences
              </div>
            </div>
          </div>
          {stats && stats.totalFeedback > 0 && (
            <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">
              {stats.totalFeedback} signal{stats.totalFeedback === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {loading && (
          <div className="mt-4 flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        )}

        {!loading && stats && profile && stats.totalFeedback === 0 && (
          <div className="mt-4 rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center text-[12px] text-muted-foreground">
            No feedback recorded yet. Run the Strategic Evaluator above, then use the
            accept/revise buttons on each run in the session history to start building
            a preference profile.
          </div>
        )}

        {!loading && stats && profile && stats.totalFeedback > 0 && (
          <div className="mt-4 space-y-4">
            {/* Agreement rate */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox
                label="Agreement rate"
                value={`${(stats.agreementRate * 100).toFixed(0)}%`}
                sub="evaluator vs chemist"
                accent="primary"
              />
              <StatBox
                label="Accepted"
                value={String(profile.accepted)}
                sub={`avg score ${profile.avgAcceptedScore.toFixed(2)}`}
                accent="primary"
              />
              <StatBox
                label="Revised/Rejected"
                value={String(profile.revised + profile.rejected)}
                sub={`avg score ${profile.avgRevisedScore.toFixed(2)}`}
                accent="accent"
              />
            </div>

            {/* Preference profile */}
            <div className="rounded-md border border-accent/20 bg-accent/5 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                <Brain className="h-3 w-3" />
                Learned preference profile
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">{profile.profile}</p>
              {profile.insights.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {profile.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                      {insight}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Keywords */}
            <div className="grid grid-cols-2 gap-3">
              {profile.acceptedKeywords.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Accepted instruction keywords
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profile.acceptedKeywords.slice(0, 8).map((k) => (
                      <span key={k} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.revisedKeywords.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                    Revised instruction keywords
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profile.revisedKeywords.slice(0, 8).map((k) => (
                      <span key={k} className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: "primary" | "accent" }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", accent === "primary" ? "text-primary" : "text-accent")}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

// Inline feedback buttons for each run in the session history.
// Usage: <FeedbackButtons runId="run_xxx" onRecorded={() => refresh()} />
export function FeedbackButtons({ runId, onRecorded }: { runId: string; onRecorded?: () => void }) {
  const [recording, setRecording] = React.useState(false);
  const [recorded, setRecorded] = React.useState<"accept" | "revise" | "reject" | null>(null);

  const record = async (signal: "accept" | "revise" | "reject") => {
    setRecording(true);
    try {
      await api.recordFeedback(runId, signal);
      setRecorded(signal);
      onRecorded?.();
    } catch {
      // ignore
    } finally {
      setRecording(false);
    }
  };

  if (recorded) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-primary" />
        You marked: {recorded}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => record("accept")}
        disabled={recording}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-50"
        title="Accept this run"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => record("revise")}
        disabled={recording}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent disabled:opacity-50"
        title="Mark for revision"
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => record("reject")}
        disabled={recording}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        title="Reject this run"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
