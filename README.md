# Synthegy — Strategy-Aware AI for Synthetic Chemistry

An agentic reasoning platform that bridges computation and chemical intuition. Synthegy deploys three coordinated agent crews — Strategic Retrosynthesis, Mechanistic Electron-Pushing, and Expert Alignment — backed by a PubChem + ChEMBL molecular intelligence layer.

## Architecture

```
Browser → Caddy gateway (:81)
            ↓
   ┌────────┴────────┐
   ↓                 ↓
Next.js :3000    (XTransformPort routing)
   ↓
   ├─ /api/* → Backend :3001 (LLM Strategic Evaluator + SQLite)
   └─ /api/molecule/* → Molecule :3002
                          ├─ PubChem PUG REST (124M compounds)
                          │   ├─ /name /cid /smiles (lookup)
                          │   ├─ /search (E-utilities ranked)
                          │   ├─ /substructure (scaffold match)
                          │   ├─ /filter (XLogP/TPSA/MW ranges)
                          │   ├─ /similarity (2D Tanimoto)
                          │   ├─ /export/sdf + /export/csv
                          │   └─ /image (PNG proxy)
                          └─ ChEMBL REST API (2.4M bioactive)
                              ├─ /bioactivity (mechanism + IC50/Ki)
                              └─ /targets/search + /targets/:id/compounds
```

### Four tiers

1. **Frontend** (Next.js 16, port 3000) — React + TypeScript + Tailwind CSS 4 + shadcn/ui
2. **Middleware** (Hono gateway) — request logger, API-key auth, token-bucket rate limiter, error handler, CORS
3. **Backend** (Bun + Hono, port 3001) — LLM Strategic Evaluator, SQLite persistence for sessions/runs/collections
4. **Molecule** (Bun + Hono, port 3002) — PubChem + ChEMBL wrapper with SQLite cache (30-day TTL)

## Features

### Agentic workflows
- **Strategic Retrosynthesis Planner** — Search Orchestrator → Structural Translator → Strategic Evaluator (LLM)
- **Mechanistic Electron-Pushing Reasoner** — Step Decomposer → Physical Chemist (LLM) → Contextual Refiner
- **Expert Alignment & Iterative Interface** — Linguistic Interface → Critical Reviewer (LLM) → Iteration Manager

### Molecular intelligence
- **Compound lookup** by name, CID, or SMILES (PubChem)
- **Substructure search** — find all compounds containing a SMILES scaffold
- **Property filtering** — XLogP, TPSA, MW, H-bond donors/acceptors, rotatable bonds, complexity (9 fields)
- **2D similarity search** — Tanimoto-based
- **ChEMBL bioactivity** — mechanism of action, IC50/Ki/Kd/EC50 measurements, drug-development metadata
- **Target-based search** — find compounds active against a named protein target (e.g. "cyclooxygenase")
- **Structure images** — 2D PNG proxy with 30-day cache
- **SDF/CSV export** — download compound sets with full connection table

### Collections
- Save compound sets to named collections (persisted in SQLite)
- Bulk-add search results with one click
- Export collections as SDF (for RDKit/ChemDraw) or CSV (for Excel/pandas)
- Per-compound structure thumbnails and properties

### Commercial value
- Interactive ROI calculator (6 sliders, live charts)
- 6 sector-tagged use cases (pharma, materials, agro, fine chemicals)
- Deployment template for LangChain/CrewAI/AutoGen

## Data sources

| Source | URL | Size | Key |
|--------|-----|------|-----|
| PubChem PUG REST | https://pubchem.ncbi.nlm.nih.gov/rest/pug | 124M compounds | None required |
| NCBI E-utilities | https://eutils.ncbi.nlm.nih.gov/entrez/eutils | — | None required |
| ChEMBL | https://www.ebi.ac.uk/chembl/api/data | 2.4M bioactive | None required |

All three are free, public, and require no API key.

## Tech stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Backend runtime**: Bun
- **Backend framework**: Hono
- **Database**: SQLite (via bun:sqlite)
- **LLM**: z-ai-web-dev-sdk
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting started

### Prerequisites
- Node.js 20+ or Bun 1.3+
- No external database required (SQLite is embedded)

### Install and run

```bash
# Install frontend deps
bun install

# Start the Next.js dev server (port 3000)
bun run dev

# In separate terminals, start the mini-services:
cd mini-services/synthegy-backend && bun install && bun run dev    # port 3001
cd mini-services/synthegy-molecule && bun install && bun run dev   # port 3002
```

### API keys

Both mini-services default to `synthegy-demo-key`. Set `SYNTHYGY_API_KEY` env var to override.

## Project structure

