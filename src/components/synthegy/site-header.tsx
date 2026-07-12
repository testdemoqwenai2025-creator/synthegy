"use client";

import Link from "next/link";
import { FlaskConical, Github, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_TICKER } from "@/lib/synthegy/data";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="#top" className="flex items-center gap-2.5 group">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
            <FlaskConical className="h-5 w-5 text-primary" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
              synthegy
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              agentic chemistry
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { href: "#workflows", label: "Workflows" },
            { href: "#demo", label: "Live Demo" },
            { href: "#commercial", label: "Commercial Value" },
            { href: "#cases", label: "Use Cases" },
            { href: "#deploy", label: "Deploy" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/60"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="hidden border-primary/30 bg-primary/5 text-primary sm:inline-flex"
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Pilot open
          </Badge>
          <Button asChild size="sm" variant="default" className="hidden sm:inline-flex">
            <Link href="#demo">Request access</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Status ticker */}
      <div className="border-t border-border/40 bg-muted/20">
        <div className="relative mx-auto flex max-w-7xl items-center overflow-hidden px-4 sm:px-6 lg:px-8">
          <div className="flex w-full overflow-hidden py-1.5">
            <div className="flex shrink-0 animate-marquee items-center gap-8 whitespace-nowrap pr-8 text-[11px] font-mono text-muted-foreground">
              {[...STATUS_TICKER, ...STATUS_TICKER].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-accent/80" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
