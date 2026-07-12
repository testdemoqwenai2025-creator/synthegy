"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CTA() {
  return (
    <section className="relative scroll-mt-24 overflow-hidden border-t border-border/40 py-20">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-grid opacity-[0.12]" aria-hidden />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
          <CalendarClock className="mr-1.5 h-3 w-3" />
          Pilot programme open · Q4 cohort
        </Badge>
        <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          Give your chemists a reasoning partner, not a black box.
        </h2>
        <p className="mt-5 text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
          Synthegy deploys alongside your existing retrosynthesis stack — no rip-and-replace. Most
          pilot cohorts see strategy-grade route recommendations inside the first sprint, and a
          measurable drop in late-stage failures within the first quarter.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-11 px-6">
            <Link href="#demo">
              Run a live evaluation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 px-6">
            <Link href="#commercial">Estimate your ROI</Link>
          </Button>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          Pilot slots are limited to 8 sponsors per cohort. NDA-friendly scoping call available
          within 48 hours.
        </p>
      </div>
    </section>
  );
}
