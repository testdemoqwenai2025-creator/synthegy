"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HERO_STATS } from "@/lib/synthegy/data";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.18]" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[640px] bg-gradient-to-b from-primary/10 via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          {/* Left: headline + CTAs */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary"
              >
                <Sparkles className="mr-1.5 h-3 w-3" />
                Strategy-aware agentic chemistry
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            >
              The reasoning layer between{" "}
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                computation
              </span>{" "}
              and chemical intuition.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Synthegy deploys three coordinated agent crews — Strategic Retrosynthesis,
              Mechanistic Electron-Pushing, and Expert Alignment — that turn raw computational
              output into strategy-grade decisions. Chemists simply talk to it. No filters, no
              rules, no restart-from-scratch.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg" className="h-11 px-6">
                <Link href="#demo">
                  Run a live evaluation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-6">
                <Link href="#workflows">
                  <Terminal className="mr-2 h-4 w-4" />
                  Explore the crews
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-4"
            >
              {HERO_STATS.map((s) => (
                <div key={s.label} className="bg-card p-4">
                  <div className="text-2xl font-semibold tracking-tight text-foreground">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground/70">{s.note}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: terminal-style preview card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <div className="relative">
              <div
                className="absolute -inset-2 -z-10 rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-accent/15 blur-2xl"
                aria-hidden
              />
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    synthegy://crew/retrosynthesis/run-0417
                  </span>
                </div>
                <div className="space-y-3 p-4 font-mono text-[12px] leading-relaxed">
                  <p className="text-muted-foreground">
                    <span className="text-primary">$</span> synthegy evaluate --target atovaquone
                  </p>
                  <p className="text-muted-foreground">
                    <span className="text-accent">instruction:</span> "avoid unnecessary protecting
                    groups"
                  </p>
                  <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-foreground">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                      Strategic Evaluator reasoning...
                    </div>
                    <div className="mt-2 space-y-1.5 text-[12px]">
                      <p>
                        <span className="text-muted-foreground">route_07</span>{" "}
                        <span className="text-primary">accept</span> · score 0.91
                      </p>
                      <p className="text-muted-foreground">
                        convergent · 0 protecting groups · ring construction deferred
                      </p>
                      <p>
                        <span className="text-muted-foreground">route_02</span>{" "}
                        <span className="text-destructive">reject</span> · score 0.31
                      </p>
                      <p className="text-muted-foreground">
                        3 sequential protections violate chemist instruction
                      </p>
                    </div>
                  </div>
                  <p className="text-foreground">
                    <span className="text-accent">verdict:</span> 5-step convergent route ·{" "}
                    <span className="text-primary">-38% step count</span>
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Live agent output · powered by Synthegy&apos;s Strategic Evaluator
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
