// Python bridge — runs patient_generator.py and returns parsed JSON.

import { resolve } from "node:path";

const SCRIPT_PATH = resolve(import.meta.dir, "scripts", "patient_generator.py");
const PYTHON = "python3.13";

export async function generateCohort(n: number = 50): Promise<{ patients: any[]; analysis: any }> {
  const proc = Bun.spawn([PYTHON, SCRIPT_PATH], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify({ mode: "generate", n }));
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
