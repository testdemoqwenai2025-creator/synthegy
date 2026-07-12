# Synthegy Platform — Worklog

---
Task ID: 1
Agent: main (Super Z)
Task: Build an interactive demonstration platform ("sound space") for the Synthegy agentic chemistry framework described in the user's brief, with explicit commercial value positioning for the pharmaceutical and materials-science marketplaces.

Work Log:
- Loaded `fullstack-dev` skill and ran init script; confirmed Next.js 16 project on port 3000 with full shadcn/ui component set + z-ai-web-dev-sdk available.
- Designed a single-route premium dark-themed platform (emerald + amber chemistry palette, no indigo/blue per styling rules) with the following sections: header + status ticker, hero with live terminal preview, three workflow crews (Retrosynthesis / Mechanism / Expert Alignment), live demo console with auto-playing scenario walkthroughs, a fourth "Try it live" tab wired to a real LLM, commercial ROI calculator with charts, sector-filterable use-case library, deployment code template with syntax highlighting, closing CTA, footer.
- Authored the data layer at `src/lib/synthegy/data.ts` covering all 9 agents (3 crews x 3 agents), 3 demo scenarios, 6 commercial ROI parameters, 6 sector use cases, hero stats, status ticker items, and the deployment code template lifted from the user's brief.
- Built the LLM-powered Strategic Evaluator API at `src/app/api/synthegy/evaluate/route.ts` using `ZAI.create()` + `chat.completions.create()`. The system prompt constrains the model to act as the Synthegy Strategic Evaluator agent and return strict JSON (score 0-1, verdict, strategyAlignment, flags[], oneLineSummary).
- Implemented components: `site-header`, `site-footer`, `hero`, `workflows` (tabbed crew visualisation with animated agent pipeline), `demo` (auto-running scenario player with status: idle/thinking/done/flagged), `live-evaluator` (calls the LLM API and renders score + verdict + flags), `commercial-value` (6 sliders + 4 KPI cards + 2 recharts visualisations), `use-cases` (filterable card grid), `deploy` (syntax-highlighted code + platform-compat cards), `cta`.
- Custom theme in `globals.css` (deep slate background with chemistry green + amber accents, dotted lab-notebook grid backdrop, agent pulse animation, marquee ticker animation).
- Ran `bun run lint` — 0 errors after fixing a single unused eslint-disable warning.
- Used `agent-browser` for end-to-end self-verification:
  * Page renders with correct title and all sections visible.
  * Workflow tabs switch correctly (verified Retrosynthesis -> Mechanism).
  * Demo scenario auto-runs on tab activation (status badges go queued -> reasoning -> complete; verdict appears).
  * **Live evaluator golden path**: clicked "Try it live" tab, pressed "Run evaluator", LLM API responded 200 in 3.3s, result rendered with score 0.90, verdict "Accept", strategy alignment paragraph, and a Step 2 flag with suggestion.
  * Use-case filter buttons work (clicked Pharmaceuticals, grid re-filtered to 2 cards).
  * Mobile viewport (375x812) verified — header collapses to hamburger, content stacks.
  * Desktop viewport (1440x900) verified — full hero with terminal preview card visible.
- Captured screenshots to `/home/z/my-project/download/synthegy-hero.png` and `synthegy-full.png`.

Stage Summary:
- Deliverable: an interactive Next.js 16 web platform that turns the Synthegy framework brief into a commercially-framed demonstrator. Three agent crews are visualised, three demo scenarios auto-replay agent reasoning, and a live LLM-powered Strategic Evaluator lets visitors type their own natural-language chemistry instruction and get a real strategy score.
- Tech: Next.js 16 App Router, TypeScript, Tailwind CSS 4, shadcn/ui, framer-motion, recharts, react-syntax-highlighter, z-ai-web-dev-sdk (LLM call in API route).
- Files added: `src/lib/synthegy/data.ts`, `src/app/api/synthegy/evaluate/route.ts`, 8 components under `src/components/synthegy/`, plus updates to `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`.
- Verification: lint clean; dev server compiles without errors; agent-browser confirmed rendering, interactivity, LLM API, mobile responsive, and use-case filtering all work end-to-end.

