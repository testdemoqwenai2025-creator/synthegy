// Seed data — mirrors the frontend's src/lib/synthegy/data.ts so the backend
// can serve scenarios + use cases from its own database.

export interface SeedStep {
  agent: string;
  label: string;
  detail: string;
  status: "idle" | "thinking" | "done" | "flagged";
}

export interface SeedScenario {
  id: string;
  workflowId: "retrosynthesis" | "mechanism" | "alignment";
  title: string;
  target: string;
  smiles: string;
  instruction: string;
  steps: SeedStep[];
  verdict: string;
}

export const seedScenarios: SeedScenario[] = [
  {
    id: "atovaquone",
    workflowId: "retrosynthesis",
    title: "Atovaquone — protect-group minimisation",
    target: "Atovaquone (antimalarial)",
    smiles: "O=C(O)C1=CC(O)=C(C2=CC=CC=C2Cl)C(O)=C1",
    instruction: "Avoid unnecessary protecting groups. Prefer convergent ring construction.",
    steps: [
      {
        agent: "Search Orchestrator",
        label: "Pathway tree generated",
        detail: "12 raw routes returned by AiZynthFinder. Median length: 7 steps. 4 routes contain >=2 protecting groups.",
        status: "done",
      },
      {
        agent: "Structural Translator",
        label: "Routes translated to prose",
        detail:
          'Each route now reads as: "Build the chlorophenyl ring first, then form the naphthoquinone via condensation - protected as TBS ether on C3."',
        status: "done",
      },
      {
        agent: "Strategic Evaluator",
        label: "Strategy scoring complete",
        detail:
          "Route 7 wins (score 0.91): convergent, zero protecting groups, ring construction deferred to late stage. Route 2 rejected: 3 sequential protections violate the chemist's instruction.",
        status: "done",
      },
    ],
    verdict:
      "Recommended route: 5 steps, convergent, no protecting groups. Estimated 38% step-count reduction vs. baseline tree.",
  },
  {
    id: "sonogashira",
    workflowId: "mechanism",
    title: "Sonogashira coupling - oxidative addition check",
    target: "Sonogashira coupling (aryl bromide + terminal alkyne)",
    smiles: "BrC1=CC=CC=C1  +  C#C-Ph  ->  C1=CC=CC=C1-C#C-Ph",
    instruction: "Check whether the Pd(0)/Pd(II) cycle is physically reasonable at 25 C without copper co-catalyst.",
    steps: [
      {
        agent: "Step Decomposer",
        label: "Elementary steps isolated",
        detail: "4 steps identified: (1) oxidative addition, (2) alkyne deprotonation, (3) transmetalation, (4) reductive elimination.",
        status: "done",
      },
      {
        agent: "Physical Chemist Reasoner",
        label: "Plausibility review",
        detail:
          "Step 2 (deprotonation) flagged: without Cu(I) co-catalyst, amine base alone is too weak at 25 C. Recommended either adding CuI or raising temperature to 60 C.",
        status: "flagged",
      },
      {
        agent: "Contextual Refiner",
        label: "Lab scenario applied",
        detail:
          'Under chemist-supplied conditions (Et3N, 25 C, no Cu): mechanism is borderline. Refiner proposes "Cu-free variant with PdCl2(PPh3)2 + iPr2NH at 50 C" as realistic alternative.',
        status: "done",
      },
    ],
    verdict:
      "Mechanism physically plausible only with amended conditions. Reviewer suggests copper-free variant to honour the chemist's original constraint.",
  },
  {
    id: "kinase-inhibitor",
    workflowId: "alignment",
    title: "Kinase inhibitor - expert-alignment review",
    target: "Lead compound LIB-417 (kinase inhibitor candidate)",
    smiles: "CC1=CC(NC2=NC=CC(N3CCNCC3)=N2)=CC=C1",
    instruction: "Review the proposed 8-step route. Flag anything a senior med-chem reviewer would push back on.",
    steps: [
      {
        agent: "Linguistic Interface",
        label: "Intent parsed",
        detail: "Chemist request mapped to 3 structured constraints: <=7 steps, no chromatography, late-stage diversification handle retained.",
        status: "done",
      },
      {
        agent: "Critical Reviewer",
        label: "Peer-review pass",
        detail:
          "Flagged step 5 (Boc deprotection then immediate re-protection): unnecessary round-trip. Flagged step 7: low-yielding SNAr that would not survive scale-up.",
        status: "flagged",
      },
      {
        agent: "Iteration Manager",
        label: "Constraints updated",
        detail:
          "Pipeline re-run with constraint: 'eliminate Boc round-trip; replace SNAr with Buchwald-Hartwig.' New 6-step route returned. Chemist can accept or push back per-step.",
        status: "done",
      },
    ],
    verdict:
      "71% agreement with senior reviewer on flagged steps. 2-step reduction. Late-stage diversification handle preserved.",
  },
];

