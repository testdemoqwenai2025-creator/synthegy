"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cpu,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DEMO_SCENARIOS,
  type DemoScenario,
  type AgentStatus,
} from "@/lib/synthegy/data";
import { cn } from "@/lib/utils";
import { LiveEvaluator } from "./live-evaluator";

export function Demo() {
  return (
    <section id="demo" className="relative scroll-mt-24 border-y border-border/40 bg-muted/15 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              <Cpu className="mr-1.5 h-3 w-3" />
              Live console
            </Badge>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Watch an agent crew reason — then talk to one yourself
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
              Each scenario below replays a real agent pipeline: orchestration, translation, and LLM
              reasoning. The fourth tab is a live evaluator — type your own natural-language
              instruction and the Strategic Evaluator will score a candidate route against it.
            </p>
          </div>
        </div>

        <Tabs defaultValue={DEMO_SCENARIOS[0].id} className="mt-10">
          <TabsList
            className="flex h-auto w-full flex-wrap gap-1 rounded-xl border border-border/60 bg-card p-1"
            aria-label="Demo scenarios"
          >
            {DEMO_SCENARIOS.map((s) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs text-left data-[state=active]:bg-primary/10 data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
              >
                {s.title}
              </TabsTrigger>
            ))}
            <TabsTrigger
              value="live"
              className="flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs text-left data-[state=active]:bg-accent/10 data-[state=active]:ring-1 data-[state=active]:ring-accent/30"
            >
              <Sparkles className="mr-1.5 inline h-3 w-3" />
              Try it live
            </TabsTrigger>
          </TabsList>

          {DEMO_SCENARIOS.map((s) => (
            <TabsContent key={s.id} value={s.id} className="mt-6">
              <ScenarioPlayer scenario={s} />
            </TabsContent>
          ))}

          <TabsContent value="live" className="mt-6">
            <LiveEvaluator />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function ScenarioPlayer({ scenario }: { scenario: DemoScenario }) {
  const [activeStep, setActiveStep] = React.useState(-1); // -1 = idle, 0..n = running, n+1 = done
  const [isRunning, setIsRunning] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setActiveStep(-1);
    setIsRunning(false);
  }, []);

  const run = React.useCallback(() => {
    reset();
    setIsRunning(true);
    let i = 0;
    const tick = () => {
      setActiveStep(i);
      i += 1;
      if (i < scenario.steps.length) {
        timer.current = setTimeout(tick, 1400);
      } else {
        timer.current = setTimeout(() => {
          setActiveStep(scenario.steps.length);
          setIsRunning(false);
        }, 1200);
      }
    };
    timer.current = setTimeout(tick, 300);
  }, [reset, scenario.steps.length]);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  React.useEffect(() => {
    // auto-run once on mount for instant gratification
    run();
  }, [scenario.id, run]);

  const allDone = activeStep >= scenario.steps.length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: scenario brief */}
      <div className="lg:col-span-4">
        <Card className="border-border/60 bg-card">
          <CardContent className="space-y-4 p-5">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Target
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{scenario.target}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                SMILES
              </div>
              <code className="mt-1 block break-all rounded-md bg-muted/50 px-2 py-1.5 font-mono text-[11px] text-foreground">
                {scenario.smiles}
              </code>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Chemist instruction
              </div>
              <p className="mt-1 text-sm italic leading-relaxed text-foreground">
                &ldquo;{scenario.instruction}&rdquo;
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={run} disabled={isRunning}>
                {isRunning ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isRunning ? "Running..." : "Replay"}
              </Button>
              <Button size="sm" variant="outline" onClick={reset} disabled={isRunning}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: agent console */}
      <div className="lg:col-span-8">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg shadow-black/30">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              agent-console://crew/{scenario.workflowId}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {isRunning ? "running" : allDone ? "complete" : "idle"}
            </div>
          </div>

          <div className="space-y-px bg-border/40">
            {scenario.steps.map((step, idx) => {
              const status = resolveStatus(idx, activeStep, scenario.steps.length, step.status);
              return <ConsoleRow key={idx} index={idx} step={step} status={status} />;
            })}
          </div>

          {/* Verdict */}
          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-border/60 bg-primary/5 px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Crew verdict
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{scenario.verdict}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function resolveStatus(
  idx: number,
  activeStep: number,
  total: number,
  finalStatus: AgentStatus
): AgentStatus {
  if (activeStep === -1) return "idle";
  if (idx < activeStep) return finalStatus;
  if (idx === activeStep) return "thinking";
  return "idle";
}

function ConsoleRow({
  index,
  step,
  status,
}: {
  index: number;
  step: DemoScenario["steps"][number];
  status: AgentStatus;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 bg-card px-4 py-3.5 transition-colors",
        status === "thinking" && "bg-primary/5"
      )}
    >
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-mono",
            status === "idle" && "border-border text-muted-foreground/50",
            status === "thinking" && "border-primary bg-primary/10 text-primary agent-active",
            status === "done" && "border-primary bg-primary/15 text-primary",
            status === "flagged" && "border-accent bg-accent/15 text-accent"
          )}
        >
          {status === "thinking" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === "done" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : status === "flagged" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            index + 1
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            {step.agent}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              status === "idle" && "bg-muted/50 text-muted-foreground",
              status === "thinking" && "bg-primary/10 text-primary",
              status === "done" && "bg-primary/15 text-primary",
              status === "flagged" && "bg-accent/15 text-accent"
            )}
          >
            {status === "idle" && "queued"}
            {status === "thinking" && "reasoning"}
            {status === "done" && "complete"}
            {status === "flagged" && "flagged"}
          </span>
        </div>
        <div className="mt-1.5 text-sm font-medium text-foreground">{step.label}</div>
        <AnimatePresence>
          {status !== "idle" && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 text-[12px] leading-relaxed text-muted-foreground"
            >
              {step.detail}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <ChevronRight
        className={cn(
          "mt-1 h-4 w-4 shrink-0 transition-colors",
          status === "thinking" ? "text-primary" : "text-transparent"
        )}
      />
    </div>
  );
}
