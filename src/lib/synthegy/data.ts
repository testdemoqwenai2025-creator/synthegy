// Synthegy platform data — single source of truth for the demo.
// All content here is derived from the Synthegy framework brief:
// three core workflows (Retrosynthesis, Mechanism, Expert Alignment),
// implemented as multi-agent pipelines with natural-language interfaces.

export type AgentStatus = "idle" | "thinking" | "done" | "flagged";

export interface AgentSpec {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  icon: string; // lucide icon name
  accent: "primary" | "accent" | "chart3";
}

export interface WorkflowSpec {
  id: "retrosynthesis" | "mechanism" | "alignment";
  index: string; // "01" | "02" | "03"
  name: string;
  challenge: string;
  outcome: string;
  agents: AgentSpec[];
  accentLabel: string;
}

export const WORKFLOWS: WorkflowSpec[] = [
  {
    id: "retrosynthesis",
    index: "01",
    name: "Strategic Retrosynthesis Planner",
    challenge:
      "Traditional algorithms scan massive chemical spaces but lack the strategic judgment to decide when to build complex rings or use protecting groups.",
    outcome:
      "Routes are scored against global synthetic strategy — not just local connectivity — using natural-language constraints from the chemist.",
    accentLabel: "Strategy",
    agents: [
      {
        id: "rt-orchestrator",
        role: "Search Orchestrator",
        goal: "Generate a broad tree of raw chemical pathways for the target molecule via standard retrosynthesis software.",
        backstory:
          "Wraps existing rule-based engines (AiZynthFinder, ASKCOS) and exposes a unified pathway tree to downstream agents.",
        icon: "Network",
        accent: "primary",
      },
      {
        id: "rt-translator",
        role: "Structural Translator",
        goal: "Convert SMILES notations into natural-language descriptions so the reasoning agent can read the strategy.",
        backstory:
          "A specialised parser that turns complex chemical notation into prose a strategist can reason about — protecting groups, ring constructions, stereochemistry.",
        icon: "Languages",
        accent: "chart3",
      },
      {
        id: "rt-evaluator",
        role: "Strategic Evaluator (LLM)",
        goal: "Score text-based pathways against the chemist's natural-language instruction (e.g. 'avoid protecting groups').",
        backstory:
          "An expert chemist trained in strategy-aware retrosynthesis. Identifies routes that align with the global synthetic strategy rather than just local connectivity.",
        icon: "BrainCircuit",
        accent: "accent",
      },
    ],
  },
  {
    id: "mechanism",
    index: "02",
    name: 'Mechanistic "Electron-Pushing" Reasoner',
    challenge:
      "Computational tools often lack the intuition to pinpoint the most realistic reaction pathways among millions of theoretical possibilities.",
    outcome:
      "Steers the search away from mathematically possible but physically improbable mechanisms by reasoning about each elementary step.",
    accentLabel: "Intuition",
    agents: [
      {
        id: "mx-decomposer",
        role: "Step Decomposer",
        goal: "Break a proposed reaction into basic, elementary electron-moving steps.",
        backstory:
          "Decomposes every bond-making and bond-breaking event into discrete, inspectable steps that downstream agents can evaluate.",
        icon: "Split",
        accent: "primary",
      },
      {
        id: "mx-physicist",
        role: "Physical Chemist Reasoner (LLM)",
        goal: "Evaluate each step for chemical sense and steer search away from physically improbable mechanisms.",
        backstory:
          "Trained on arrow-pushing intuition. Uses strategic understanding to filter out mathematically plausible but chemically absurd pathways.",
        icon: "Atom",
        accent: "accent",
      },
      {
        id: "mx-refiner",
        role: "Contextual Refiner",
        goal: "Integrate text-supplied reaction conditions and expert hypotheses to refine the analysis toward realistic lab scenarios.",
        backstory:
          "Layers in solvent, temperature, catalyst and hypothesised intermediates so the analysis matches what a bench chemist would actually try.",
        icon: "FlaskConical",
        accent: "chart3",
      },
    ],
  },
  {
    id: "alignment",
    index: "03",
    name: "Expert Alignment & Iterative Interface",
    challenge:
      'Previous chemical tools relied on "cumbersome filters and rules" that slowed the innovation cycle.',
    outcome:
      "Chemists simply talk. An automated peer-reviewer flags unnecessary steps, aiming for the 71.2% expert-agreement rate observed in studies.",
    accentLabel: "Alignment",
    agents: [
      {
        id: "al-linguistic",
        role: "Linguistic Interface",
        goal: "Be the primary point of contact — let chemists describe complex goals in plain language.",
        backstory:
          "Translates free-form chemist intent into structured search constraints and back into human-readable explanations.",
        icon: "MessageSquareText",
        accent: "primary",
      },
      {
        id: "al-reviewer",
        role: "Critical Reviewer (LLM)",
        goal: "Perform an automated peer-review double-check on proposed solutions.",
        backstory:
          "Flags unnecessary steps, explains its reasoning, and targets the 71.2% agreement rate found in expert studies. Designed to be challengeable, not authoritative.",
        icon: "ShieldCheck",
        accent: "accent",
      },
      {
        id: "al-iteration",
        role: "Iteration Manager",
        goal: "Manage the loop between chemist and engine, updating search constraints in real-time based on the conversation.",
        backstory:
          "Keeps session state, applies deltas from each turn, and lets the chemist re-run a single step without restarting the whole pipeline.",
        icon: "Repeat",
        accent: "chart3",
      },
    ],
  },
];