export interface SeedUseCase {
  id: string;
  sector: "Pharmaceuticals" | "Materials Science" | "Agrochemicals" | "Fine Chemicals";
  title: string;
  summary: string;
  outcome: string;
  metrics: { label: string; value: string }[];
}

export const seedUseCases: SeedUseCase[] = [
  {
    id: "pharma-route",
    sector: "Pharmaceuticals",
    title: "Late-stage diversification for a kinase lead series",
    summary:
      "A med-chem team needed 40 analogues of a lead compound in 8 weeks. Standard route required re-synthesis for each variant. Synthegy flagged a common intermediate and proposed a late-stage diversification handle retained through 6 steps.",
    outcome:
      "All 40 analogues delivered from a single 6-step core. Chemist time per analogue dropped from 5 days to 1.2 days.",
    metrics: [
      { label: "Analogues", value: "40" },
      { label: "Time saved", value: "6.4 wks" },
      { label: "Cost / analogue", value: "-76%" },
    ],
  },
  {
    id: "pharma-process",
    sector: "Pharmaceuticals",
    title: "Process-route redesign for an API entering Phase II",
    summary:
      "An API had a 12-step research route with 3 chromatographies - unviable at 50 kg scale. Synthegy's Strategic Evaluator rejected routes with protecting groups; the Critical Reviewer flagged a low-yielding SNAr.",
    outcome:
      "Process route delivered in 7 steps, no chromatography, 4x overall yield. Tech-transfer completed 5 months earlier than baseline.",
    metrics: [
      { label: "Steps", value: "12 -> 7" },
      { label: "Overall yield", value: "4.1x" },
      { label: "Tech transfer", value: "-5 mo" },
    ],
  },
  {
    id: "materials-oled",
    sector: "Materials Science",
    title: "Convergent synthesis of a TADF emitter",
    summary:
      "A thermally-activated delayed fluorescence (TADF) emitter required a sterically congested biaryl. Traditional stepwise coupling gave <8% yield. Synthegy proposed a convergent [4+2] / Suzuki cascade with ring construction deferred to the final step.",
    outcome:
      "Yield lifted from 8% to 41% on first lab attempt. Emitter qualified for OLED stack within one quarter.",
    metrics: [
      { label: "Yield", value: "8% -> 41%" },
      { label: "Lab attempts", value: "1" },
      { label: "Time to stack", value: "1 qtr" },
    ],
  },
  {
    id: "materials-perovskite",
    sector: "Materials Science",
    title: "Ligand library for a lead-stable perovskite",
    summary:
      "A perovskite group needed 24 organic ammonium ligands to screen for moisture stability. Synthegy's mechanism reasoner flagged that 6 of the proposed ligands would not survive the acidic workup, and proposed protected variants.",
    outcome:
      "18 of 24 ligands synthesised in one pass (vs. expected 12). 3 lead-stable candidates identified within a single screen.",
    metrics: [
      { label: "Ligands screened", value: "24" },
      { label: "First-pass yield", value: "+50%" },
      { label: "Lead candidates", value: "3" },
    ],
  },
  {
    id: "agro-fungicide",
    sector: "Agrochemicals",
    title: "Safer route to a strobilurin fungicide",
    summary:
      "An agrochemical candidate had a route using a toxic phosgene equivalent. Synthegy's Strategic Evaluator proposed a carbonyldiimidazole (CDI) alternative that satisfied the chemist's 'no toxic reagents' instruction.",
    outcome:
      "Route qualified for pilot plant. EHS approval cycle shortened from 14 to 6 weeks.",
    metrics: [
      { label: "Toxic reagents", value: "Eliminated" },
      { label: "EHS approval", value: "-8 wks" },
      { label: "Pilot yield", value: "+22%" },
    ],
  },
  {
    id: "fine-flavor",
    sector: "Fine Chemicals",
    title: "Stereoselective route to a fragrance scaffold",
    summary:
      "A macrocyclic musk required a specific (E)-alkene. Existing routes gave mixtures. Synthegy's Mechanistic Reasoner verified that an Ando-modified HWE would deliver the (E)-isomer under the chemist's solvent constraints.",
    outcome:
      "(E)/(Z) ratio improved from 3:1 to >24:1. Fragrance qualified on first submission to the customer.",
    metrics: [
      { label: "(E)/(Z) ratio", value: "24:1" },
      { label: "Submission attempts", value: "1" },
      { label: "Customer approval", value: "First pass" },
    ],
  },
];
