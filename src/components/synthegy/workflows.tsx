"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network,
  Languages,
  BrainCircuit,
  Split,
  Atom,
  FlaskConical,
  MessageSquareText,
  ShieldCheck,
  Repeat,
  Target,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WORKFLOWS, type WorkflowSpec, type AgentSpec } from "@/lib/synthegy/data";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Network,
  Languages,
  BrainCircuit,
  Split,
  Atom,
  FlaskConical,
  MessageSquareText,
  ShieldCheck,
  Repeat,
};

const ACCENT_RING: Record<AgentSpec["accent"], string> = {
  primary: "ring-primary/30 text-primary bg-primary/5",
  accent: "ring-accent/30 text-accent bg-accent/5",
  chart3: "ring-chart-3/30 text-chart-3 bg-chart-3/5",
};

const ACCENT_BAR: Record<AgentSpec["accent"], string> = {
  primary: "bg-primary",
  accent: "bg-accent",
  chart3: "bg-chart-3",
};

export function Workflows() {
  return (
    <section id="workflows" className="relative scroll-mt-24 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">
            Three coordinated crews
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From raw computation to strategic reasoning
          </h2>
          <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
            The Synthegy framework targets the three most vital and challenging areas in modern
            chemistry. Each crew is a sequential pipeline of three specialised agents — orchestration,
            translation, and LLM reasoning — that together turn chemical space into strategy.
          </p>
        </div>

        <Tabs defaultValue="retrosynthesis" className="mt-10">
          <TabsList
            className="grid h-auto w-full grid-cols-1 gap-1 rounded-xl border border-border/60 bg-card p-1 sm:grid-cols-3"
            aria-label="Workflow crews"
          >
            {WORKFLOWS.map((w) => (
              <TabsTrigger
                key={w.id}
                value={w.id}
                className="flex h-auto flex-col items-start gap-1 rounded-lg px-4 py-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:ring-1 data-[state=active]:ring-primary/30"
              >
                <span className="font-mono text-[11px] text-muted-foreground">{w.index}</span>
                <span className="text-sm font-medium text-foreground">{w.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {WORKFLOWS.map((w) => (
            <TabsContent key={w.id} value={w.id} className="mt-6">
              <WorkflowPanel workflow={w} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}

function WorkflowPanel({ workflow }: { workflow: WorkflowSpec }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={workflow.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        {/* Left: challenge + outcome */}
        <div className="lg:col-span-4">
          <Card className="h-full border-border/60 bg-card">
            <CardContent className="flex h-full flex-col gap-5 p-6">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    workflow.id === "retrosynthesis" && "bg-primary/10 text-primary",
                    workflow.id === "mechanism" && "bg-accent/10 text-accent",
                    workflow.id === "alignment" && "bg-chart-3/10 text-chart-3"
                  )}
                >
                  <Target className="h-3 w-3" />
                  {workflow.accentLabel}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  crew {workflow.index}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{workflow.name}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-destructive/90">
                    The challenge
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {workflow.challenge}
                  </p>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    What Synthegy delivers
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{workflow.outcome}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: agent pipeline */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {workflow.agents.map((agent, idx) => {
              const Icon = ICONS[agent.icon] ?? BrainCircuit;
              return (
                <Card
                  key={agent.id}
                  className="relative flex flex-col overflow-hidden border-border/60 bg-card"
                >
                  <div className={cn("h-1 w-full", ACCENT_BAR[agent.accent])} />
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1",
                          ACCENT_RING[agent.accent]
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        agent {idx + 1}/3
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{agent.role}</div>
                      <div className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                        {agent.goal}
                      </div>
                    </div>
                    <div className="mt-auto border-t border-border/50 pt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Backstory
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
                        {agent.backstory}
                      </p>
                    </div>
                  </CardContent>

                  {/* Pipeline arrow */}
                  {idx < workflow.agents.length - 1 && (
                    <div className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-[12px] text-muted-foreground">
            <span className="font-mono text-foreground">pipeline:</span>{" "}
            <span className="text-primary">sequential reasoning</span> — each agent&apos;s output
            feeds the next; chemist can intervene at any step via the Iteration Manager.
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
