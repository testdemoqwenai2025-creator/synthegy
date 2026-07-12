# Synthegy — Strategy-Aware AI for Synthetic Chemistry

A bench-to-bedside intelligence platform connecting **12 free public databases** through a single LLM reasoning layer — from molecular structure to clinical outcome, bench to bedside, in one platform.

## Live Platform

**👉 [https://preview-chat-6cbbdd64-b04b-40df-a2f3-12616b64fcbf.space-z.ai/](https://preview-chat-6cbbdd64-b04b-40df-a2f3-12616b64fcbf.space-z.ai/)**

## Architecture — 7 Tiers, 12 Data Sources, 4 Microservices

```
Browser → Caddy gateway (:81)
   ↓
Next.js :3000 (frontend — Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui)
   ↓
├─ :3001 Backend      — LLM Strategic Evaluator + sessions + collections + active-learning feedback
├─ :3002 Molecule     — PubChem (124M compounds) + ChEMBL (2.4M bioactive)
├─ :3003 Experimental — ORD (100K reactions) + RDKit ADMET + Europe PMC (40M citations)
├─ :3004 Biological   — RCSB PDB (220K structures) + KEGG pathways + OpenTargets diseases + Google Patents (100M+)
└─ :3005 Clinical     — 300 synthetic patients (6 diseases, 50-year span) + openFDA + WHO GHO + outcome prediction + CDISC SDTM export
```

### 12 Free Public Databases (no API keys required)

| Source | Scale | Capability |
|--------|-------|-----------|
| PubChem PUG REST | 124M compounds | Structure lookup, substructure search, property filter |
| NCBI E-utilities | 124M indexed | Ranked compound search, numerical property ranges |
| ChEMBL REST API | 2.4M bioactive | Bioactivity (IC50/Ki/Kd), mechanisms, target search |
| Open Reaction Database | 100K+ reactions | Real experimental procedures, inputs, conditions |
| RDKit (computed) | Deterministic | Lipinski, Veber, BBB, PAINS alerts, drug-likeness score |
| Europe PMC | 40M+ citations | Literature confidence scoring, top papers by citation |
| RCSB PDB | 220K+ structures | 3D protein structures, resolution, ligands |
| KEGG REST | 500+ pathways | Compound-to-pathway mapping |
| OpenTargets GraphQL | 100K+ associations | Target-to-disease scoring |
| Google Patents | 100M+ patents | Patent mining, assignee tracking, freedom-to-operate |
| openFDA | 600K+ events/drug | Real adverse event counts, top reactions, drug labels |
| WHO GHO | 3,070 indicators | Global health observatory, mortality, NCD data |

## Key Features

### The Knowledge Graph (core differentiator)
Traverses 4 databases in a single API call: **Compound** (PubChem) → **Targets** (ChEMBL + gene-symbol extraction) → **Pathways** (KEGG) → **Diseases** (OpenTargets, with association scores). Example: Aspirin → Cyclooxygenase (PTGS2) → 15 diseases (rheumatoid arthritis, gout, migraine, osteoarthritis, fever, pain, myocardial infarction) in under 2 seconds.

### Clinical Layer — 6 Diseases, 300 Patients, 50-Year Span
- 6 disease cohorts: rheumatoid arthritis, migraine, gout, osteoarthritis, ulcerative colitis, asthma
- 50 patients per disease (300 total), spanning 1975-2025 (50-year epidemiological basis)
- Disease-specific biomarkers, treatment eras, outcome metrics, and outlier types
- Real government data integration (openFDA adverse events + WHO health indicators)
- Outcome prediction model (logistic regression on biomarkers + treatment history)
- CDISC SDTM regulatory export (DM, AE, VS domains)
- RWE CSV import pipeline (swap synthetic for real patient data — one function changes, the platform adapts)
- **All patient data is synthetic** — designed for pipeline development

### Active Learning Feedback Loop
Records chemist accept/revise/reject signals on evaluator runs. Extracts keyword patterns from accepted vs revised instructions. Creates a proprietary preference profile that compounds with usage.

### Compound Collections + SDF/CSV Export
Save compound sets to named collections. Export as SDF (full connection table, loadable in RDKit/ChemDraw) or CSV (14 property columns). Per-collection download buttons.

## Project Structure

```
├── src/                                    # Next.js 16 frontend
│   ├── app/page.tsx                       # Single-route landing page
│   ├── components/synthegy/               # 15 platform components
│   │   ├── hero.tsx, workflows.tsx, demo.tsx
│   │   ├── molecule-explorer.tsx          # PubChem lookup + structure image
│   │   ├── advanced-search.tsx            # 4 tabs: substructure, filter, bioactivity, target
│   │   ├── collections-panel.tsx          # Named collections + SDF/CSV export
│   │   ├── reaction-explorer.tsx          # ORD experimental reactions
│   │   ├── compound-intelligence.tsx      # ADMET + literature confidence
│   │   ├── bio-intelligence.tsx           # Knowledge graph + PDB + patents
│   │   ├── clinical-cohort-explorer.tsx   # 300 patients, 6 diseases, gov data
│   │   ├── live-evaluator.tsx             # LLM Strategic Evaluator
│   │   ├── session-history.tsx, feedback-panel.tsx
│   │   └── ...
│   └── lib/synthegy/                      # API clients (ports 3001-3005)
├── mini-services/
│   ├── synthegy-backend/                  # Port 3001 — LLM + persistence
│   ├── synthegy-molecule/                 # Port 3002 — PubChem + ChEMBL
│   ├── synthegy-ord/                      # Port 3003 — ORD + ADMET + Europe PMC
│   ├── synthegy-bio/                      # Port 3004 — PDB + KEGG + OpenTargets + Patents
│   └── synthegy-clinical/                 # Port 3005 — Patients + FDA + WHO + prediction
├── download/                              # Deliverables
│   ├── Synthegy_Acquisition_Prospectus.pdf    # 8-page acquisition report
│   ├── Synthegy_Seed_Deck.pdf                 # 10-slide investor presentation
│   ├── legal/Synthegy_Provisional_Patent.pdf  # 12-page patent application (10 claims)
│   └── partnerships/Synthegy_Partnership_Package.pdf  # 13 target orgs + email templates + DSA
├── scripts/                               # PDF generation scripts
│   ├── synthegy_prospectus.py
│   └── synthegy_legal_commercial.py
├── Caddyfile                              # Gateway config (XTransformPort routing)
└── package.json
```

## API Reference (30+ endpoints across 5 services)

### Backend (:3001)
Sessions CRUD, evaluator (LLM), collections CRUD + bulk, feedback (active learning)

### Molecule (:3002)
Compound lookup (name/cid/smiles), search, substructure, property filter, similarity, bioactivity, target search, export (SDF/CSV), image proxy

### Experimental (:3003)
ORD reaction search, ADMET computation, Europe PMC literature, cache stats

### Biological (:3004)
PDB structure search, knowledge graph (compound→target→pathway→disease), patent search

### Clinical (:3005)
Disease list, patient list/detail, cohort analysis, cross-disease comparison, outcomes by era, government data (FDA+WHO), outcome prediction, CDISC SDTM export, compound-disease matching, CSV import

## Tech Stack

- **Framework**: Next.js 16 with App Router, TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Backend runtime**: Bun + Hono (all 5 microservices)
- **Python helpers**: ord_schema, RDKit, patient generator (invoked via subprocess)
- **Database**: SQLite (bun:sqlite, embedded, no external process)
- **LLM**: z-ai-web-dev-sdk (chat completions with structured JSON output)
- **Charts**: Recharts (pie, bar, area)
- **Animations**: Framer Motion
- **Caching**: SQLite with TTLs (30 days for properties, 7 days for literature, 24h for adverse events)

## Deliverables

| Document | File | Purpose |
|----------|------|---------|
| Acquisition Prospectus | `download/Synthegy_Acquisition_Prospectus.pdf` | 8-page report for 40 target organisations |
| Provisional Patent | `download/legal/Synthegy_Provisional_Patent.pdf` | 12-page patent application, 10 claims, ready to file at UKIPO/USPTO |
| Seed Deck | `download/Synthegy_Seed_Deck.pdf` | 10-slide investor presentation ($3-5M raise at $15-25M) |
| Partnership Package | `download/partnerships/Synthegy_Partnership_Package.pdf` | 13 target orgs + 3 email templates + DSA template |

## Getting Started

```bash
# Install frontend deps
bun install

# Start Next.js dev server (port 3000)
bun run dev

# Start microservices (each in separate terminal)
cd mini-services/synthegy-backend && bun install && bun spawn.ts    # port 3001
cd mini-services/synthegy-molecule && bun install && bun spawn.ts   # port 3002
cd mini-services/synthegy-ord && bun install && bun spawn.ts        # port 3003
cd mini-services/synthegy-bio && bun install && bun spawn.ts        # port 3004
cd mini-services/synthegy-clinical && bun install && bun spawn.ts   # port 3005
```

API key defaults to `synthegy-demo-key`. Override with `SYNTHYGY_API_KEY` env var.

## License

Demonstrator project. Chemistry data from PubChem, ChEMBL, ORD, Europe PMC, RCSB PDB, KEGG, OpenTargets, Google Patents, openFDA, and WHO — all free, public, no API keys. Patient data is entirely synthetic.

## Contact

synthegy.acquisition@gmail.com (forward to testdemoqwenai2025@gmail.com)

GitHub: https://github.com/testdemoqwenai2025-creator/synthegy

Live: https://preview-chat-6cbbdd64-b04b-40df-a2f3-12616b64fcbf.space-z.ai/
