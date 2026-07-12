"use client";

import * as React from "react";
import {
  Search,
  Loader2,
  Atom,
  ExternalLink,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { moleculeApi, moleculeImageUrl, type MoleculeRecord } from "@/lib/synthegy/molecule-api";
import { cn } from "@/lib/utils";

const POPULAR_MOLECULES = [
  "Aspirin",
  "Caffeine",
  "Atovaquone",
  "Paracetamol",
  "Ibuprofen",
  "Penicillin",
];

export function MoleculeExplorer({
  onUseInEvaluator,
}: {
  onUseInEvaluator?: (molecule: MoleculeRecord) => void;
}) {
  const [query, setQuery] = React.useState("Atovaquone");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [molecule, setMolecule] = React.useState<MoleculeRecord | null>(null);
  const [activeTab, setActiveTab] = React.useState<"properties" | "synonyms" | "description">(
    "properties"
  );

  const lookup = React.useCallback(async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setMolecule(null);
    try {
      const { molecule: mol } = await moleculeApi.byName(name);
      setMolecule(mol);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on first mount.
  React.useEffect(() => {
    lookup("Atovaquone");
  }, [lookup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3 ring-1 ring-chart-3/30">
              <Atom className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                PubChem molecule explorer
              </div>
              <div className="text-[11px] text-muted-foreground">
                Live data from{" "}
                <a
                  href="https://pubchem.ncbi.nlm.nih.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-chart-3 underline-offset-2 hover:underline"
                >
                  PubChem
                </a>{" "}
                via the molecule microservice (port 3002)
              </div>
            </div>
          </div>
          <Badge variant="outline" className="border-chart-3/30 bg-chart-3/5 text-chart-3">
            <Database className="mr-1 h-3 w-3" />
            119M+ compounds
          </Badge>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any compound by name (Aspirin, Caffeine, Atovaquone...)"
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-chart-3 focus:ring-1 focus:ring-chart-3"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-1.5 h-4 w-4" />
            )}
            Lookup
          </Button>
        </form>

        {/* Popular molecules */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Try:</span>
          {POPULAR_MOLECULES.map((m) => (
            <button
              key={m}
              onClick={() => {
                setQuery(m);
                lookup(m);
              }}
              className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-chart-3/40 hover:text-foreground"
            >
              {m}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <div className="text-sm font-medium text-foreground">Lookup failed</div>
              <p className="mt-1 text-[12px] text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="mt-4 flex h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-chart-3" />
              <p className="mt-3 text-sm text-muted-foreground">
                Querying PubChem for &ldquo;{query}&rdquo;...
              </p>
            </div>
          </div>
        )}

        {/* Result */}
        {molecule && !loading && (
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
            {/* Structure image */}
            <div className="md:col-span-4">
              <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
                <div className="border-b border-border/60 bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                  2D structure
                </div>
                <img
                  src={moleculeImageUrl(molecule.properties.iupacName || query, "name", "400x400")}
                  alt={`2D structure of ${molecule.properties.iupacName || query}`}
                  className="h-auto w-full bg-white"
                  loading="lazy"
                />
              </div>
              <a
                href={molecule.pubchemUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-chart-3 hover:underline"
              >
                View CID {molecule.properties.cid} on PubChem
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Properties */}
            <div className="md:col-span-8">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-lg font-semibold leading-tight text-foreground">
                  {molecule.properties.iupacName || molecule.properties.molecularFormula}
                </h3>
                <span className="font-mono text-[12px] text-muted-foreground">
                  CID {molecule.properties.cid}
                </span>
              </div>

              {/* Tab pills */}
              <div className="mt-3 flex gap-1.5">
                {(["properties", "synonyms", "description"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-colors",
                      activeTab === t
                        ? "bg-chart-3 text-background"
                        : "border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                    {t === "synonyms" && molecule.synonyms.length > 0 && (
                      <span className="ml-1 opacity-70">({molecule.synonyms.length})</span>
                    )}
                    {t === "description" && molecule.descriptions.length > 0 && (
                      <span className="ml-1 opacity-70">({molecule.descriptions.length})</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-3 min-h-[200px]">
                {activeTab === "properties" && <PropertiesGrid props={molecule.properties} />}

                {activeTab === "synonyms" && (
                  <div className="flex flex-wrap gap-1.5">
                    {molecule.synonyms.slice(0, 40).map((s, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 font-mono text-[11px] text-foreground"
                      >
                        {s}
                      </span>
                    ))}
                    {molecule.synonyms.length > 40 && (
                      <span className="self-center text-[11px] text-muted-foreground">
                        +{molecule.synonyms.length - 40} more
                      </span>
                    )}
                  </div>
                )}

                {activeTab === "description" && (
                  <div className="space-y-3">
                    {molecule.descriptions.slice(0, 3).map((d, i) => (
                      <div key={i} className="rounded-md border border-border/60 bg-muted/20 p-3">
                        <div className="text-[11px] font-semibold text-chart-3">{d.title}</div>
                        {d.description && (
                          <p className="mt-1 text-[12px] leading-relaxed text-foreground">
                            {d.description}
                          </p>
                        )}
                      </div>
                    ))}
                    {molecule.descriptions.length === 0 && (
                      <p className="text-[12px] text-muted-foreground">
                        No descriptions available for this compound.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Enrich evaluator button */}
              {onUseInEvaluator && (
                <div className="mt-4 border-t border-border/50 pt-3">
                  <Button
                    size="sm"
                    onClick={() => onUseInEvaluator(molecule)}
                    className="bg-chart-3 text-background hover:bg-chart-3/90"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Enrich Strategic Evaluator with this molecule
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Injects real PubChem data (SMILES, formula, MW, XLogP, TPSA, complexity) into
                    the LLM prompt — the evaluator will reason about the actual molecule.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PropertiesGrid({ props }: { props: MoleculeRecord["properties"] }) {
  const rows: { label: string; value: string | number; mono?: boolean }[] = [
    { label: "Molecular formula", value: props.molecularFormula, mono: true },
    { label: "Molecular weight", value: `${props.molecularWeight} g/mol` },
    { label: "Canonical SMILES", value: props.canonicalSMILES, mono: true },
    { label: "InChIKey", value: props.inChIKey, mono: true },
    { label: "IUPAC name", value: props.iupacName ?? "—" },
    { label: "XLogP", value: props.xLogP ?? "—" },
    { label: "TPSA", value: props.tpsa != null ? `${props.tpsa} Å²` : "—" },
    { label: "Rotatable bonds", value: props.rotatableBondCount ?? "—" },
    { label: "Heavy atoms", value: props.heavyAtomCount ?? "—" },
    { label: "Charge", value: props.charge ?? 0 },
    { label: "Complexity", value: props.complexity ?? "—" },
  ];
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border/60 bg-border/40 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="bg-card px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {r.label}
          </div>
          <div
            className={cn(
              "mt-0.5 break-all text-[12px] text-foreground",
              r.mono && "font-mono text-[11px]"
            )}
          >
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}