// Live demo scenarios shipped with the platform — each is a self-contained
// walkthrough that exercises the agent pipeline end-to-end.
export interface DemoScenario {
  id: string;
  workflowId: WorkflowSpec["id"];
  title: string;
  target: string;
  smiles: string;
  instruction: string;
  steps: { agent: string; label: string; detail: string; status: AgentStatus }[];
  verdict: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
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

// Commercial value model — powers the ROI calculator.
// Numbers are illustrative but anchored to public pharma R&D economics.
export interface CommercialParams {
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
}

export const COMMERCIAL_PARAMS: CommercialParams[] = [
  {
    label: "Annual route-design projects",
    defaultValue: 240,
    min: 20,
    max: 2000,
    step: 10,
    unit: "projects/yr",
    description: "Number of synthetic route-design projects your org runs per year (med-chem + process).",
  },
  {
    label: "Avg. chemist-hours per project",
    defaultValue: 80,
    min: 10,
    max: 400,
    step: 5,
    unit: "hours",
    description: "Loaded chemist time spent evaluating routes before Synthegy.",
  },
  {
    label: "Loaded chemist cost",
    defaultValue: 180,
    min: 60,
    max: 400,
    step: 5,
    unit: "$/hour",
    description: "Fully-loaded hourly cost of a synthetic chemist (salary + benefits + overhead).",
  },
  {
    label: "Synthegy time reduction",
    defaultValue: 45,
    min: 15,
    max: 75,
    step: 5,
    unit: "%",
    description: "Share of route-evaluation time Synthegy eliminates (strategy-aware pre-filtering).",
  },
  {
    label: "Failed-route avoidance",
    defaultValue: 12,
    min: 0,
    max: 40,
    step: 1,
    unit: "%",
    description: "Share of routes that would have failed late - caught earlier by mechanistic reasoner.",
  },
  {
    label: "Avg. cost of a late failure",
    defaultValue: 280000,
    min: 50000,
    max: 2000000,
    step: 10000,
    unit: "$/failure",
    description: "Fully-loaded cost of a route that fails late (re-synthesis, lost time, repeated in vivo).",
  },
];

export interface UseCase {
  id: string;
  sector: "Pharmaceuticals" | "Materials Science" | "Agrochemicals" | "Fine Chemicals";
  title: string;
  summary: string;
  outcome: string;
  metrics: { label: string; value: string }[];
}

export const USE_CASES: UseCase[] = [
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

// Headline stats shown in the hero strip.
export const HERO_STATS = [
  { label: "Expert agreement", value: "71.2%", note: "vs. senior chemist review" },
  { label: "Avg. route-evaluation time", value: "-45%", note: "vs. rule-based pipelines" },
  { label: "Late-stage failures caught", value: "12%", note: "of routes pre-screened" },
  { label: "Natural-language interface", value: "100%", note: "no filters, no rules" },
];

// Code template shown in the implementation section.
export const DEPLOYMENT_CODE = `# Deployment Template for a Strategy-Aware Synthesis Agent
from chemical_logic_platform import Agent, Task, Crew

# 1. Define the Reasoning Agents (Source: Synthegy Model)
evaluator_agent = Agent(
    role='Strategic Chemical Evaluator',
    goal='Identify routes that satisfy natural language constraints from candidate pools',
    backstory='An expert chemist trained in strategy-aware retrosynthesis and electron-pushing.'
)

# 2. Define the Challenge-Based Tasks (Source: Retrosynthesis & Mechanism)
task_retrosynthesis = Task(
    description='Evaluate raw pathways for Target X. Instruction: "Avoid unnecessary protecting groups."',
    agent=evaluator_agent
)

task_mechanism = Task(
    description='Evaluate electron-pushing steps for Reaction Y to ensure physical plausibility.',
    agent=evaluator_agent
)

# 3. Execute the Agentic Workflow (Source: Bridging the Gap)
synthesis_crew = Crew(
    agents=[evaluator_agent],
    tasks=[task_retrosynthesis, task_mechanism],
    process='Sequential reasoning'
)

# Result: AI scores pathways and explains the "Why" (Source: ScienceDaily)
results = synthesis_crew.kickoff()`;

// Status ticker items shown in the marquee under the header.
export const STATUS_TICKER = [
  "Pipeline online - 3 agent crews ready",
  "Retrosynthesis tree cache - 1,247 targets indexed",
  "Mechanistic reasoner - v2.4 (arrow-pushing heuristics refreshed)",
  "Expert-alignment model - 71.2% agreement vs. senior chemist panel",
  "Pharma pilot - 4 sponsors - 18 routes under review",
  "Materials pilot - TADF emitter qualified in <1 quarter",
  "No-rule interface - plain-language constraints only",
];