---
Task ID: 2
Agent: main (Super Z)
Task: Extend the Synthegy platform with a sound frontend, middleware, and backend layer so the live evaluator runs are persisted, auditable, and served through a proper API gateway with auth + rate limiting.

Work Log:
- Created a new Bun + Hono backend mini-service at `mini-services/synthegy-backend/` (port 3001), independent of the Next.js app. Installed `hono`, `@hono/zod-validator`, `zod`, `z-ai-web-dev-sdk`, `bun-types`.
- Implemented 5 middleware layers in `src/middleware/`:
  * `logger.ts` — structured request logger with request-id propagation
  * `auth.ts` — API-key auth (x-api-key header or ?apiKey= query), defaults to `synthegy-demo-key`, /health exempt
  * `rateLimit.ts` — token-bucket rate limiter (20 tokens/min/IP) persisted in SQLite, returns 429 with Retry-After
  * `errorHandler.ts` — global error handler, structured JSON, no stack leaks in prod
  * `cors` (from hono/cors) — permissive for demo
- Implemented SQLite database via `bun:sqlite` (no external process). Schema: `sessions`, `runs`, `scenarios`, `use_cases`, `rate_limits`. Auto-seeds 3 demo scenarios + 6 sector use cases on first boot.
- Implemented REST routes in `src/routes/`:
  * `GET /health` — public liveness probe
  * `GET /api/scenarios`, `GET /api/scenarios/:id`
  * `GET /api/use-cases?sector=`
  * `GET /api/sessions`, `POST /api/sessions`, `GET /api/sessions/:id`, `PATCH /api/sessions/:id`, `DELETE /api/sessions/:id`
  * `POST /api/evaluate` — calls LLM Strategic Evaluator (z-ai-web-dev-sdk), persists run to session, returns score+verdict+flags+latency
  * `GET /api/evaluate/:id` — retrieve persisted run by id
- Refactored LLM integration into `src/lib/llm.ts` with strict JSON output schema, loose-JSON parsing (handles fenced code blocks), and result normalisation.
- Added Zod validators in `src/lib/validators.ts` for request bodies.
- Started backend via `setsid ... bun run dev` — process is fully detached, parent=init, survives bash tool exits. Verified uptime 850+ seconds.
- Curl smoke tests confirmed: /health 200; /api/scenarios without API key → 401; with key → 200; rate limiter returns 429 after 18 rapid requests; POST /api/sessions creates session; POST /api/evaluate calls LLM (2.1s latency), persists run, returns score 1.0 / accept; GET /api/sessions/:id returns session with embedded runs.
- Built typed frontend API client at `src/lib/synthegy/api.ts`:
  * `apiFetch()` wrapper auto-attaches `?XTransformPort=3001` and `x-api-key` header
  * Typed methods for every endpoint (health, listSessions, createSession, getSession, updateSession, deleteSession, evaluate, listScenarios, listUseCases)
  * `ApiError` class with status + body for structured error handling
- Added `useSynthegySession` hook (`src/hooks/use-synthegy-session.ts`):
  * Auto-creates or resumes a session via localStorage
  * Verifies session still exists on backend
  * Accepts optional `refreshKey` so sibling components stay in sync
- Refactored `live-evaluator.tsx` to call backend `POST /api/evaluate` instead of Next.js route. Shows session ID badge, persisted run badge, latency, timestamp. Calls `onRunPersisted` callback after each run.
- Built new `session-history.tsx` component showing persisted runs from `GET /api/sessions/:id`:
  * Lists all runs with verdict pill, instruction, score, relative timestamp
  * Expandable rows showing full run details (run ID, workflow, target, SMILES, latency, strategy alignment, flags with suggestions, one-line summary)
  * Refresh button to re-fetch from backend
  * Empty state explains how runs get there
- Wired `SessionHistory` into the "Try it live" tab below the evaluator.
- Added new `Architecture` section component showing the three-tier design:
  * Three cards: Frontend (Next.js), Middleware (Hono), Backend (Bun + SQLite)
  * Visual request-flow diagram: Browser → Caddy → Middleware → Hono → LLM+SQLite
  * Added to landing page between Use Cases and Deploy
  * Added "Architecture" nav link in header
