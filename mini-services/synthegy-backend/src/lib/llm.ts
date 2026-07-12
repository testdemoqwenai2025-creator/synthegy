// LLM wrapper — wraps z-ai-web-dev-sdk with the Synthegy Strategic Evaluator
// system prompt. Returns a typed result object.

import ZAI from "z-ai-web-dev-sdk";

export interface EvaluatorFlag {
  step: string;
  issue: string;
  suggestion: string;
}

export interface EvaluatorResult {
  score: number;
  verdict: "accept" | "revise" | "reject" | string;
  strategyAlignment: string;
  flags: EvaluatorFlag[];
  oneLineSummary: string;
}

const SYSTEM_PROMPT = `You are the Strategic Evaluator agent inside the Synthegy agentic chemistry platform.

Your role (per the Synthegy framework): receive a chemist's natural-language instruction (e.g. "avoid protecting groups", "prefer convergent routes", "no toxic reagents") and evaluate a candidate synthetic pathway against that instruction. You score the route 0.0-1.0 on STRATEGIC fit (not just local connectivity) and explain the "why".

You MUST reply with VALID JSON ONLY, no markdown fences, no preamble, matching this schema:
{
  "score": number,
  "verdict": "accept" | "revise" | "reject",
  "strategyAlignment": string,
  "flags": [
    { "step": string, "issue": string, "suggestion": string }
  ],
  "oneLineSummary": string
}

Rules:
- Stay strictly in chemistry domain. If the input is not chemistry-related, return score 0, verdict "reject", oneLineSummary "Out of domain - not a synthetic chemistry query."
- Be concrete and terse. Use chemistry vocabulary naturally (protecting group, convergent, late-stage functionalisation, etc.).
- Never invent specific yields/temperatures unless they are standard textbook values.
- Output JSON only.`;

export async function runEvaluator(params: {
  target: string;
  smiles: string;
  instruction: string;
  enrichedContext?: {
    source: "pubchem";
    cid?: number;
    molecularFormula?: string;
    molecularWeight?: string;
    canonicalSMILES?: string;
    iupacName?: string;
    xLogP?: number;
    tpsa?: number;
    rotatableBondCount?: number;
    heavyAtomCount?: number;
    complexity?: number;
    synonyms?: string[];
    description?: string;
  };
}): Promise<{ result: EvaluatorResult; latencyMs: number; raw: string }> {
  const started = Date.now();

  // Build the molecule context block — either from PubChem enrichment or
  // from the basic target/SMILES provided by the chemist.
  let moleculeBlock: string;
  if (params.enrichedContext) {
    const e = params.enrichedContext;
    const lines: string[] = [
      `Target molecule: ${params.target || e.iupacName || "unspecified"}`,
      `SMILES (canonical, from PubChem): ${e.canonicalSMILES ?? params.smiles ?? "unspecified"}`,
    ];
    if (e.cid) lines.push(`PubChem CID: ${e.cid}`);
    if (e.molecularFormula) lines.push(`Molecular formula: ${e.molecularFormula}`);
    if (e.molecularWeight) lines.push(`Molecular weight: ${e.molecularWeight} g/mol`);
    if (e.iupacName) lines.push(`IUPAC name: ${e.iupacName}`);
    if (e.xLogP !== undefined) lines.push(`XLogP: ${e.xLogP}`);
    if (e.tpsa !== undefined) lines.push(`TPSA: ${e.tpsa} Å²`);
    if (e.rotatableBondCount !== undefined) lines.push(`Rotatable bonds: ${e.rotatableBondCount}`);
    if (e.heavyAtomCount !== undefined) lines.push(`Heavy atoms: ${e.heavyAtomCount}`);
    if (e.complexity !== undefined) lines.push(`Complexity: ${e.complexity}`);
    if (e.synonyms && e.synonyms.length > 0) {
      lines.push(`Known synonyms (top 8): ${e.synonyms.slice(0, 8).join(", ")}`);
    }
    if (e.description) {
      lines.push(`Compound description (from PubChem): ${e.description.slice(0, 500)}`);
    }
    moleculeBlock = lines.join("\n");
  } else {
    moleculeBlock = `Target molecule: ${params.target || "unspecified"}
SMILES: ${params.smiles || "unspecified"}`;
  }

  const userPrompt = `Chemist's instruction:
"""
${params.instruction}
"""

${moleculeBlock}

Candidate pathway (text description, provided by the Structural Translator agent):
"""
Convergent route. Step 1: build aryl core via Suzuki coupling. Step 2: install the core heterocycle via condensation. Step 3: late-stage functionalisation. No protecting groups used. Ring construction deferred to step 2.
"""

Evaluate this route against the chemist's instruction. Use the molecular properties above to inform your assessment (e.g. lipophilicity, polarity, ring complexity, rotatable bonds). Reply with the JSON object only.`;

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 700,
  });

  const raw =
    typeof completion === "string"
      ? completion
      : (completion?.choices?.[0]?.message?.content ?? "");

  const parsed = parseJsonLoose(raw);
  if (!parsed) {
    throw new Error("Model did not return parseable JSON.");
  }

  return {
    result: normaliseResult(parsed),
    latencyMs: Date.now() - started,
    raw,
  };
}

function parseJsonLoose(raw: string): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const slice =
    firstBrace >= 0 && lastBrace > firstBrace
      ? candidate.slice(firstBrace, lastBrace + 1)
      : candidate;
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function normaliseResult(parsed: unknown): EvaluatorResult {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const score = typeof obj.score === "number" ? obj.score : Number(obj.score) || 0;
  const verdict = typeof obj.verdict === "string" ? obj.verdict : "revise";
  const strategyAlignment =
    typeof obj.strategyAlignment === "string"
      ? obj.strategyAlignment
      : typeof obj.strategy_alignment === "string"
      ? (obj.strategy_alignment as string)
      : "";
  const oneLineSummary =
    typeof obj.oneLineSummary === "string"
      ? obj.oneLineSummary
      : typeof obj.one_line_summary === "string"
      ? (obj.one_line_summary as string)
      : "";
  const flagsArr = Array.isArray(obj.flags) ? obj.flags : [];
  const flags: EvaluatorFlag[] = flagsArr.map((f) => {
    const fo = (f ?? {}) as Record<string, unknown>;
    return {
      step: String(fo.step ?? "unspecified"),
      issue: String(fo.issue ?? ""),
      suggestion: String(fo.suggestion ?? ""),
    };
  });
  return {
    score: Math.max(0, Math.min(1, score)),
    verdict,
    strategyAlignment,
    flags,
    oneLineSummary,
  };
}
