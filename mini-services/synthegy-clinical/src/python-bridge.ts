// Python bridge — runs patient_generator.py and returns parsed JSON.

import { resolve } from "node:path";

const SCRIPT_PATH = resolve(import.meta.dir, "scripts", "patient_generator.py");
const PYTHON = "python3.13";

export async function generateCohort(disease: string = "rheumatoid_arthritis", n: number = 50): Promise<{ patients: any[]; analysis: any }> {
  const proc = Bun.spawn([PYTHON, SCRIPT_PATH], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ mode: "generate", disease, n }));
  proc.stdin.end();
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Python generator failed: ${stderr.slice(0, 300)}`);
  }
  return JSON.parse(stdout);
}

export async function analyzeCohort(patients: any[]): Promise<any> {
  const proc = Bun.spawn([PYTHON, SCRIPT_PATH], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ mode: "analyze", patients }));
  proc.stdin.end();
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  if (exitCode !== 0) throw new Error("Python analysis failed");
  return JSON.parse(stdout).analysis;
}

export async function listDiseases(): Promise<any[]> {
  const proc = Bun.spawn([PYTHON, SCRIPT_PATH], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ mode: "list_diseases" }));
  proc.stdin.end();
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  if (exitCode !== 0) throw new Error("Python list_diseases failed");
  return JSON.parse(stdout).diseases;
}

// --- Clinical helper (government data + prediction + CDISC + matching) ---
const HELPER_SCRIPT = resolve(import.meta.dir, "scripts", "clinical_helper.py");

async function runHelper(input: unknown, timeoutMs: number = 60_000): Promise<any> {
  const proc = Bun.spawn([PYTHON, HELPER_SCRIPT], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();
  const timeout = setTimeout(() => { try { proc.kill(); } catch {} }, timeoutMs);
  try {
    const exitCode = await proc.exited;
    clearTimeout(timeout);
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    if (exitCode !== 0) throw new Error(`Helper failed: ${stderr.slice(0, 300)}`);
    return JSON.parse(stdout);
  } catch (err) { clearTimeout(timeout); throw err; }
}

export async function fetchGovData(disease: string): Promise<any> {
  return runHelper({ mode: "gov_data", disease }, 30_000);
}

export async function predictOutcome(patient: any): Promise<any> {
  return runHelper({ mode: "predict_outcome", patient }, 10_000);
}

export async function predictCohort(patients: any[]): Promise<any> {
  return runHelper({ mode: "predict_cohort", patients }, 30_000);
}

export async function exportCdiscSdtm(patients: any[]): Promise<any> {
  return runHelper({ mode: "cdisc_sdtm", patients }, 30_000);
}

export async function compoundDiseaseMatch(targets: any[], diseases: string[]): Promise<any> {
  return runHelper({ mode: "compound_disease_match", targets, diseases }, 10_000);
}
