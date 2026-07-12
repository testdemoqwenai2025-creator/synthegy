"use client";

import * as React from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  Box,
  SlidersHorizontal,
  Activity,
  ExternalLink,
  Pill,
  Beaker,
  Dna,
  ArrowRight,
  Target,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  moleculeApi,
  moleculeImageUrl,
  type CompoundSearchRow,
  type PropertyFilterSpec,
  type PropertyField,
  type ChEMBLBioactivity,
  type ChEMBLTarget,
  type ActiveCompound,
  type MoleculeRecord,
} from "@/lib/synthegy/molecule-api";
import type { CollectionItemInput } from "@/lib/synthegy/api";
import { cn } from "@/lib/utils";

// Common scaffolds offered as quick-start chips.
const SCAFFOLD_PRESETS = [
  { label: "Benzene", smiles: "c1ccccc1" },
  { label: "Pyridine", smiles: "c1ccncc1" },
  { label: "Indole", smiles: "c1ccc2[nH]ccc2c1" },
  { label: "Imidazole", smiles: "c1c[nH]cn1" },
  { label: "Piperazine", smiles: "C1CNCCN1" },
  { label: "Naphthalene", smiles: "c1ccc2ccccc2c1" },
  { label: "Aspirin scaffold", smiles: "CC(=O)Oc1ccccc1C(=O)O" },
];

const PROPERTY_PRESETS: { label: string; filters: PropertyFilterSpec[] }[] = [
  {
    label: "Drug-like (Lipinski+)",
    filters: [
      { field: "XLGP", min: 2, max: 4 },
      { field: "TPSA", min: 60, max: 100 },
      { field: "MW", min: 200, max: 450 },
    ],
  },
  {
    label: "Lead-like",
    filters: [
      { field: "XLGP", min: 1, max: 3 },
      { field: "MW", min: 200, max: 350 },
      { field: "RBC", min: 0, max: 5 },
    ],
  },
  {
    label: "Fragment-like",
    filters: [
      { field: "MW", min: 100, max: 250 },
      { field: "HAC", min: 8, max: 18 },
      { field: "XLGP", min: 0, max: 2 },
    ],
  },
  {
    label: "CNS-penetrant",
    filters: [
      { field: "XLGP", min: 1, max: 3 },
      { field: "TPSA", min: 20, max: 70 },
      { field: "MW", min: 150, max: 400 },
    ],
  },
];

const FIELD_LABELS: Record<PropertyField, string> = {
  XLGP: "XLogP",
  TPSA: "TPSA (Å²)",
  MW: "Molecular weight",
  HAC: "Heavy atoms",
  RBC: "Rotatable bonds",
  HBDC: "H-bond donors",
  HBAC: "H-bond acceptors",
  CPLX: "Complexity",
  TFC: "Total formal charge",
};

const ACTIVITY_TYPE_PRESETS = ["", "IC50", "Ki", "Kd", "EC50", "AC50", "Potency"];

interface AdvancedSearchProps {
  onUseInEvaluator?: (molecule: MoleculeRecord) => void;
  onResultsChange?: (items: CollectionItemInput[]) => void;
}

