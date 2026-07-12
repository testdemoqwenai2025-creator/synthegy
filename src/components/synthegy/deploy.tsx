"use client";

import * as React from "react";
import { Copy, Check, Terminal, GitBranch, Boxes, Layers } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEPLOYMENT_CODE } from "@/lib/synthegy/data";

const STACKS = [
  {
    icon: GitBranch,
    name: "LangChain",
    note: "Native tool-calling agents. Wire the Strategic Evaluator as a Tool exposed to a LangGraph crew.",
  },
  {
    icon: Boxes,
    name: "CrewAI",
    note: "Role-based crews map 1:1 to the Synthegy agent definitions. Sequential process by default.",
  },
  {
    icon: Layers,
    name: "AutoGen",
    note: "Group-chat pattern fits the Iteration Manager — chemist participates as a human agent.",
  },
];

export function Deploy() {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DEPLOYMENT_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <section id="deploy" className="relative scroll-mt-24 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="outline" className="border-accent/30 bg-accent/5 text-accent">
            <Terminal className="mr-1.5 h-3 w-3" />
            Implementation template
          </Badge>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Drop Synthegy into your existing orchestration
          </h2>
          <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground">
            The agentic pattern is platform-agnostic. The same three-crew blueprint deploys on
            LangChain, CrewAI or AutoGen — the only thing that changes is the decorator.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Code */}
          <div className="lg:col-span-7">
            <Card className="overflow-hidden border-border/60 bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                  deployment_template.py
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copy}
                  className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-primary" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="max-h-[560px] overflow-auto scrollbar-slim">
                <SyntaxHighlighter
                  language="python"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    background: "transparent",
                    padding: "1rem 1.25rem",
                    fontSize: 12.5,
                    lineHeight: 1.6,
                  }}
                  codeTagProps={{
                    style: { fontFamily: "var(--font-geist-mono), monospace" },
                  }}
                >
                  {DEPLOYMENT_CODE}
                </SyntaxHighlighter>
              </div>
            </Card>
          </div>

          {/* Stack compat */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/60 bg-card">
              <CardContent className="p-5">
                <div className="text-sm font-semibold text-foreground">
                  Platform compatibility
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Each crew maps to the platform&apos;s native agent primitive.
                </p>
                <div className="mt-4 space-y-3">
                  {STACKS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.name}
                        className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                      >
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/30">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="text-[13px] font-semibold text-foreground">{s.name}</div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {s.note}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed border-border/60 bg-muted/10">
              <CardContent className="p-5">
                <div className="text-sm font-semibold text-foreground">
                  Enterprise readiness
                </div>
                <ul className="mt-3 space-y-2 text-[12px] text-muted-foreground">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>On-prem or VPC deployment — no molecule data leaves your network.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Pluggable LLM backend — bring your own model weights.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Audit log of every agent decision — chemist-reviewable.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>SSO, role-based crews, per-project pathway cache.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