```
.
├── src/                                    # Next.js frontend
│   ├── app/                               # App Router pages
│   │   ├── page.tsx                       # Landing page (single route)
│   │   ├── layout.tsx
│   │   └── globals.css                    # Synthegy dark theme
│   ├── components/synthegy/               # Platform components
│   │   ├── hero.tsx
│   │   ├── workflows.tsx                  # 3 crew tabs
│   │   ├── demo.tsx                       # Live demo console
│   │   ├── molecule-explorer.tsx          # PubChem lookup + structure
│   │   ├── advanced-search.tsx            # 4 tabs: substructure/filter/bioactivity/target
│   │   ├── collections-panel.tsx          # Named collections + SDF/CSV export
│   │   ├── live-evaluator.tsx             # LLM Strategic Evaluator UI
│   │   ├── session-history.tsx            # Persisted run history
│   │   ├── commercial-value.tsx           # ROI calculator
│   │   ├── use-cases.tsx                  # Sector case studies
│   │   ├── architecture.tsx               # 4-tier diagram
│   │   ├── deploy.tsx                     # Code template + platform compat
│   │   └── cta.tsx
│   ├── lib/synthegy/
│   │   ├── data.ts                        # Static data (workflows, scenarios, use cases)
│   │   ├── api.ts                         # Backend API client (port 3001)
│   │   └── molecule-api.ts                # Molecule API client (port 3002)
│   └── hooks/
│       └── use-synthegy-session.ts        # Session management hook
├── mini-services/
│   ├── synthegy-backend/                  # Port 3001 — LLM + persistence
│   │   ├── index.ts                       # Hono app entry
│   │   ├── src/
│   │   │   ├── db.ts                      # SQLite schema + seed
│   │   │   ├── lib/llm.ts                 # Strategic Evaluator LLM wrapper
│   │   │   ├── lib/validators.ts          # Zod schemas
│   │   │   ├── middleware/                # logger, auth, rateLimit, errorHandler
│   │   │   ├── routes/                    # health, scenarios, useCases, sessions, evaluate, collections
│   │   │   └── data/seed.ts
│   │   └── spawn.ts                       # Detached process spawner
│   └── synthegy-molecule/                 # Port 3002 — PubChem + ChEMBL
│       ├── index.ts
│       ├── src/
│       │   ├── cache.ts                   # SQLite cache with TTL
│       │   ├── pubchem.ts                 # PubChem PUG REST + E-utilities client
│       │   ├── chembl.ts                  # ChEMBL REST client
│       │   ├── middleware/
│       │   └── routes/molecule.ts         # 17 endpoints
│       └── spawn.ts
├── prisma/                                # Prisma schema (for the frontend app)
├── Caddyfile                              # Gateway config (XTransformPort routing)
└── package.json
```

## API reference

### Backend (port 3001)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe (no auth) |
| GET | `/api/scenarios` | List demo scenarios |
| GET | `/api/use-cases?sector=` | List sector use cases |
| GET | `/api/sessions` | List chemist sessions |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions/:id` | Get session with runs |
| PATCH | `/api/sessions/:id` | Update session label |
| DELETE | `/api/sessions/:id` | Delete session |
| POST | `/api/evaluate` | Run LLM Strategic Evaluator (with optional PubChem enrichedContext) |
| GET | `/api/evaluate/:id` | Retrieve persisted run |
| GET | `/api/collections` | List named collections |
| POST | `/api/collections` | Create collection |
| GET | `/api/collections/:id` | Get collection with items |
| PATCH | `/api/collections/:id` | Update collection |
| DELETE | `/api/collections/:id` | Delete collection |
| POST | `/api/collections/:id/items` | Add compound to collection |
| POST | `/api/collections/:id/items/bulk` | Bulk-add compounds |
| DELETE | `/api/collections/:id/items/:cid` | Remove compound |

### Molecule service (port 3002)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/api/molecule/name/:name` | Full record by name |
| GET | `/api/molecule/cid/:cid` | Full record by CID |
| GET | `/api/molecule/smiles/:smiles` | Full record by SMILES |
| GET | `/api/molecule/search?q=&limit=` | Ranked search (E-utilities) |
| GET | `/api/molecule/similarity?smiles=&threshold=&max=` | 2D similarity |
| GET | `/api/molecule/substructure?smiles=&max=` | Substructure search |
| GET | `/api/molecule/filter?fields=XLGP:2:4,TPSA:60:100&limit=` | Property filter |
| GET | `/api/molecule/bioactivity?inchikey=&type=IC50` | ChEMBL bioactivity |
| GET | `/api/molecule/targets/search?q=` | ChEMBL target search |
| GET | `/api/molecule/targets/:chemblId/compounds?type=&limit=` | Active compounds for target |
| GET | `/api/molecule/export/sdf?cids=2244,5161` | SDF download |
| GET | `/api/molecule/export/csv?cids=2244,5161` | CSV download |
| GET | `/api/molecule/name/:name/image?size=` | 2D structure PNG |
| GET | `/api/molecule/cid/:cid/image?size=` | PNG by CID |
| GET | `/api/molecule/cid/:cid/synonyms` | Synonyms only |
| GET | `/api/molecule/stats` | Cache statistics |
| POST | `/api/molecule/cache/clear` | Purge expired cache |

## License

Demonstrator project. Chemistry outputs shown are illustrative and powered by public data from PubChem and ChEMBL.