export function AdvancedSearch({ onUseInEvaluator, onResultsChange }: AdvancedSearchProps) {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/30">
              <Beaker className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Advanced molecular search
              </div>
              <div className="text-[11px] text-muted-foreground">
                Substructure, property filtering, ChEMBL bioactivity, and target-based
                search — backed by PubChem (124M compounds) and ChEMBL (2.4M bioactive
                molecules)
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="substructure" className="mt-4">
          <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
            <TabsTrigger
              value="substructure"
              className="flex-1 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-accent/10 data-[state=active]:ring-1 data-[state=active]:ring-accent/30"
            >
              <Box className="mr-1.5 inline h-3 w-3" />
              Substructure
            </TabsTrigger>
            <TabsTrigger
              value="filter"
              className="flex-1 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-accent/10 data-[state=active]:ring-1 data-[state=active]:ring-accent/30"
            >
              <SlidersHorizontal className="mr-1.5 inline h-3 w-3" />
              Property filter
            </TabsTrigger>
            <TabsTrigger
              value="bioactivity"
              className="flex-1 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-accent/10 data-[state=active]:ring-1 data-[state=active]:ring-accent/30"
            >
              <Activity className="mr-1.5 inline h-3 w-3" />
              ChEMBL bioactivity
            </TabsTrigger>
            <TabsTrigger
              value="target"
              className="flex-1 rounded-md px-3 py-1.5 text-xs data-[state=active]:bg-accent/10 data-[state=active]:ring-1 data-[state=active]:ring-accent/30"
            >
              <Target className="mr-1.5 inline h-3 w-3" />
              Target search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="substructure" className="mt-4">
            <SubstructureTab onUseInEvaluator={onUseInEvaluator} onResultsChange={onResultsChange} />
          </TabsContent>
          <TabsContent value="filter" className="mt-4">
            <PropertyFilterTab onUseInEvaluator={onUseInEvaluator} onResultsChange={onResultsChange} />
          </TabsContent>
          <TabsContent value="bioactivity" className="mt-4">
            <BioactivityTab />
          </TabsContent>
          <TabsContent value="target" className="mt-4">
            <TargetSearchTab onResultsChange={onResultsChange} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Substructure tab
// =========================================================================

function SubstructureTab({
  onUseInEvaluator,
  onResultsChange,
}: {
  onUseInEvaluator?: (molecule: MoleculeRecord) => void;
  onResultsChange?: (items: CollectionItemInput[]) => void;
}) {
  const [smiles, setSmiles] = React.useState("c1ccccc1");
  const [maxRecords, setMaxRecords] = React.useState(12);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<CompoundSearchRow[]>([]);
  const [hasRun, setHasRun] = React.useState(false);

  // Lift results to parent whenever they change, so the CollectionsPanel
  // can offer "Save all" with the right compounds.
  React.useEffect(() => {
    if (onResultsChange) {
      onResultsChange(
        results.map((r) => ({
          cid: r.cid,
          name: r.name,
          molecularFormula: r.molecularFormula,
          molecularWeight: r.molecularWeight,
          canonicalSMILES: r.canonicalSMILES,
          xlogp: r.xLogP,
          tpsa: r.tpsa,
          source: "substructure",
        }))
      );
    }
  }, [results, onResultsChange]);

  const run = async () => {
    if (!smiles.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await moleculeApi.substructure(smiles, maxRecords);
      setResults(res.compounds);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Scaffold SMILES
        </label>
        <div className="mt-1 flex gap-2">
          <input
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="e.g. c1ccccc1 (benzene)"
          />
          <Button onClick={run} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-1.5 h-4 w-4" />
            )}
            Search
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Try:</span>
          {SCAFFOLD_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSmiles(p.smiles)}
              className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-muted-foreground">Max results:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={maxRecords}
          onChange={(e) => setMaxRecords(Math.max(1, Math.min(50, Number(e.target.value) || 12)))}
          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
        />
        <span className="text-[11px] text-muted-foreground">
          (PubChem returns compounds in descending depositor-count order)
        </span>
      </div>

      {error && <ErrorBox message={error} />}

      {hasRun && !loading && results.length === 0 && !error && (
        <EmptyBox message="No compounds found containing that scaffold." />
      )}

      {loading && <LoadingBox label="Querying PubChem substructure index..." />}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {results.length} compounds containing the scaffold
          </div>
          {results.map((c) => (
            <CompoundRow
              key={c.cid}
              compound={c}
              onUseInEvaluator={onUseInEvaluator}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Property filter tab
// =========================================================================

function PropertyFilterTab({
  onUseInEvaluator,
  onResultsChange,
}: {
  onUseInEvaluator?: (molecule: MoleculeRecord) => void;
  onResultsChange?: (items: CollectionItemInput[]) => void;
}) {
  const [filters, setFilters] = React.useState<PropertyFilterSpec[]>([
    { field: "XLGP", min: 2, max: 4 },
    { field: "TPSA", min: 60, max: 100 },
  ]);
  const [limit, setLimit] = React.useState(12);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [totalMatches, setTotalMatches] = React.useState<number | null>(null);
  const [results, setResults] = React.useState<CompoundSearchRow[]>([]);
  const [hasRun, setHasRun] = React.useState(false);

  React.useEffect(() => {
    if (onResultsChange) {
      onResultsChange(
        results.map((r) => ({
          cid: r.cid,
          name: r.name,
          molecularFormula: r.molecularFormula,
          molecularWeight: r.molecularWeight,
          canonicalSMILES: r.canonicalSMILES,
          xlogp: r.xLogP,
          tpsa: r.tpsa,
          source: "filter",
        }))
      );
    }
  }, [results, onResultsChange]);

  const run = async () => {
    if (!filters.length) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setTotalMatches(null);
    try {
      const res = await moleculeApi.propertyFilter(filters, limit);
      setResults(res.compounds);
      setTotalMatches(res.totalMatches);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filter failed");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (idx: number, patch: Partial<PropertyFilterSpec>) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  };

  const addFilter = () => {
    setFilters((prev) => [...prev, { field: "MW", min: 200, max: 500 }]);
  };

  const removeFilter = (idx: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <div className="text-[11px] text-muted-foreground">Quick presets:</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PROPERTY_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setFilters(p.filters)}
              className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter rows */}
      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Property filters
        </div>
        {filters.map((f, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 p-2"
          >
            <select
              value={f.field}
              onChange={(e) => updateFilter(idx, { field: e.target.value as PropertyField })}
              className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
            >
              {Object.entries(FIELD_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={f.min}
              onChange={(e) => updateFilter(idx, { min: Number(e.target.value) || 0 })}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
            />
            <span className="text-[11px] text-muted-foreground">to</span>
            <input
              type="number"
              value={f.max}
              onChange={(e) => updateFilter(idx, { max: Number(e.target.value) || 0 })}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
            />
            <button
              onClick={() => removeFilter(idx)}
              className="ml-auto rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive"
              aria-label="Remove filter"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addFilter}
          className="rounded-md border border-dashed border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
        >
          + Add filter
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-muted-foreground">Limit:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={limit}
          onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 12)))}
          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
        />
        <Button onClick={run} disabled={loading || filters.length === 0} className="ml-auto">
          {loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
          )}
          Filter PubChem
        </Button>
      </div>

      {error && <ErrorBox message={error} />}

      {totalMatches !== null && (
        <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-[12px] text-accent">
          <strong className="font-semibold">
            {totalMatches.toLocaleString()}
          </strong>{" "}
          compounds in PubChem match all filters. Showing top {results.length}.
        </div>
      )}

      {hasRun && !loading && results.length === 0 && !error && (
        <EmptyBox message="No compounds matched the filter criteria." />
      )}

      {loading && <LoadingBox label="Filtering 124M PubChem compounds..." />}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Top results
          </div>
          {results.map((c) => (
            <CompoundRow
              key={c.cid}
              compound={c}
              onUseInEvaluator={onUseInEvaluator}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Bioactivity tab
// =========================================================================

function BioactivityTab() {
  const [inchikey, setInchikey] = React.useState("BSYNRYMUTXBXSQ-UHFFFAOYSA-N"); // Aspirin
  const [activityType, setActivityType] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ChEMBLBioactivity | null>(null);

  const run = async () => {
    if (!inchikey.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await moleculeApi.bioactivity(
        inchikey,
        activityType || undefined
      );
      setData(res.bioactivity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          InChIKey
        </label>
        <div className="mt-1 flex gap-2">
          <input
            value={inchikey}
            onChange={(e) => setInchikey(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="e.g. BSYNRYMUTXBXSQ-UHFFFAOYSA-N (Aspirin)"
          />
          <Button onClick={run} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Activity className="mr-1.5 h-4 w-4" />
            )}
            Lookup
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[11px] text-muted-foreground">Activity type:</label>
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
        >
          {ACTIVITY_TYPE_PRESETS.map((t) => (
            <option key={t} value={t}>
              {t || "Any"}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground">
          (Filter to specific measurement type — IC50, Ki, Kd, etc.)
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted-foreground">Try:</span>
        {[
          { label: "Aspirin", inchikey: "BSYNRYMUTXBXSQ-UHFFFAOYSA-N" },
          { label: "Caffeine", inchikey: "RYYVLZVUVIJVGH-UHFFFAOYSA-N" },
          { label: "Ibuprofen", inchikey: "HEFNNWSXXWATIW-UHFFFAOYSA-N" },
          { label: "Paracetamol", inchikey: "RZVAJINKPMORJF-UHFFFAOYSA-N" },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => setInchikey(p.inchikey)}
            className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      {loading && <LoadingBox label="Querying ChEMBL for bioactivity data..." />}

      {!loading && data && (
        <BioactivityView data={data} />
      )}

      {!loading && data && data.molecule === null && (
        <EmptyBox message="No ChEMBL entry for this InChIKey — the compound may not be drug-like or studied." />
      )}
    </div>
  );
}

function BioactivityView({ data }: { data: ChEMBLBioactivity }) {
  const m = data.molecule;
  if (!m) return null;
  return (
    <div className="space-y-4">
      {/* Molecule header */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-accent" />
              <span className="font-mono text-sm font-semibold text-foreground">
                {m.chemblId}
              </span>
              {m.prefName && (
                <span className="text-sm text-muted-foreground">· {m.prefName}</span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-4">
              {m.maxPhase !== null && (
                <div>
                  <span className="text-muted-foreground">Max phase:</span>{" "}
                  <span className="text-foreground">
                    {m.maxPhase === 4 ? "Approved" : `Phase ${m.maxPhase}`}
                  </span>
                </div>
              )}
              {m.firstApproval !== null && (
                <div>
                  <span className="text-muted-foreground">First approval:</span>{" "}
                  <span className="text-foreground">{m.firstApproval}</span>
                </div>
              )}
              {m.alogp !== null && (
                <div>
                  <span className="text-muted-foreground">ALogP:</span>{" "}
                  <span className="text-foreground">{m.alogp}</span>
                </div>
              )}
              {m.ruleOfFive !== null && (
                <div>
                  <span className="text-muted-foreground">Ro5 violations:</span>{" "}
                  <span className="text-foreground">{m.ruleOfFive}</span>
                </div>
              )}
            </div>
            {m.atcCodes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.atcCodes.map((code) => (
                  <span
                    key={code}
                    className="rounded-md bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground ring-1 ring-border/60"
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>
          <a
            href={m.chemblUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
          >
            View on ChEMBL
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Warnings */}
      {(m.blackBoxWarning || m.withdrawalFlag) && (
        <div className="flex flex-wrap gap-2">
          {m.blackBoxWarning && (
            <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
              Black box warning
            </Badge>
          )}
          {m.withdrawalFlag && (
            <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive">
              Withdrawn
            </Badge>
          )}
        </div>
      )}

      {/* Mechanisms */}
      {data.mechanisms.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Mechanism of action ({data.mechanisms.length})
          </div>
          <div className="mt-2 space-y-2">
            {data.mechanisms.map((mech, i) => (
              <div
                key={i}
                className="rounded-md border border-accent/20 bg-accent/5 p-3"
              >
                <div className="flex items-center gap-2">
                  {mech.actionType && (
                    <Badge
                      variant="outline"
                      className="border-accent/30 bg-accent/10 text-accent"
                    >
                      {mech.actionType}
                    </Badge>
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {mech.mechanismOfAction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {data.activities.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Bioactivity measurements ({data.totalActivities.toLocaleString()} total,
            top {data.activities.length} by potency)
          </div>
          <div className="mt-2 max-h-[400px] overflow-y-auto scrollbar-slim space-y-1.5">
            {data.activities.map((a) => (
              <div
                key={a.activityId}
                className="rounded-md border border-border/60 bg-background px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[12px] font-semibold text-foreground">
                    {a.standardType} {a.relation} {formatValue(a.standardValue, a.standardUnits)}
                  </span>
                  {a.pChemblValue !== null && (
                    <span className="text-[11px] text-primary">
                      pChEMBL {a.pChemblValue.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {a.targetName ?? "Unknown target"}
                  {a.targetOrganism && ` · ${a.targetOrganism}`}
                  {a.year && ` · ${a.year}`}
                  {a.journal && ` · ${a.journal}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.activities.length === 0 && (
        <EmptyBox message="No activity measurements found for this compound in ChEMBL." />
      )}
    </div>
  );
}

// =========================================================================
// Target-based search tab (ChEMBL target API)
// =========================================================================

const TARGET_PRESETS = [
  "cyclooxygenase",
  "kinase",
  "dopamine receptor",
  "serotonin receptor",
  "histamine receptor",
  "EGFR",
  "VEGFR",
  "tubulin",
];

function TargetSearchTab({
  onResultsChange,
}: {
  onResultsChange?: (items: CollectionItemInput[]) => void;
}) {
  const [targetQuery, setTargetQuery] = React.useState("cyclooxygenase");
  const [targets, setTargets] = React.useState<ChEMBLTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = React.useState<ChEMBLTarget | null>(null);
  const [activityType, setActivityType] = React.useState("IC50");
  const [compounds, setCompounds] = React.useState<ActiveCompound[]>([]);
  const [totalActivities, setTotalActivities] = React.useState<number>(0);
  const [loadingTargets, setLoadingTargets] = React.useState(false);
  const [loadingCompounds, setLoadingCompounds] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const searchTargets = async () => {
    if (!targetQuery.trim()) return;
    setLoadingTargets(true);
    setError(null);
    setTargets([]);
    setSelectedTarget(null);
    setCompounds([]);
    try {
      const res = await moleculeApi.searchTargets(targetQuery, 10);
      setTargets(res.targets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Target search failed");
    } finally {
      setLoadingTargets(false);
    }
  };

  const selectTarget = async (target: ChEMBLTarget) => {
    setSelectedTarget(target);
    setLoadingCompounds(true);
    setError(null);
    setCompounds([]);
    try {
      const res = await moleculeApi.activeCompoundsForTarget(
        target.chemblId,
        activityType || undefined,
        15
      );
      setCompounds(res.compounds);
      setTotalActivities(res.totalActivities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compound lookup failed");
    } finally {
      setLoadingCompounds(false);
    }
  };

  // Lift results to parent for collection-saving.
  // Note: ChEMBL compounds come back with SMILES but no PubChem CID,
  // so we use a synthetic CID of 0 and rely on the SMILES for identity.
  React.useEffect(() => {
    if (onResultsChange) {
      onResultsChange(
        compounds
          .filter((c) => c.canonicalSMILES)
          .map((c) => ({
            cid: 0, // ChEMBL compounds may not have a PubChem CID
            name: c.prefName ?? c.chemblId,
            canonicalSMILES: c.canonicalSMILES!,
            source: `target:${selectedTarget?.prefName ?? "unknown"}`,
          }))
      );
    }
  }, [compounds, selectedTarget, onResultsChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Target name
        </label>
        <div className="mt-1 flex gap-2">
          <input
            value={targetQuery}
            onChange={(e) => setTargetQuery(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            placeholder="e.g. cyclooxygenase, EGFR, dopamine receptor"
          />
          <Button onClick={searchTargets} disabled={loadingTargets}>
            {loadingTargets ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Target className="mr-1.5 h-4 w-4" />
            )}
            Find targets
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-muted-foreground">Try:</span>
          {TARGET_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => setTargetQuery(t)}
              className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {/* Target results */}
      {loadingTargets && <LoadingBox label="Searching ChEMBL targets..." />}

      {!loadingTargets && targets.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Matching targets ({targets.length})
          </div>
          <div className="mt-2 space-y-1.5">
            {targets.map((t) => (
              <button
                key={t.chemblId}
                onClick={() => selectTarget(t)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                  selectedTarget?.chemblId === t.chemblId
                    ? "border-accent bg-accent/10"
                    : "border-border/60 bg-background hover:bg-muted/30"
                )}
              >
                <Crosshair className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-foreground">
                    {t.prefName}
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">{t.chemblId}</span>
                    <span>{t.targetType}</span>
                    {t.organism && <span>· {t.organism}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected target + active compounds */}
      {selectedTarget && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2">
            <Crosshair className="h-4 w-4 text-accent" />
            <span className="text-[12px] font-medium text-foreground">
              {selectedTarget.prefName}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {selectedTarget.chemblId}
            </span>
            <span className="text-[11px] text-muted-foreground">
              · {selectedTarget.organism}
            </span>
            <a
              href={selectedTarget.chemblUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
            >
              View on ChEMBL
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted-foreground">Activity type:</label>
            <select
              value={activityType}
              onChange={(e) => {
                setActivityType(e.target.value);
                if (selectedTarget) selectTarget(selectedTarget);
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
            >
              {ACTIVITY_TYPE_PRESETS.map((t) => (
                <option key={t} value={t}>
                  {t || "Any"}
                </option>
              ))}
            </select>
          </div>

          {loadingCompounds && <LoadingBox label="Finding active compounds..." />}

          {!loadingCompounds && compounds.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Most potent compounds ({totalActivities.toLocaleString()} total
                activities, top {compounds.length} by potency)
              </div>
              <div className="mt-2 max-h-[500px] space-y-1.5 overflow-y-auto scrollbar-slim">
                {compounds.map((c) => (
                  <div
                    key={c.chemblId}
                    className="rounded-md border border-border/60 bg-background px-3 py-2"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {c.chemblId}
                      </span>
                      {c.prefName && (
                        <span className="text-[12px] font-medium text-foreground">
                          {c.prefName}
                        </span>
                      )}
                      {c.pChemblValue !== null && (
                        <span className="ml-auto text-[11px] text-primary">
                          pChEMBL {c.pChemblValue.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="font-mono text-foreground">
                        {c.standardType} {c.relation} {formatValue(c.standardValue, c.standardUnits)}
                      </span>
                      {c.year && <span>· {c.year}</span>}
                      {c.journal && <span>· {c.journal}</span>}
                    </div>
                    {c.canonicalSMILES && (
                      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        {c.canonicalSMILES}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loadingCompounds && compounds.length === 0 && !error && (
            <EmptyBox message="No active compounds found for this target with the selected activity type." />
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Shared row component for compound search results
// =========================================================================

function CompoundRow({
  compound,
  onUseInEvaluator,
}: {
  compound: CompoundSearchRow;
  onUseInEvaluator?: (molecule: MoleculeRecord) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const [fullMolecule, setFullMolecule] = React.useState<MoleculeRecord | null>(null);
  const [loadingFull, setLoadingFull] = React.useState(false);

  const loadFull = async () => {
    if (fullMolecule) {
      setExpanded(!expanded);
      return;
    }
    setLoadingFull(true);
    try {
      const res = await moleculeApi.byCid(compound.cid);
      setFullMolecule(res.molecule);
      setExpanded(true);
    } catch {
      // ignore — user can still see the basic row
    } finally {
      setLoadingFull(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background">
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Thumbnail */}
        <img
          src={moleculeImageUrl(String(compound.cid), "cid", "100x100")}
          alt={`Structure of ${compound.name}`}
          className="h-12 w-12 shrink-0 rounded bg-white"
          loading="lazy"
        />
        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium text-foreground">
            {compound.name}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 text-[11px] text-muted-foreground">
            <span className="font-mono">CID {compound.cid}</span>
            <span>{compound.molecularFormula}</span>
            <span>MW {compound.molecularWeight}</span>
            {compound.xLogP !== undefined && (
              <span>XLogP {compound.xLogP}</span>
            )}
            {compound.tpsa !== undefined && <span>TPSA {compound.tpsa}</span>}
          </div>
        </div>
        {/* Actions */}
        <Button
          variant="outline"
          size="sm"
          onClick={loadFull}
          disabled={loadingFull}
          className="h-7 shrink-0 gap-1 text-[11px]"
        >
          {loadingFull ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Dna className="h-3 w-3" />
          )}
          {expanded ? "Hide" : "Details"}
        </Button>
        {onUseInEvaluator && fullMolecule && (
          <Button
            size="sm"
            onClick={() => onUseInEvaluator(fullMolecule)}
            className="h-7 shrink-0 gap-1 bg-accent text-background hover:bg-accent/90 text-[11px]"
          >
            <ArrowRight className="h-3 w-3" />
            Use
          </Button>
        )}
      </div>

      {expanded && fullMolecule && (
        <div className="border-t border-border/60 bg-muted/10 px-3 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <img
                src={moleculeImageUrl(String(compound.cid), "cid", "300x300")}
                alt={`2D structure of ${compound.name}`}
                className="h-auto w-full rounded bg-white"
                loading="lazy"
              />
            </div>
            <div className="sm:col-span-9">
              <div className="text-[11px] font-mono text-muted-foreground">
                {fullMolecule.properties.canonicalSMILES}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                InChIKey:{" "}
                <span className="font-mono text-foreground">
                  {fullMolecule.properties.inChIKey}
                </span>
              </div>
              {fullMolecule.descriptions[0]?.description && (
                <p className="mt-2 text-[12px] leading-relaxed text-foreground">
                  {fullMolecule.descriptions[0].description.slice(0, 280)}
                  {fullMolecule.descriptions[0].description.length > 280 && "..."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Small shared UI bits
// =========================================================================

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="text-[12px] text-foreground">{message}</p>
    </div>
  );
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center text-[12px] text-muted-foreground">
      {message}
    </div>
  );
}

function LoadingBox({ label }: { label: string }) {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
        <p className="mt-2 text-[12px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function formatValue(value: number | null, units: string | null): string {
  if (value === null) return "?";
  if (value >= 1000) return `${value.toLocaleString()} ${units ?? ""}`.trim();
  if (value < 1) return `${value.toFixed(3)} ${units ?? ""}`.trim();
  return `${value.toFixed(2)} ${units ?? ""}`.trim();
}