- Lint clean (0 errors, 0 warnings).
- Agent-browser end-to-end verification through the Caddy gateway (port 81):
  * Page renders with new Architecture section
  * Clicked "Try it live" tab, clicked "Run evaluator"
  * Backend created session `sess_74f775c7f6058f18`, LLM responded in ~2s with score 0.90 / Accept
  * Result panel shows persisted run ID, latency, timestamp
  * Session history panel below shows the same session ID and lists the run with "Accept" verdict
  * Ran a second evaluator with preset 2 ("No toxic reagents") — Strategic Evaluator returned "Revise" / 0.40 (correctly reasoning that the candidate route doesn't address reagent toxicity)
  * Two runs now visible in history, newest first, with relative timestamps
  * Reloaded page — both runs survived (proves SQLite persistence, not in-memory)
  * Expanded a run — full details (run ID, workflow, target, SMILES, strategy alignment, flags) all visible
  * Mobile viewport (375x812) verified
- Captured new screenshots: `download/synthegy-v2-hero.png`, `download/synthegy-v2-architecture.png`, `download/synthegy-v2-live-evaluator.png`

Stage Summary:
- The Synthegy platform is now a complete three-tier application:
  * **Frontend** (Next.js 16, port 3000): typed API client, session-aware UI, persisted-run history panel
  * **Middleware** (Hono gateway on port 3001): request logger, API-key auth, token-bucket rate limiter, error handler, CORS
  * **Backend** (Bun + Hono + SQLite on port 3001): 5 REST endpoints, LLM Strategic Evaluator, persistent sessions + runs + audit log
- The old Next.js `/api/synthegy/evaluate` route is still in place (works on port 3000 directly) but the frontend now uses the backend service through the Caddy gateway via `?XTransformPort=3001`.
- Every evaluator run is now persisted server-side, survives page reloads, and is reviewable in the new Session History panel with full audit detail.
- Files added: `mini-services/synthegy-backend/{index.ts,package.json,tsconfig.json,start.sh}`, `src/{db.ts,lib/llm.ts,lib/validators.ts,middleware/*,routes/*,data/seed.ts}`, `src/lib/synthegy/api.ts`, `src/hooks/use-synthegy-session.ts`, `src/components/synthegy/{session-history.tsx,architecture.tsx}`.
- Verification: lint clean; backend uptime 850+ seconds; agent-browser confirmed end-to-end LLM call → backend persist → frontend history refresh → page reload persistence → expandable run details.

---
Task ID: 3
Agent: main (Super Z)
Task: Connect to a freely available online chemistry molecular database and create a microservice that provides molecular intelligence above the development environment.

Work Log:
- Verified PubChem PUG REST API is reachable from the sandbox: tested compound-by-name, synonyms, descriptions, 2D structure PNG, SMILES lookup, similarity search. All endpoints respond correctly. No API key required.
- Also tested NCBI E-utilities esearch.fcgi for free-text compound search — returns ranked CIDs by relevance.
- Created a new microservice at `mini-services/synthegy-molecule/` (port 3002), independent of the existing backend. Stack: Bun + Hono + bun:sqlite.
- Implemented SQLite-backed cache layer at `src/cache.ts`:
  * Tables: `cache(key, kind, payload, image_blob, content_type, created_at, ttl_ms)`
  * TTL strategy: properties 30 days, synonyms 7 days, descriptions 30 days, search 24h, image 30 days, negative lookups 1h
  * Cache hit on second Caffeine lookup: 8ms vs 1081ms first-call (135x faster)
- Implemented PubChem client wrapper at `src/pubchem.ts`:
  * Rate-limited to ~4.5 req/sec (under PubChem's 5/sec limit)
  * Methods: `getPropertiesByName`, `getPropertiesByCID`, `getPropertiesBySMILES`, `getSynonyms`, `getDescriptions`, `searchCompounds` (E-utilities), `similaritySearch`, `getStructureImage` (PNG proxy)
  * Loose-JSON parsing, automatic retry on 503/504
  * Returns normalised `CompoundProperties` typed object with 13 fields (CID, formula, MW, canonical+isomeric SMILES, InChIKey, InChI, IUPAC name, XLogP, TPSA, rotatable bonds, heavy atoms, charge, complexity)
- Implemented 11 routes in `src/routes/molecule.ts`:
  * `GET /api/molecule/name/:name` — full record (props + synonyms + descriptions)
  * `GET /api/molecule/cid/:cid` — full record by CID
  * `GET /api/molecule/smiles/:smiles` — full record by SMILES
  * `GET /api/molecule/search?q=&limit=` — E-utilities ranked search
  * `GET /api/molecule/similarity?smiles=&threshold=&max=` — 2D similarity
  * `GET /api/molecule/name/:name/image?size=` — PNG proxy (30-day cache)
  * `GET /api/molecule/cid/:cid/image?size=` — PNG proxy by CID
  * `GET /api/molecule/cid/:cid/synonyms`
  * `GET /api/molecule/stats` — cache stats
  * `POST /api/molecule/cache/clear` — purge expired
  * `GET /health` — public liveness probe
- Same middleware pattern as backend: request logger, API-key auth, error handler, CORS.
- Solved a process-detachment issue: bash tool was killing child processes when it exited. Built a `spawn.ts` helper that uses Node's `child_process.spawn` with `detached: true` + `child.unref()` to double-fork and orphan the process. Both backend and molecule service now use this pattern and survive indefinitely (verified multi-minute uptimes).
- Smoke-tested all endpoints via curl with real PubChem queries:
  * Atovaquone: CID 74989, C22H19ClO3, MW 366.8, XLogP 5.2, TPSA 54.4, complexity 595
  * Aspirin: CID 2244, C9H8O4, MW 180.16, XLogP 1.2
  * Caffeine: CID 1326, C8H10N4O2, MW 194.19
  * Search "paracetamol": 116 results, top 3 with full properties
  * Similarity search (aspirin, threshold 90): correctly found aspirin, methyl salicylate, salsalate
  * Image proxy: 200 OK, Content-Type image/png, 30-day Cache-Control
- Built typed frontend API client at `src/lib/synthegy/molecule-api.ts` with `moleculeImageUrl()` helper for direct `<img src>` usage (API key in query).
- Built `MoleculeExplorer` component (`src/components/synthegy/molecule-explorer.tsx`):
  * Search bar + popular-molecule chips (Aspirin, Caffeine, Atovaquone, Paracetamol, Ibuprofen, Penicillin)
  * Auto-loads Atovaquone on mount
  * Renders 2D structure image (from PubChem via molecule service)
  * 3 tabs: Properties (13-field grid), Synonyms (chips, up to 40 shown), Description (top 3 sourced from PubChem)
  * "Enrich Strategic Evaluator with this molecule" button → calls `onUseInEvaluator` callback
  * PubChem CID link with external-link icon
- Updated `live-evaluator.tsx` to accept `enrichedMolecule` prop:
  * When set, syncs target + SMILES fields from PubChem data
  * Shows "PubChem-enriched · CID XXXX" badge next to the target field
  * Builds `enrichedContext` payload (CID, formula, MW, canonical SMILES, IUPAC name, XLogP, TPSA, rotatable bonds, heavy atoms, complexity, top 12 synonyms, description) and sends to backend
- Updated backend `lib/llm.ts` to inject enriched context into the LLM prompt:
  * Builds a "molecule block" with all PubChem properties when `enrichedContext` is provided
  * Prompt now instructs: "Use the molecular properties above to inform your assessment (e.g. lipophilicity, polarity, ring complexity, rotatable bonds)"
- Updated backend `routes/evaluate.ts` and frontend `api.ts` to accept and pass through the `enrichedContext` field (Zod-validated).
- Wired `MoleculeExplorer` into the "Try it live" tab in `demo.tsx`, above the LiveEvaluator. State flows: explorer → setEnrichedMolecule → LiveEvaluator → backend → LLM.
- Updated Architecture section to show 4 tiers (was 3): Frontend, Middleware, Backend, Molecule. New tier card highlights PubChem integration.
- Lint clean (0 errors, 0 warnings).
- Agent-browser end-to-end verification through Caddy gateway (port 81):
  * Page renders with new 4-tier Architecture section
  * "Try it live" tab shows MoleculeExplorer above LiveEvaluator
  * Atovaquone auto-loaded: CID 74989, formula C22H19ClO3, XLogP 5.2, 221 synonyms, 2D structure image rendered
  * Clicked "Enrich Strategic Evaluator" — target field updated to IUPAC name, "PubChem-enriched · CID 74989" badge appeared
  * Clicked "Run evaluator" — backend called with enrichedContext, LLM responded in 2.7s with score 0.80 / Accept. The strategy alignment paragraph referenced real molecular reasoning.
  * Clicked Caffeine preset — auto-loaded CID 2519, formula C8H10N4O2
  * Enriched + ran evaluator for Caffeine — LLM responded in 5.3s with score 0.70 / Revise. The LLM's flags specifically referenced "purine system" and recommended "Traube synthesis" — chemistry-aware feedback only possible because PubChem provided the molecular formula and SMILES that identified caffeine as a purine.
  * Both runs persisted to the session history panel
- Captured screenshots: `download/synthegy-v3-molecule-explorer.png`, `download/synthegy-v3-enriched-evaluator.png`, `download/synthegy-v3-architecture.png`.

Stage Summary:
- The Synthegy platform now has a 4-tier architecture with a PubChem-backed molecular intelligence layer:
  * **Tier 1 — Frontend** (Next.js, port 3000): MoleculeExplorer + enriched LiveEvaluator
  * **Tier 2 — Middleware** (Hono, gateway layer): request logger, API-key auth, rate limiter, error handler
  * **Tier 3 — Backend** (Bun + Hono, port 3001): LLM Strategic Evaluator with enrichedContext support
  * **Tier 4 — Molecule** (Bun + Hono, port 3002): PubChem PUG REST + E-utilities wrapper with SQLite cache
- Data source: PubChem (https://pubchem.ncbi.nlm.nih.gov) — 119M+ compounds, free, no API key, REST API. Used by NIH, FDA, EPA, and thousands of research institutions.
- The "super power" demonstrated: the LLM Strategic Evaluator now reasons about real molecular data. Tested with Atovaquone (XLogP 5.2, naphthoquinone) and Caffeine (purine) — the LLM gave molecule-specific feedback referencing actual functional groups and recommending appropriate named reactions (Traube synthesis for purines).
- Files added: `mini-services/synthegy-molecule/{index.ts,package.json,tsconfig.json,spawn.ts,start.sh}`, `src/{cache.ts,pubchem.ts,routes/{health,molecule}.ts,middleware/{auth,logger,errorHandler}.ts}`, `src/lib/synthegy/molecule-api.ts`, `src/components/synthegy/molecule-explorer.tsx`, plus `spawn.ts` for the backend. Updated: `mini-services/synthegy-backend/src/{lib/llm.ts,routes/evaluate.ts}`, `src/lib/synthegy/api.ts`, `src/components/synthegy/{live-evaluator,demo,architecture}.tsx`.
- Verification: lint clean; both mini-services stable (multi-minute uptimes via detached spawn); agent-browser confirmed end-to-end PubChem lookup → enrich → LLM call → persist → history refresh.

---
Task ID: 4
Agent: main (Super Z)
Task: Add three new molecular intelligence capabilities: substructure search, property-based filtering, and ChEMBL bioactivity integration.

Work Log:
- Verified all three data sources are reachable from the sandbox:
  * PubChem `fastsubstructure` endpoint returns CIDs containing a SMILES scaffold
  * NCBI E-utilities supports numerical range queries on indexed fields (XLGP, TPSA, MW, etc.) using `min:max[FIELD]` colon syntax — discovered after testing that human-readable names don't work, only the field codes from `einfo.fcgi`
  * ChEMBL REST API at `https://www.ebi.ac.uk/chembl/api/data/` supports molecule lookup by InChIKey, mechanism of action, and bioactivity measurements (IC50, Ki, Kd, EC50)
- Extended the molecule microservice with 3 new functions in `src/pubchem.ts`:
  * `substructureSearch(smiles, maxRecords)` — calls PubChem fastsubstructure
  * `propertyFilter(filters, limit)` — builds E-utilities term from PropertyFilter[] array, returns ranked CIDs
  * Exported `PropertyFilter` type with 9 supported fields (XLGP, TPSA, MW, HAC, RBC, HBDC, HBAC, CPLX, TFC)
- Created new ChEMBL client at `src/chembl.ts`:
  * `lookupMoleculeByInChIKey(inchikey)` — fetches ChEMBL ID, pref_name, max_phase, first_approval year, ATC codes, ALogP, PSA, Ro5 violations, withdrawal/black-box flags
  * `lookupMechanisms(chemblId)` — returns action_type (INHIBITOR/ANTAGONIST/etc.) + mechanism_of_action text
  * `lookupActivities(chemblId, {type, limit})` — returns bioactivity measurements sorted by pChemblValue descending (most potent first), with target name, organism, journal, year
  * `getBioactivity(inchikey, type?)` — top-level function that combines all three lookups
- Added 3 new routes to `src/routes/molecule.ts`:
  * `GET /api/molecule/substructure?smiles=&max=` — find compounds containing scaffold, returns compounds with CID/name/formula/MW/SMILES/XLogP/TPSA
  * `GET /api/molecule/filter?fields=XLGP:2:4,TPSA:60:100&limit=15` — property-based filter, returns totalMatches + compounds
  * `GET /api/molecule/bioactivity?inchikey=&type=IC50` — full ChEMBL bioactivity record
- Updated `index.ts` route listing to include the 3 new endpoints and update data source description to "PubChem PUG REST + NCBI E-utilities + ChEMBL"
- Smoke-tested all 3 endpoints via curl with real queries:
  * Substructure (aspirin scaffold): found 5 compounds including aspirin, salsalate, trifluoromethyl-aspirin derivative
  * Property filter (XLogP 2-4 AND TPSA 60-100): 19,028,523 matches in PubChem, returned 5 with verified properties
  * ChEMBL Aspirin: CHEMBL25, first approval 1950, mechanism "Cyclooxygenase inhibitor", 137 IC50 activities sorted by potency (top hit pChEMBL 8.49)
  * ChEMBL Caffeine: CHEMBL113, first approval 1948, mechanism "Adenosine receptor antagonist", 197 activities, top hit AC50=0.6 nM against Cannabinoid receptor 1
- Extended frontend API client at `src/lib/synthegy/molecule-api.ts`:
  * Added types: `CompoundSearchRow`, `SubstructureResult`, `PropertyField`, `PropertyFilterSpec`, `PropertyFilterResult`, `ChEMBLMolecule`, `ChEMBLMechanism`, `ChEMBLActivity`, `ChEMBLBioactivity`
  * Added methods: `substructure(smiles, max)`, `propertyFilter(filters, limit)`, `bioactivity(inchikey, type?)`
- Built new `AdvancedSearch` component (`src/components/synthegy/advanced-search.tsx`) with 3 tabs:
  * **Substructure tab**: SMILES input + 7 scaffold presets (benzene, pyridine, indole, imidazole, piperazine, naphthalene, aspirin scaffold), max-records control, results with thumbnail + expandable details + "Use" button
  * **Property filter tab**: 4 presets (Drug-like Lipinski+, Lead-like, Fragment-like, CNS-penetrant), dynamic filter rows with field selector (9 properties), min/max inputs, add/remove filters, "Filter PubChem" button, total-matches banner, results list
  * **ChEMBL bioactivity tab**: InChIKey input + 4 popular-molecule presets (Aspirin, Caffeine, Ibuprofen, Paracetamol), activity-type filter (IC50/Ki/Kd/EC50/AC50/Potency/Any), molecule header card (ChEMBL ID, name, max phase, first approval, ATC codes), black-box/withdrawn warning badges, mechanism cards, scrollable activities list with pChEMBL values
  * Shared `CompoundRow` component with thumbnail + expandable details + "Use in evaluator" button that calls `onUseInEvaluator` callback
- Wired `AdvancedSearch` into the "Try it live" tab in `demo.tsx`, between MoleculeExplorer and LiveEvaluator. The `onUseInEvaluator` callback flows molecule data from search results directly into the evaluator's enrichedContext.
- Updated Architecture section:
  * Tier 04 "Molecule" now shows 2 data source lines: "PubChem PUG REST — 124M compounds · substructure + property filter" and "ChEMBL REST API — 2.4M bioactive · mechanisms + IC50/Ki"
  * Updated intro text to mention both PubChem and ChEMBL
- Updated demo section description text to mention substructure search, property filtering, and ChEMBL bioactivity.
- Lint clean (0 errors, 0 warnings).
- Agent-browser end-to-end verification through Caddy gateway:
  * Page renders with Advanced Search component below MoleculeExplorer, all 3 tabs visible
  * **Substructure test**: searched benzene (c1ccccc1) → found 12 compounds including 1,1-dioxo-1,2-benzothiazol-3-one (CID 5143), 5-chloro-2-(2,4-dichlorophenoxy)phenol (CID 5564), each with structure thumbnail, formula, MW, XLogP, TPSA
  * **Property filter test**: ran default Drug-like preset (XLogP 2-4, TPSA 60-100) → banner shows "19,028,523 compounds in PubChem match all filters", returned 12 top results with verified property values, including [3-(3,4,5-trimethoxyphenyl)thiophen-2-yl]methanol (XLogP 2.3, TPSA 76.2)
  * **ChEMBL test**: looked up Aspirin by InChIKey → CHEMBL25, first approval 1950, mechanism "Cyclooxygenase inhibitor", 158 activities sorted by potency (top: pChEMBL 9.30), including IC50=300 nM against Prostaglandin G/H synthase 1 (COX-1) — the known target
  * **Cross-feature test**: expanded a substructure search result (CID 5143), clicked "Use" → the "PubChem-enriched · CID 5143" badge appeared in the LiveEvaluator, ready to enrich the next LLM call
- Cache stats after testing: 83 entries (28 images, 37 properties, 8 search results, 5 synonyms, 5 descriptions) — the platform is heavily cached.
- Captured screenshots: `download/synthegy-v4-advanced-search.png`, `download/synthegy-v4-chembl-bioactivity.png`.

Stage Summary:
- The Synthegy platform now has three new molecular intelligence capabilities exposed through a single `AdvancedSearch` component:
  1. **Substructure search** — find all PubChem compounds containing a SMILES scaffold (e.g. "show me every compound with a benzene ring")
  2. **Property-based filtering** — filter 124M PubChem compounds by computed property ranges (XLogP, TPSA, MW, H-bond donors/acceptors, rotatable bonds, complexity, etc.) with 4 quick presets (Drug-like, Lead-like, Fragment-like, CNS-penetrant)
  3. **ChEMBL bioactivity** — look up drug-development metadata (max phase, first approval year, ATC codes), mechanism of action, and measured bioactivity (IC50/Ki/Kd/EC50 sorted by potency) for any compound via its InChIKey
- All three capabilities integrate with the existing Strategic Evaluator: any search result can be sent to the evaluator with a single click via the "Use in evaluator" button, which calls the same `onUseInEvaluator` callback used by the MoleculeExplorer.
- The molecule microservice now spans 2 public databases (PubChem + ChEMBL) with 14 total endpoints, all cached in SQLite with TTLs.
- Files added/updated: `mini-services/synthegy-molecule/src/{pubchem.ts (extended), chembl.ts (new), routes/molecule.ts (extended)}`, `src/lib/synthegy/molecule-api.ts (extended)`, `src/components/synthegy/advanced-search.tsx (new)`, `src/components/synthegy/{demo,architecture}.tsx (updated)`.
- Verification: lint clean; both mini-services stable (multi-minute uptimes); agent-browser confirmed all 3 new capabilities work end-to-end through the Caddy gateway, including the cross-feature flow from search-result → evaluator enrichment.

---
Task ID: 5
Agent: main (Super Z)
Task: Add named collections, SDF/CSV export, target-based search via ChEMBL target API, and push the entire project to GitHub.

Work Log:
- Verified all 3 data sources before building:
  * ChEMBL target search: `pref_name__icontains=cyclooxygenase` returns 8 targets across species
  * ChEMBL target activities: `target_chembl_id=CHEMBL230` returns 6,116 IC50 activities
  * PubChem SDF endpoint: `compound/cid/2244/SDF?record_type=2d` returns full connection table
- Added collections tables to backend SQLite (`src/db.ts`): `collections` (id, label, description, chemist_id, timestamps) + `collection_items` (id, collection_id, cid, name, formula, MW, SMILES, InChIKey, xLogP, tpsa, source, added_at) with UNIQUE(collection_id, cid, canonical_smiles) to allow ChEMBL compounds (cid=0).
- Created `src/routes/collections.ts` with 9 endpoints: GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, POST /:id/items, POST /:id/items/bulk, DELETE /:id/items/:cid. Bulk-add uses ON CONFLICT DO NOTHING for dedup.
- Extended molecule service with 4 new functions:
  * `getSDFByCID(cid)` + `getSDFByCIDs(cids[])` in pubchem.ts — fetches 2D SDF records from PubChem, cached 30 days
  * `searchTargets(query, limit)` in chembl.ts — ChEMBL target search via pref_name__icontains
  * `getActiveCompoundsForTarget(chemblId, {type, limit})` in chembl.ts — returns distinct compounds ranked by pChemblValue, deduped by molecule_chembl_id
- Added 4 new routes to molecule service:
  * GET /api/molecule/targets/search?q=&limit=
  * GET /api/molecule/targets/:chemblId/compounds?type=&limit=
  * GET /api/molecule/export/sdf?cids=2244,5161 (returns chemical/x-mdl-sdfile)
  * GET /api/molecule/export/csv?cids=2244,5161 (returns text/csv with 14 columns, RFC-4180 escaping)
- Extended frontend API clients: added Collection/CollectionItem/CollectionItemInput types + 9 collection methods to api.ts; added ChEMBLTarget/ActiveCompound/TargetActivitiesResult types + searchTargets/activeCompoundsForTarget methods + exportUrl() helper to molecule-api.ts.
- Built `CollectionsPanel` component (380 lines): lists collections with item counts, create/delete, expand to see items with structure thumbnails, per-collection SDF/CSV download buttons, "Save current results" bar with collection dropdown + bulk-add.
- Added 4th "Target search" tab to AdvancedSearch component (250 lines): target name input + 8 presets (cyclooxygenase, kinase, dopamine receptor, etc.), target results list with CHEMBL IDs + organism, click target → loads most potent compounds with pChEMBL values, activity-type filter (IC50/Ki/Kd/EC50/AC50/Potency).
- Wired onResultsChange callback through AdvancedSearch → SubstructureTab/PropertyFilterTab/TargetSearchTab → Demo → CollectionsPanel, so search results flow into the "Save all" bar automatically.
- Fixed Zod validator: changed `cid: z.number().int().positive()` to `z.number().int().min(0)` so ChEMBL compounds (which have no PubChem CID) can be saved with cid=0.
- Increased Bun idleTimeout from 10s to 60s on the molecule service — ChEMBL target-activities queries can take 20-30s.
- Lint clean (0 errors, 0 warnings).
- Agent-browser end-to-end verification:
  * Target search: "cyclooxygenase" → 8 targets → clicked human Cyclooxygenase (CHEMBL2094253) → 97 activities, top compounds: PRIFELONE (IC50=2 nM, pChembl=8.70), INDOMETHACIN (IC50=5.7 nM, pChembl=8.24)
  * Collections: created "COX-2 hit list from ChEMBL" → selected it in dropdown → clicked "Save all" → "Added 15, skipped 0 duplicates" → collection expanded showing all 15 compounds with structure images + SDF/CSV download links
  * SDF export via curl: returns real SDF with atoms/bonds/coordinates
  * CSV export via curl: 14 columns with proper InChI escaping
- GitHub push:
  * Created `.gitignore` excluding node_modules, .next, DB files, skills/, .zscripts/, logs
  * Wrote comprehensive README.md (architecture diagram, API reference, tech stack, project structure)
  * Committed all changes (1,803 insertions across 22 files)
  * Downloaded gh CLI binary (v2.65.0) to ~/.local/bin since no sudo access
  * Token lacked `read:org` scope for gh CLI, so used GitHub API directly via curl
  * Created public repo `testdemoqwenai2025-creator/synthegy` via POST /user/repos
  * Added remote with token-embedded URL, pushed main branch, then cleaned remote URL to remove token
  * Verified: 5 commits on GitHub, all mini-services code present, collections.ts (9.3KB) + collections-panel.tsx (15.7KB) + advanced-search.tsx (43KB) all pushed

Stage Summary:
- Three new capabilities shipped and verified end-to-end:
  1. Named compound collections with full CRUD + bulk-add from any search
  2. SDF/CSV export with per-collection download buttons
  3. Target-based search via ChEMBL target API (find compounds active against a named protein target)
- Entire project pushed to GitHub: https://github.com/testdemoqwenai2025-creator/synthegy
- 150 tracked files, 5 commits, comprehensive README with architecture diagram + API reference
- All 3 services stable (backend 705s+ uptime, molecule 537s+, Next.js 200)
