"use client";

import Link from "next/link";
import { FlaskConical, Github, Twitter, Linkedin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                <FlaskConical className="h-5 w-5 text-primary" />
              </span>
              <div className="flex flex-col leading-none">
                <span className="font-mono text-sm font-semibold text-foreground">synthegy</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  agentic chemistry
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              Synthegy is an agentic reasoning platform that bridges computation and chemical
              intuition. Strategy-aware retrosynthesis, mechanistic electron-pushing, and expert
              alignment — in one natural-language workspace for pharmaceutical and materials-science
              R&amp;D teams.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                aria-label="GitHub"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Platform
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="#workflows" className="text-muted-foreground hover:text-foreground">
                  Workflows
                </Link>
              </li>
              <li>
                <Link href="#demo" className="text-muted-foreground hover:text-foreground">
                  Live Demo
                </Link>
              </li>
              <li>
                <Link href="#deploy" className="text-muted-foreground hover:text-foreground">
                  Deployment template
                </Link>
              </li>
              <li>
                <Link href="#commercial" className="text-muted-foreground hover:text-foreground">
                  ROI calculator
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Sectors
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="text-muted-foreground">Pharmaceuticals</li>
              <li className="text-muted-foreground">Materials Science</li>
              <li className="text-muted-foreground">Agrochemicals</li>
              <li className="text-muted-foreground">Fine Chemicals</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            (c) {new Date().getFullYear()} Synthegy Labs. Demonstrator platform — chemistry outputs
            shown are illustrative.
          </p>
          <p className="font-mono">
            v2.4 · build synthegy-{process.env.NEXT_PUBLIC_VERCEL_GIT_SHA?.slice(0, 7) ?? "demo"}
          </p>
        </div>
      </div>
    </footer>
  );
}
