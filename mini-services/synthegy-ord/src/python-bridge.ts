// Wrapper that shells out to the Python helper script (ord_helper.py) for
// ORD dataset parsing + ADMET computation. Python is required because
// ord_schema + rdkit have no JS equivalents.

import { resolve } from "node:path";

const SCRIPT_PATH = resolve(import.meta.dir, "scripts", "ord_helper.py");
const PYTHON = "python3.13";

export interface OrdReaction {
  reactionId: string;
  datasetId: string;
  datasetName?: string;
  inputs: { role: string; smiles: string }[];
  products: { smiles: string }[];
  temperature?: string;
  solvents?: string[];
  yieldRaw?: string;
  matchType?: string;
  querySmiles?: string;
}

export interface OrdSearchResult {
  query: string;
  datasetsSearched: number;
  totalMatches: number;
  reactions: OrdReaction[];
  error?: string;
}

export interface AdmetResult {
  smiles: string;
  descriptors: {
    molecularWeight: number;
    clogP: number;
    tpsa: number;
    hBondDonors: number;
    hBondAcceptors: number;
    rotatableBonds: number;
    heavyAtoms: number;
    rings: number;
    aromaticRings: number;
    formalCharge: number;
    stereoCenters: number;
  };
  rules: {
    lipinski: { pass: boolean; violations: number; note: string };
    veber: { pass: boolean; note: string };
    bbbPermeable: { pass: boolean; note: string };
    leadLike: { pass: boolean; note: string };
    fragmentLike: { pass: boolean; note: string };
  };
  alerts: {
    pains: string[];
    syntheticAccessibility: number;
  };
  drugLikenessScore: number;
  verdict: "excellent" | "good" | "marginal" | "poor";
  error?: string;
}

async function runPython<T>(input: unknown, timeoutMs: number = 120_000): Promise<T> {
  const inputJson = JSON.stringify(input);
  const proc = Bun.spawn([PYTHON, SCRIPT_PATH], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  // Write the input JSON to stdin
  proc.stdin.write(inputJson);
  proc.stdin.end();

  // Set up timeout
  const timeout = setTimeout(() => {
    try { proc.kill(); } catch { /* already exited */ }
  }, timeoutMs);

  try {
    const exitCode = await proc.exited;
    clearTimeout(timeout);
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    if (exitCode !== 0) {
      throw new Error(`Python helper exited ${exitCode}: ${stderr.slice(0, 500)}`);
    }
    return JSON.parse(stdout) as T;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export async function searchReactions(
  smiles: string,
  limit: number = 10
): Promise<OrdSearchResult> {
  return runPython<OrdSearchResult>({
    mode: "search_reactions",
    smiles,
    limit,
  }, 180_000); // 3 minutes — fetching + parsing multiple datasets is slow
}

export async function computeAdmet(smiles: string): Promise<AdmetResult> {
  return runPython<AdmetResult>({
    mode: "admet",
    smiles,
  }, 30_000);
}

export async function listDatasets(): Promise<{ datasets: string[] }> {
  return runPython<{ datasets: string[] }>({
    mode: "list_datasets",
  }, 5_000);
}
