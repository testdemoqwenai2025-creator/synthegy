import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// Live "Strategic Evaluator" agent endpoint.
// Takes a chemist's natural-language instruction plus a candidate route
// description, returns a strategy score with reasoning — exactly the role
// Agent 3 of the Retrosynthesis workflow plays in the Synthegy brief.

export const runtime = "nodejs";

interface EvaluateBody {
  target?: string;
  smiles?: string;
  instruction?: string;
}

const SYSTEM_PROMPT = `You are the Strategic Evaluator agent inside the Synthegy agentic chemistry platform.

Your role (per the Synthegy framework): receive a chemist's natural-language instruction (e.g. "avoid protecting groups", "prefer convergent routes", "no toxic reagents") and evaluate a candidate synthetic pathway against that instruction. You score the route 0.0-1.0 on STRATEGIC fit (not just local connectivity) and explain the "why".

You MUST reply with VALID JSON ONLY, no markdown fences, no preamble, matching this schema:
{
  "score": number,            // 0.0 to 1.0
  "verdict": "accept" | "revise" | "reject",
  "strategyAlignment": string,  // 1-2 sentences on how well the route honours the instruction
  "flags": [                    // 0-3 items
    { "step": string, "issue": string, "suggestion": string }
  ],
  "oneLineSummary": string      // <= 140 chars, headline a chemist can scan
}

Rules:
- Stay strictly in chemistry domain. If the input is not chemistry-related, return score 0, verdict "reject", oneLineSummary "Out of domain - not a synthetic chemistry query."
- Be concrete and terse. Use chemistry vocabulary naturally (protecting group, convergent, late-stage functionalisation, etc.).
- Never invent specific yields/temperatures unless they are standard textbook values.
- Output JSON only.`;

export async function POST(req: Request) {
  let body: EvaluateBody;
  try {
    body = (await req.json()) as EvaluateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = (body.target ?? "").trim();
  const smiles = (body.smiles ?? "").trim();
  const instruction = (body.instruction ?? "").trim();

  if (!instruction) {
    return NextResponse.json(
      { error: "Missing 'instruction' — the chemist's natural-language constraint is required." },
      { status: 400 }
    );
  }

  const userPrompt = `Chemist's instruction:
"""
${instruction}
"""

Target molecule: ${target || "unspecified"}
SMILES: ${smiles || "unspecified"}

Candidate pathway (text description, provided by the Structural Translator agent):
"""
Convergent route. Step 1: build aryl core via Suzuki coupling. Step 2: install naphthoquinone via condensation. Step 3: late-stage hydroxylation. No protecting groups used. Ring construction deferred to step 2.
"""

Evaluate this route against the chemist's instruction. Reply with the JSON object only.`;

  try {
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

    // Best-effort JSON extraction — tolerate stray text / fences.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fenced ? fenced[1] : raw).trim();
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    const jsonSlice =
      firstBrace >= 0 && lastBrace > firstBrace
        ? candidate.slice(firstBrace, lastBrace + 1)
        : candidate;

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonSlice);
    } catch {
      return NextResponse.json(
        {
          error: "Model did not return parseable JSON.",
          raw: raw.slice(0, 1200),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Synthegy evaluator failed to respond.", detail: message },
      { status: 500 }
    );
  }
}
