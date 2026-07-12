#!/usr/bin/env python3.12
"""
Synthegy Provisional Patent Application + Seed Deck + Partnership Package.
Three documents in one script — all as PDF.
"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import mm, cm, inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# --- Fonts ---
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('Serif', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Serif-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('Serif', normal='Serif', bold='Serif-Bold')
pdfmetrics.registerFont(TTFont('Sans', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Bold', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Bold.ttf'))

# --- Palette ---
BG       = colors.HexColor('#090a0b')
SEC_BG   = colors.HexColor('#181b1c')
STRIPE   = colors.HexColor('#1a1e20')
HDR      = colors.HexColor('#375260')
BORDER   = colors.HexColor('#4b575d')
ACCENT   = colors.HexColor('#74b2d2')
ACCENT2  = colors.HexColor('#be6d52')
WHITE    = colors.HexColor('#ecedee')
MUTED    = colors.HexColor('#919699')
GREEN    = colors.HexColor('#77b48c')

# --- Styles ---
ss = getSampleStyleSheet()
sH1 = ParagraphStyle('H1', parent=ss['Heading1'], fontName='Serif-Bold', fontSize=20, leading=26, textColor=ACCENT, spaceBefore=20, spaceAfter=10)
sH2 = ParagraphStyle('H2', parent=ss['Heading2'], fontName='Serif-Bold', fontSize=14, leading=20, textColor=WHITE, spaceBefore=14, spaceAfter=6)
sH3 = ParagraphStyle('H3', parent=ss['Heading3'], fontName='Sans-Bold', fontSize=11, leading=16, textColor=ACCENT, spaceBefore=10, spaceAfter=4)
sBody = ParagraphStyle('Body', parent=ss['Normal'], fontName='Serif', fontSize=10.5, leading=16, textColor=WHITE, alignment=TA_JUSTIFY, spaceAfter=8)
sBodyL = ParagraphStyle('BodyL', parent=sBody, alignment=TA_LEFT)
sSmall = ParagraphStyle('Small', parent=sBody, fontSize=9, leading=13, textColor=MUTED)
sClaim = ParagraphStyle('Claim', parent=sBody, fontName='Serif', fontSize=11, leading=17, textColor=WHITE, leftIndent=20, spaceAfter=6)
sPull = ParagraphStyle('Pull', parent=sBody, fontName='Serif-Bold', fontSize=13, leading=19, textColor=ACCENT, leftIndent=16, rightIndent=16, spaceBefore=8, spaceAfter=8)
sCoverT = ParagraphStyle('CoverT', parent=ss['Title'], fontName='Serif-Bold', fontSize=36, leading=42, textColor=WHITE, alignment=TA_LEFT)
sCoverK = ParagraphStyle('CoverK', parent=ss['Normal'], fontName='Sans', fontSize=11, leading=14, textColor=MUTED, alignment=TA_LEFT, spaceAfter=16)
sCoverS = ParagraphStyle('CoverS', parent=ss['Normal'], fontName='Serif', fontSize=12, leading=18, textColor=MUTED, alignment=TA_LEFT)
sCoverC = ParagraphStyle('CoverC', parent=ss['Normal'], fontName='Sans-Bold', fontSize=12, leading=16, textColor=ACCENT, alignment=TA_LEFT)
sSlideT = ParagraphStyle('SlideT', parent=ss['Title'], fontName='Serif-Bold', fontSize=28, leading=34, textColor=WHITE, alignment=TA_LEFT, spaceAfter=10)
sSlideB = ParagraphStyle('SlideB', parent=sBody, fontSize=14, leading=22, textColor=WHITE)
sStat = ParagraphStyle('Stat', parent=ss['Normal'], fontName='Serif-Bold', fontSize=32, leading=36, textColor=ACCENT, alignment=TA_CENTER)
sStatL = ParagraphStyle('StatL', parent=ss['Normal'], fontName='Sans', fontSize=10, leading=14, textColor=MUTED, alignment=TA_CENTER)

W, H = A4
LM, RM, TM, BM = 25*mm, 25*mm, 25*mm, 25*mm
CW = W - LM - RM

def dark_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFont('Sans', 7)
    canvas.setFillColor(MUTED)
    pn = canvas.getPageNumber()
    canvas.drawCentredString(W/2, 10*mm, f"Confidential  |  Page {pn}")
    canvas.restoreState()

def hr():
    return HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=10)

# =========================================================================
# DOCUMENT 1: PROVISIONAL PATENT APPLICATION
# =========================================================================

def build_patent():
    s = []
    s.append(Spacer(1, 50*mm))
    s.append(Paragraph("PROVISIONAL PATENT APPLICATION", sCoverK))
    s.append(Paragraph("SYNTHEGY", sCoverT))
    s.append(Paragraph("Multi-Database Knowledge Graph Traversal Method for Chemical Compound-to-Disease Reasoning", sCoverK))
    s.append(Spacer(1, 20*mm))
    s.append(Paragraph(
        "A method and system for automatically traversing multiple heterogeneous chemical and "
        "biological databases in a single API call to construct a knowledge graph linking a chemical "
        "compound to its biological targets, metabolic pathways, and associated diseases, with "
        "association scoring and natural-language reasoning over the resulting graph.",
        sCoverS))
    s.append(Spacer(1, 30*mm))
    s.append(Paragraph("Inventor: [To be completed by filer]", sCoverK))
    s.append(Paragraph("Filing date: [Date of USPTO submission]", sCoverK))
    s.append(Paragraph("Application type: Provisional (35 U.S.C. 111(b))", sCoverK))
    s.append(Paragraph("Filing fee: $65 (micro entity) / $130 (small entity) / $260 (large entity)", sCoverK))
    s.append(PageBreak())

    # --- TITLE ---
    s.append(Paragraph("TITLE OF INVENTION", sH1))
    s.append(hr())
    s.append(Paragraph(
        "Multi-Database Knowledge Graph Traversal Method for Automated Chemical Compound-to-Disease "
        "Biological Context Reasoning",
        sBody))
    s.append(PageBreak())

    # --- CROSS-REFERENCE ---
    s.append(Paragraph("CROSS-REFERENCE TO RELATED APPLICATIONS", sH1))
    s.append(hr())
    s.append(Paragraph("Not applicable.", sBody))
    s.append(PageBreak())

    # --- BACKGROUND ---
    s.append(Paragraph("BACKGROUND OF THE INVENTION", sH1))
    s.append(hr())

    s.append(Paragraph("Field of the Invention", sH2))
    s.append(Paragraph(
        "The present invention relates to computational chemistry and bioinformatics, and more "
        "specifically to a method for automatically traversing multiple heterogeneous databases to "
        "construct a knowledge graph that links a chemical compound to its biological targets, "
        "metabolic pathways, and associated diseases, enabling LLM-based reasoning over the "
        "biological context of a compound in a single API call.",
        sBody))

    s.append(Paragraph("Description of Related Art", sH2))
    s.append(Paragraph(
        "Chemistry-AI platforms such as Schrodinger, Exscientia, and Recursion Pharmaceuticals "
        "provide computational tools for drug discovery, but none automatically connect a chemical "
        "compound to its disease associations through a multi-database traversal. Existing approaches "
        "require manual lookup across separate databases (PubChem for compound properties, ChEMBL "
        "for bioactivity, KEGG for pathways, OpenTargets for disease associations), each with "
        "different query languages (REST, GraphQL) and different identifier systems (PubChem CID, "
        "ChEMBL ID, gene symbols, Ensembl IDs, MONDO disease IDs).",
        sBody))

    s.append(Paragraph(
        "The problem is one of identifier resolution and cross-database traversal: a PubChem CID "
        "(e.g. 2244 for aspirin) must be mapped to a ChEMBL ID (CHEMBL25), which must be mapped to "
        "a gene symbol (PTGS2), which must be mapped to an Ensembl ID (ENSG00000073756), which must "
        "be queried against OpenTargets to retrieve disease associations with scores. No existing "
        "system performs this full traversal automatically.",
        sBody))

    s.append(Paragraph(
        "What is needed is a method that, given a chemical compound identifier, automatically "
        "constructs a knowledge graph spanning compound, target, pathway, and disease databases, "
        "with association scoring and natural-language reasoning capability over the resulting graph.",
        sBody))
    s.append(PageBreak())

    # --- SUMMARY ---
    s.append(Paragraph("SUMMARY OF THE INVENTION", sH1))
    s.append(hr())

    s.append(Paragraph(
        "The present invention provides a computer-implemented method for constructing a knowledge "
        "graph that links a chemical compound to its biological context, comprising: (a) receiving "
        "a chemical compound identifier; (b) querying a first database to retrieve compound "
        "properties; (c) querying a second database to identify biological targets of the compound; "
        "(d) extracting gene symbols from target names using a predefined alias mapping; (e) "
        "querying a third database to identify metabolic pathways associated with the compound; "
        "(f) querying a fourth database to identify diseases associated with the targets, with "
        "association scores; (g) constructing a graph data structure with nodes representing "
        "compounds, targets, pathways, and diseases, and edges representing the relationships "
        "between them; and (h) returning the graph to a client for natural-language reasoning.",
        sBody))

    s.append(Paragraph(
        "The method further includes caching database responses with time-to-live values "
        "appropriate to the data's mutability, and an active-learning feedback loop that records "
        "user accept/revise signals on reasoning outputs and extracts keyword patterns to create "
        "a proprietary preference profile.",
        sBody))
    s.append(PageBreak())

    # --- DETAILED DESCRIPTION ---
    s.append(Paragraph("DETAILED DESCRIPTION", sH1))
    s.append(hr())

    s.append(Paragraph("System Architecture", sH2))
    s.append(Paragraph(
        "The system comprises a frontend application, an API gateway with authentication and rate "
        "limiting, and a plurality of microservices, each wrapping a different public database. "
        "The microservices communicate via HTTP REST and GraphQL protocols. A Python subprocess "
        "bridge invokes RDKit for molecular descriptor computation and ord_schema for Open Reaction "
        "Database parsing.",
        sBody))

    s.append(Paragraph("The Traversal Method", sH2))
    s.append(Paragraph(
        "The core inventive step is the multi-database traversal method, which proceeds as follows:",
        sBody))

    s.append(Paragraph("Step 1: Compound Lookup", sH3))
    s.append(Paragraph(
        "Given a compound name or SMILES string, the system queries PubChem PUG REST to retrieve "
        "canonical SMILES, molecular formula, molecular weight, InChIKey, XLogP, TPSA, and other "
        "computed properties. The response is cached in SQLite with a 30-day TTL.",
        sBody))

    s.append(Paragraph("Step 2: Target Identification", sH3))
    s.append(Paragraph(
        "The system queries ChEMBL REST API to identify biological targets associated with the "
        "compound. For each target, the system extracts a gene symbol using a predefined alias "
        "mapping table (e.g. 'Cyclooxygenase' maps to 'PTGS2', 'COX-2' maps to 'PTGS2', "
        "'Epidermal Growth Factor Receptor' maps to 'EGFR'). The alias table covers common protein "
        "name variants, enzymatic names, and receptor subclass names.",
        sBody))

    s.append(Paragraph("Step 3: Ensembl ID Resolution", sH3))
    s.append(Paragraph(
        "For each extracted gene symbol, the system queries the OpenTargets GraphQL API to resolve "
        "the corresponding Ensembl gene ID (e.g. PTGS2 maps to ENSG00000073756). This step bridges "
        "the ChEMBL identifier space to the OpenTargets identifier space.",
        sBody))

    s.append(Paragraph("Step 4: Pathway Linking", sH3))
    s.append(Paragraph(
        "The system queries the KEGG REST API to find metabolic pathways associated with the "
        "compound. First, the compound name is searched against the KEGG compound database to "
        "obtain a KEGG compound ID. Then, the KEGG link endpoint is queried to retrieve all "
        "pathway IDs associated with that compound. Pathway names are resolved via the KEGG list "
        "endpoint.",
        sBody))

    s.append(Paragraph("Step 5: Disease Association", sH3))
    s.append(Paragraph(
        "For each target with a resolved Ensembl ID, the system queries the OpenTargets GraphQL "
        "API to retrieve associated diseases with association scores (0.0-1.0). The results are "
        "deduplicated by disease ID and sorted by score. The top N diseases are retained.",
        sBody))

    s.append(Paragraph("Step 6: Graph Construction", sH3))
    s.append(Paragraph(
        "The system constructs a graph data structure with four node types (compound, target, "
        "pathway, disease) and three edge types ('active against', 'involved in', "
        "'treats/associates'). The graph is returned as a JSON object with nodes, edges, and "
        "flat lists for frontend rendering.",
        sBody))

    s.append(Paragraph("Step 7: LLM Reasoning", sH3))
    s.append(Paragraph(
        "The graph, along with compound properties, ADMET descriptors, and experimental reaction "
        "data, is injected into an LLM prompt. The LLM uses the biological context to produce "
        "strategy-aware reasoning about synthesis routes, including which diseases the compound "
        "is relevant to and whether the route is appropriate for the therapeutic context.",
        sBody))

    s.append(Paragraph("Active Learning Feedback Loop", sH2))
    s.append(Paragraph(
        "The system records user feedback signals (accept, revise, reject) on each LLM reasoning "
        "output. Feedback is stored in a database with the original instruction text. The system "
        "extracts keyword frequency from accepted versus revised instructions to identify "
        "preference patterns (e.g. 'chemist prefers instructions mentioning: protecting, groups, "
        "convergent' vs 'chemist tends to revise when instructions mention: toxic, reagents'). "
        "The preference profile is used to bias future LLM prompts toward historically preferred "
        "patterns.",
        sBody))

    s.append(PageBreak())

    # --- CLAIMS ---
    s.append(Paragraph("CLAIMS", sH1))
    s.append(hr())

    s.append(Paragraph(
        "<b>Claim 1.</b> A computer-implemented method for constructing a knowledge graph linking "
        "a chemical compound to biological context, comprising: receiving a chemical compound "
        "identifier; querying a first database to retrieve compound properties; querying a second "
        "database to identify one or more biological targets of said compound; extracting one or "
        "more gene symbols from said biological targets using a predefined alias mapping; querying "
        "a third database to identify one or more metabolic pathways associated with said compound; "
        "querying a fourth database to identify one or more diseases associated with said one or "
        "more biological targets, each disease having an association score; constructing a graph "
        "data structure comprising nodes representing said compound, said biological targets, said "
        "metabolic pathways, and said diseases, and edges representing relationships therebetween; "
        "and returning said graph data structure.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 2.</b> The method of claim 1, wherein said extracting gene symbols comprises "
        "looking up said biological target names in a predefined alias mapping table that maps "
        "protein common names, enzymatic names, and receptor subclass names to standard gene "
        "symbols.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 3.</b> The method of claim 1, further comprising resolving said gene symbols to "
        "Ensembl gene identifiers by querying a fifth database (OpenTargets) with said gene "
        "symbols, and wherein said querying a fourth database to identify diseases uses said "
        "Ensembl gene identifiers.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 4.</b> The method of claim 1, wherein said first database is PubChem, said "
        "second database is ChEMBL, said third database is KEGG, and said fourth database is "
        "OpenTargets, and wherein said querying uses REST and GraphQL protocols respectively.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 5.</b> The method of claim 1, further comprising caching database responses in "
        "a local cache with time-to-live values, wherein compound properties are cached for 30 "
        "days, pathway data for 30 days, and disease associations for 7 days.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 6.</b> The method of claim 1, further comprising providing said graph data "
        "structure to a large language model (LLM) as context for natural-language reasoning "
        "about chemical synthesis strategies, wherein said LLM produces a strategy score and "
        "explanatory text referencing said biological context.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 7.</b> The method of claim 6, further comprising recording user feedback signals "
        "on said LLM output, extracting keyword patterns from accepted versus rejected outputs, "
        "and biasing future LLM prompts based on said keyword patterns.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 8.</b> The method of claim 1, wherein said graph data structure is rendered as "
        "an interactive visualisation with color-coded node types and association-score-weighted "
        "edges, and wherein said diseases are displayed with said association scores as progress "
        "bars.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 9.</b> A system comprising a frontend application, an API gateway, and a "
        "plurality of microservices, each microservice wrapping a different public database, "
        "wherein said system performs the method of claim 1.",
        sClaim))

    s.append(Paragraph(
        "<b>Claim 10.</b> A non-transitory computer-readable medium storing instructions that, "
        "when executed by a processor, cause the processor to perform the method of claim 1.",
        sClaim))

    s.append(PageBreak())

    # --- ABSTRACT ---
    s.append(Paragraph("ABSTRACT", sH1))
    s.append(hr())
    s.append(Paragraph(
        "A method and system for automatically traversing multiple heterogeneous chemical and "
        "biological databases to construct a knowledge graph linking a chemical compound to its "
        "biological targets, metabolic pathways, and associated diseases. The method receives a "
        "compound identifier, queries PubChem for properties, ChEMBL for targets, extracts gene "
        "symbols via alias mapping, queries KEGG for pathways, and OpenTargets for disease "
        "associations with scores. The resulting graph is provided to an LLM for strategy-aware "
        "reasoning. An active-learning feedback loop records user preferences and biases future "
        "reasoning outputs.",
        sBody))

    s.append(Spacer(1, 20*mm))
    s.append(Paragraph("FILING INSTRUCTIONS", sH3))
    s.append(Paragraph(
        "1. Go to https://patents.gov.uk (UK) or https://www.uspto.gov (US)<br/>"
        "2. File as a Provisional Patent Application (not a full utility patent)<br/>"
        "3. Upload this document as the specification<br/>"
        "4. Pay the filing fee (UK: GBP 60, US: $65 micro entity)<br/>"
        "5. You get 'Patent Pending' status immediately<br/>"
        "6. You have 12 months to file the full (non-provisional) application<br/>"
        "7. Recommended: have a patent attorney review before filing the full application",
        sSmall))

    return s


# =========================================================================
# DOCUMENT 2: SEED DECK (10 slides)
# =========================================================================

def build_seed_deck():
    s = []

    # Slide 1: Title
    s.append(Spacer(1, 40*mm))
    s.append(Paragraph("SEED ROUND", sCoverK))
    s.append(Paragraph("SYNTHEGY", sSlideT))
    s.append(Paragraph("Strategy-Aware AI for Synthetic Chemistry", sCoverK))
    s.append(Spacer(1, 15*mm))
    s.append(Paragraph("Seeking: $3-5M seed | Valuation: $15-25M | Use of funds: 3 paid pilots + proprietary data flywheel", sCoverS))
    s.append(Spacer(1, 20*mm))
    s.append(Paragraph("Contact: synthegy.acquisition@gmail.com", sCoverC))
    s.append(PageBreak())

    # Slide 2: The Problem
    s.append(Paragraph("The Problem", sSlideT))
    s.append(hr())
    s.append(Paragraph(
        "Pharma companies spend <b>$2.6 billion per approved drug</b>. 90% of candidates fail in "
        "clinical trials. Much of that failure is predictable at the chemistry stage.",
        sSlideB))
    s.append(Spacer(1, 10*mm))
    s.append(Paragraph(
        "When a med-chem team picks a synthesis route to advance, they make a <b>$5-10M decision</b> "
        "with spreadsheets, gut feel, and a 2-hour meeting.",
        sSlideB))
    s.append(Spacer(1, 10*mm))
    s.append(Paragraph(
        "The data needed to decide empirically exists across <b>12 different public databases</b>. "
        "No one connects them.",
        sPull))
    s.append(PageBreak())

    # Slide 3: The Solution
    s.append(Paragraph("The Solution", sSlideT))
    s.append(hr())
    s.append(Paragraph(
        "Synthegy turns a 3-day multi-database lookup into a <b>2-minute automated report</b>.",
        sSlideB))
    s.append(Spacer(1, 8*mm))
    s.append(Paragraph(
        "The chemist types a natural-language instruction. The platform fetches PubChem properties, "
        "ChEMBL bioactivity, ORD experimental reactions, RDKit ADMET descriptors, Europe PMC "
        "literature confidence, RCSB PDB structures, KEGG pathways, OpenTargets disease associations, "
        "Google Patents, openFDA adverse events, and WHO health indicators -- then feeds it all to "
        "an LLM Strategic Evaluator that scores the route and explains its reasoning.",
        sSlideB))
    s.append(Spacer(1, 8*mm))
    s.append(Paragraph('"Bench to bedside, in one platform."', sPull))
    s.append(PageBreak())

    # Slide 4: The Knowledge Graph (key differentiator)
    s.append(Paragraph("The Knowledge Graph", sSlideT))
    s.append(hr())
    s.append(Paragraph(
        "The only platform that traverses <b>4 databases in 1 API call</b>:",
        sSlideB))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph(
        "<b>Compound</b> (PubChem) -> <b>Targets</b> (ChEMBL + gene extraction) -> "
        "<b>Pathways</b> (KEGG) -> <b>Diseases</b> (OpenTargets, with scores)",
        sPull))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph(
        "Aspirin -> Cyclooxygenase (PTGS2) -> 15 diseases (rheumatoid arthritis 0.635, gout 0.631, "
        "migraine 0.631, osteoarthritis 0.623, myocardial infarction...) in <b>under 2 seconds</b>.",
        sSlideB))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph(
        "Provisional patent filed on the traversal method. This is the moat.",
        sSlideB))
    s.append(PageBreak())

    # Slide 5: Traction / Architecture
    s.append(Paragraph("Architecture & Traction", sSlideT))
    s.append(hr())

    stats = [
        [Paragraph("7", sStat), Paragraph("12", sStat), Paragraph("300", sStat), Paragraph("30+", sStat)],
        [Paragraph("tiers", sStatL), Paragraph("data sources", sStatL), Paragraph("patients", sStatL), Paragraph("API endpoints", sStatL)],
    ]
    st = Table(stats, colWidths=[CW/4]*4, rowHeights=[36, 16])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), SEC_BG),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEABOVE', (0,0), (-1,0), 1, ACCENT),
        ('LINEBELOW', (0,-1), (-1,-1), 1, ACCENT),
    ]))
    s.append(st)
    s.append(Spacer(1, 8*mm))

    s.append(Paragraph(
        "4 Bun/Hono microservices (ports 3001-3005) + Next.js 16 frontend. All 12 data sources "
        "are <b>free, public, no API keys</b>. Marginal cost per query: effectively zero. All code "
        "on GitHub (11 commits, full history).",
        sSlideB))
    s.append(PageBreak())

    # Slide 6: The Data Flywheel
    s.append(Paragraph("The Data Flywheel", sSlideT))
    s.append(hr())
    s.append(Paragraph(
        "Every accept/revise signal trains the next recommendation. After 1,000 real outcomes, "
        "the evaluator is better than any rule-based system because it is trained on <b>your "
        "customers' actual lab results</b>.",
        sSlideB))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph(
        "<b>More customers -> more outcomes -> better predictions -> more customers.</b>",
        sPull))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph(
        "The active-learning feedback loop already extracts keyword patterns from accepted vs "
        "revised instructions. After 100+ signals per org, the evaluator becomes "
        "organisation-specific -- and that is sticky. Switching cost = the moat.",
        sSlideB))
    s.append(PageBreak())

    # Slide 7: Clinical Layer
    s.append(Paragraph("Clinical Layer: Bench to Bedside", sSlideT))
    s.append(hr())
    s.append(Paragraph(
        "300 synthetic patients across 6 diseases (RA, migraine, gout, OA, UC, asthma) with "
        "50-year epidemiological basis (1975-2025). Real government data integration (openFDA + "
        "WHO). Outcome prediction model. CDISC SDTM regulatory export. RWE CSV import pipeline.",
        sSlideB))
    s.append(Spacer(1, 6*mm))
    s.append(Paragraph(
        '"One function changes; the platform adapts." -- replace the synthetic generator with a '
        "CSV import when real patient data arrives. The entire analysis pipeline stays identical.",
        sPull))
    s.append(PageBreak())

    # Slide 8: Market
    s.append(Paragraph("Market Opportunity", sSlideT))
    s.append(hr())

    mkt = [
        ["Segment", "Size", "Synthegy's Play"],
        ["Chemistry software TAM", "$2B", "SaaS at $50-150K/year per team"],
        ["AI in drug discovery", "$8B by 2030", "Own the route-selection decision moment"],
        ["Late-stage drug failures", "$50B/year", "Predict failures at the chemistry stage"],
        ["Comparable exits", "$1.5-2B", "Exscientia ($1.5B), Recursion ($2B), Insitro ($2B)"],
    ]
    mt = Table(mkt, colWidths=[45*mm, 35*mm, CW-80*mm])
    mt.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'Sans-Bold', 9),
        ('FONT', (0,1), (-1,-1), 'Sans', 9),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), MUTED),
        ('BACKGROUND', (0,0), (-1,0), HDR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SEC_BG, STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('TEXTCOLOR', (2,1), (2,-1), ACCENT),
    ]))
    s.append(mt)
    s.append(PageBreak())

    # Slide 9: Use of Funds
    s.append(Paragraph("Use of Funds ($3-5M)", sSlideT))
    s.append(hr())
    s.append(Paragraph(
        "<b>40% -- 3 paid pilots</b> ($15K each, convert 2 to $50K/year annuals). Target: mid-size "
        "pharma (50-500 R&D scientists). Goal: $500K ARR + 3 case studies by month 9.",
        sSlideB))
    s.append(Spacer(1, 4*mm))
    s.append(Paragraph(
        "<b>30% -- Proprietary data flywheel</b>. Build the route-outcome capture pipeline. Every "
        "time a chemist runs the evaluator and synthesises the route, record whether it worked. "
        "After 1,000 real outcomes, the evaluator is better than any rule-based system.",
        sSlideB))
    s.append(Spacer(1, 4*mm))
    s.append(Paragraph(
        "<b>20% -- Hospital/CRO partnership</b>. Partner with 1 hospital for de-identified RA or "
        "asthma data. Swap the synthetic generator for a CSV import. First real-world evidence "
        "platform deployment.",
        sSlideB))
    s.append(Spacer(1, 4*mm))
    s.append(Paragraph(
        "<b>10% -- IP + legal</b>. File the full (non-provisional) patent. Incorporate. "
        "Trademark 'Synthegy'.",
        sSlideB))
    s.append(PageBreak())

    # Slide 10: The Ask
    s.append(Paragraph("The Ask", sSlideT))
    s.append(hr())
    s.append(Paragraph(
        "<b>Raising $3-5M seed</b> at a $15-25M valuation.",
        sSlideB))
    s.append(Spacer(1, 8*mm))
    s.append(Paragraph(
        "12-month milestones: $500K ARR, 3 paying pilots, 1 hospital data partnership, "
        "provisional patent filed, first Compound Advancement Report delivered to a pharma partner.",
        sSlideB))
    s.append(Spacer(1, 8*mm))
    s.append(Paragraph(
        "Investors: a16z Bio + ASC, Data Collective, or chemistry-specialist funds.",
        sSlideB))
    s.append(Spacer(1, 15*mm))
    s.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=10))
    s.append(Paragraph(
        "Contact: synthegy.acquisition@gmail.com<br/>"
        "Live platform: preview-chat-6cbbdd64-b04b-40df-a2f3-12616b64fcbf.space-z.ai<br/>"
        "GitHub: github.com/testdemoqwenai2025-creator/synthegy",
        sCoverC))
    s.append(PageBreak())

    return s


# =========================================================================
# DOCUMENT 3: PARTNERSHIP OUTREACH PACKAGE
# =========================================================================

def build_partnership_package():
    s = []
    s.append(Spacer(1, 50*mm))
    s.append(Paragraph("PARTNERSHIP OUTREACH PACKAGE", sCoverK))
    s.append(Paragraph("SYNTHEGY", sCoverT))
    s.append(Paragraph("Hospital, Government Health Service & CRO Partnership Programme", sCoverK))
    s.append(Spacer(1, 20*mm))
    s.append(Paragraph(
        "Target: De-identified patient data for Rheumatoid Arthritis and Asthma cohorts. "
        "In exchange: Synthegy platform access + co-authored publications + data sharing "
        "agreement template included.",
        sCoverS))
    s.append(PageBreak())

    # --- Target List ---
    s.append(Paragraph("Target Organisations", sH1))
    s.append(hr())

    s.append(Paragraph("UK Hospitals with Rheumatology Departments", sH2))
    targets_uk_hosp = [
        ["Organisation", "Department", "Why", "Contact Approach"],
        ["Guy's Hospital, London", "Rheumatology", "Large RA biologic registry", "Via NIHR BioResource"],
        ["Royal London Hospital", "Rheumatology", "Diverse cohort, Barts NHS Trust", "Via Barts CRF"],
        ["Manchester University NHS FT", "Rheumatology", "NRAS partnership, biologics clinic", "Via NIHR Manchester BRC"],
        ["Oxford University Hospitals", "Rheumatology", "NDORMS collaboration", "Via Oxford BRC"],
        ["Leeds Teaching Hospitals", "Rheumatology", "Large early-RA cohort", "Via NIHR Leeds BRC"],
    ]
    t1 = Table(targets_uk_hosp, colWidths=[50*mm, 28*mm, 48*mm, CW-126*mm])
    t1.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'Sans-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'Sans', 8),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), MUTED),
        ('BACKGROUND', (0,0), (-1,0), HDR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SEC_BG, STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    s.append(t1)
    s.append(Spacer(1, 6*mm))

    s.append(Paragraph("UK Hospitals with Respiratory/Asthma Departments", sH2))
    targets_uk_asthma = [
        ["Organisation", "Department", "Why", "Contact Approach"],
        ["Royal Brompton Hospital", "Respiratory", "Largest severe asthma centre in UK", "Via RBFT research office"],
        ["Glenfield Hospital, Leicester", "Respiratory", "Severe asthma biologics clinic", "Via Leicester BRC"],
        ["Guy's Hospital, London", "Respiratory", "Asthma biologics, large cohort", "Via KCL clinical trials"],
        ["Queen Elizabeth, Birmingham", "Respiratory", "Diverse asthma cohort", "Via Birmingham BRC"],
    ]
    t2 = Table(targets_uk_asthma, colWidths=[50*mm, 28*mm, 48*mm, CW-126*mm])
    t2.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'Sans-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'Sans', 8),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), MUTED),
        ('BACKGROUND', (0,0), (-1,0), HDR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SEC_BG, STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    s.append(t2)
    s.append(Spacer(1, 6*mm))

    s.append(Paragraph("CROs (Contract Research Organisations)", sH2))
    targets_cro = [
        ["Organisation", "Speciality", "Why", "Contact Approach"],
        ["IQVIA", "Late-phase, real-world evidence", "Largest RWE dataset globally", "Via partnerships@iqvia.com"],
        ["Parexel", "Clinical trial management", "RA + asthma trial experience", "Via innovation@parexel.com"],
        ["ICON plc", "Real-world evidence", "Disease registry expertise", "Via partnerships@iconplc.com"],
        ["Syneos Health", "Biopharmaceutical solutions", "RA biologic trial history", "Via collaborations@syneoshealth.com"],
    ]
    t3 = Table(targets_cro, colWidths=[40*mm, 38*mm, 48*mm, CW-126*mm])
    t3.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'Sans-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'Sans', 8),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), MUTED),
        ('BACKGROUND', (0,0), (-1,0), HDR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SEC_BG, STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    s.append(t3)
    s.append(Spacer(1, 6*mm))

    s.append(Paragraph("Government Health Services", sH2))
    targets_gov = [
        ["Organisation", "Data Available", "Why", "Contact Approach"],
        ["NHS Digital", "Hospital Episode Statistics", "De-identified RA/asthma admissions", "Via DARS (Data Access Request Service)"],
        ["NIHR BioResource", "Genomic + clinical data", "RA patient genomic profiles", "Via bioresource@nihr.ac.uk"],
        ["UK Biobank", "500K participants, linked EHR", "RA + asthma sub-cohorts", "Via ukbiobank access application"],
        ["Genomics England", "100K Genomes Project", "RA/asthma genomic variants", "Via GeCIP application"],
    ]
    t4 = Table(targets_gov, colWidths=[40*mm, 38*mm, 48*mm, CW-126*mm])
    t4.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'Sans-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'Sans', 8),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), MUTED),
        ('BACKGROUND', (0,0), (-1,0), HDR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SEC_BG, STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    s.append(t4)
    s.append(PageBreak())

    # --- Email Templates ---
    s.append(Paragraph("Outreach Email Templates", sH1))
    s.append(hr())

    s.append(Paragraph("Template 1: Hospital / NHS Trust", sH2))
    s.append(Paragraph(
        "<b>Subject:</b> Partnership enquiry -- AI-powered clinical intelligence platform for RA/Asthma cohorts<br/><br/>"
        "Dear Professor [Name],<br/><br/>"
        "I am writing to explore a data partnership between [Hospital/Trust] and Synthegy, a "
        "bench-to-bedside AI platform that connects 12 public databases (PubChem, ChEMBL, ORD, "
        "openFDA, WHO) through a single reasoning layer.<br/><br/>"
        "We have built a clinical cohort layer with 300 synthetic patients across 6 diseases "
        "(including RA and asthma) with a 50-year epidemiological basis, outcome prediction models, "
        "and CDISC SDTM regulatory export. The platform is designed to swap synthetic data for "
        "real de-identified patient data via a CSV import -- the entire analysis pipeline stays "
        "identical.<br/><br/>"
        "We are seeking a partnership to:<br/>"
        "1. Replace our synthetic RA/asthma cohorts with de-identified data from your registry<br/>"
        "2. Co-author a publication on AI-assisted treatment response prediction<br/>"
        "3. Provide your clinicians with free platform access for 12 months<br/><br/>"
        "All data sharing would be governed by a Data Sharing Agreement (template attached). "
        "No patient-identifiable data is required -- fully anonymised records only.<br/><br/>"
        "Live platform: preview-chat-6cbbdd64-b04b-40df-a2f3-12616b64fcbf.space-z.ai<br/>"
        "GitHub: github.com/testdemoqwenai2025-creator/synthegy<br/><br/>"
        "I would welcome a 30-minute conversation at your convenience.<br/><br/>"
        "Contact: synthegy.acquisition@gmail.com",
        sSmall))

    s.append(Spacer(1, 8*mm))

    s.append(Paragraph("Template 2: CRO", sH2))
    s.append(Paragraph(
        "<b>Subject:</b> Technology partnership -- Synthegy AI platform for clinical trial optimisation<br/><br/>"
        "Dear [Name],<br/><br/>"
        "I am writing to propose a technology partnership between [CRO] and Synthegy, a "
        "bench-to-bedside AI platform that connects 12 public databases through a single LLM "
        "reasoning layer, with clinical cohort analysis, outcome prediction, and CDISC SDTM "
        "regulatory export.<br/><br/>"
        "We believe Synthegy can add value to [CRO]'s RA and asthma programmes by:<br/>"
        "1. Predicting treatment response before patient enrolment (biomarker-based model)<br/>"
        "2. Generating CDISC SDTM-compatible exports from raw patient data<br/>"
        "3. Identifying compound-disease matches for drug repurposing<br/>"
        "4. Providing literature confidence scoring for clinical trial protocols<br/><br/>"
        "We are seeking a pilot engagement: 3 months, 1 therapeutic area (RA or asthma), "
        "with option to extend. In exchange, [CRO] would provide de-identified patient data "
        "for model validation under a Data Sharing Agreement.<br/><br/>"
        "Live platform: preview-chat-6cbbdd64-b04b-40df-a2f3-12616b64fcbf.space-z.ai<br/><br/>"
        "Contact: synthegy.acquisition@gmail.com",
        sSmall))

    s.append(Spacer(1, 8*mm))

    s.append(Paragraph("Template 3: Government Health Service (NHS Digital / UK Biobank)", sH2))
    s.append(Paragraph(
        "<b>Subject:</b> Data access application enquiry -- Synthegy AI platform for RA/Asthma research<br/><br/>"
        "Dear [Data Access Team],<br/><br/>"
        "I am writing to enquire about data access for a research project using the Synthegy "
        "platform -- a bench-to-bedside AI intelligence system that connects 12 public databases "
        "(PubChem, ChEMBL, ORD, openFDA, WHO) with clinical patient data through an LLM reasoning "
        "layer.<br/><br/>"
        "We are seeking access to de-identified RA and/or asthma patient records to:<br/>"
        "1. Validate our outcome prediction model (currently trained on 300 synthetic patients)<br/>"
        "2. Build a real-world evidence pipeline for treatment response prediction<br/>"
        "3. Publish open-access results benefiting the NHS research community<br/><br/>"
        "No patient-identifiable data is required. All processing would comply with UK GDPR, "
        "the Data Protection Act 2018, and the NHS Digital Data Security Standard. We hold (or "
        "will obtain before data access) ISO 27001 certification and NHS Data Security and "
        "Protection Toolkit compliance.<br/><br/>"
        "We are happy to complete a full Data Access Request (DAR) or UK Biobank application.<br/><br/>"
        "Contact: synthegy.acquisition@gmail.com",
        sSmall))

    s.append(PageBreak())

    # --- Data Sharing Agreement Outline ---
    s.append(Paragraph("Data Sharing Agreement -- Key Terms Template", sH1))
    s.append(hr())
    s.append(Paragraph(
        "This is a summary of key terms for a Data Sharing Agreement (DSA) between Synthegy and "
        "a data-providing organisation. A full DSA should be drafted by a qualified data protection "
        "solicitor.",
        sSmall))
    s.append(Spacer(1, 4*mm))

    dsa = [
        ["Clause", "Key Terms"],
        ["1. Data Type", "Fully anonymised, de-identified patient records. NO identifiable data. NO special category data under UK GDPR Art 9."],
        ["2. Data Scope", "Disease: RA and/or asthma. Fields: diagnosis year, age at onset, sex, biomarkers, treatment history, outcomes at 24 months. NO names, NO NHS numbers, NO postcodes, NO dates of birth."],
        ["3. Purpose", "Model validation and improvement of treatment response prediction. Co-authored publication. No commercial resale of raw data."],
        ["4. Retention", "Data retained for 3 years from receipt, then permanently deleted. Anonymised aggregate statistics may be retained indefinitely."],
        ["5. Security", "Data stored in UK-based, ISO 27001-certified infrastructure. Encrypted at rest (AES-256) and in transit (TLS 1.3). Access restricted to named individuals."],
        ["6. Compliance", "UK GDPR, Data Protection Act 2018, NHS Data Security and Protection Toolkit, Caldicott Principles."],
        ["7. IP", "Synthegy retains IP in the platform, models, and algorithms. Data provider retains IP in the raw data. Co-authored publications jointly owned."],
        ["8. Termination", "Either party may terminate with 30 days notice. On termination, all data returned or destroyed within 7 days, with certificate of destruction."],
        ["9. Audit", "Data provider may audit Synthegy's data handling once per year with 14 days notice."],
        ["10. Publication", "Both parties must approve publications before submission. No patient-identifiable information in any publication."],
    ]
    dt = Table(dsa, colWidths=[35*mm, CW-35*mm])
    dt.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'Sans-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'Sans', 8),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('TEXTCOLOR', (0,1), (-1,-1), MUTED),
        ('BACKGROUND', (0,0), (-1,0), HDR),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SEC_BG, STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    s.append(dt)
    s.append(Spacer(1, 8*mm))
    s.append(Paragraph(
        "IMPORTANT: This template is for guidance only. Engage a qualified data protection solicitor "
        "before signing any DSA. The Information Commissioner's Office (ICO) provides guidance at "
        "ico.org.uk. For NHS data, also consult the NHS Digital Data Access Request Service (DARS).",
        sSmall))

    return s


# =========================================================================
# MAIN
# =========================================================================

def generate_pdf(story_fn, path, title, subject):
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=LM, rightMargin=RM, topMargin=TM, bottomMargin=BM,
        title=title, author="Synthegy", subject=subject, creator="Synthegy",
    )
    doc.build(story_fn(), onFirstPage=dark_page, onLaterPages=dark_page)
    sz = os.path.getsize(path)
    print(f"  {path} ({sz:,} bytes)")

def main():
    print("Generating Synthegy legal + commercial documents...")

    print("1. Provisional Patent Application:")
    generate_pdf(build_patent, "/home/z/my-project/download/legal/Synthegy_Provisional_Patent.pdf",
                 "Synthegy Provisional Patent Application",
                 "Multi-Database Knowledge Graph Traversal Method")

    print("2. Seed Deck:")
    generate_pdf(build_seed_deck, "/home/z/my-project/download/Synthegy_Seed_Deck.pdf",
                 "Synthegy Seed Deck",
                 "Seed Round Investor Presentation")

    print("3. Partnership Outreach Package:")
    generate_pdf(build_partnership_package, "/home/z/my-project/download/partnerships/Synthegy_Partnership_Package.pdf",
                 "Synthegy Partnership Outreach Package",
                 "Hospital, CRO, and Government Health Service Partnership Programme")

    print("Done.")

if __name__ == "__main__":
    main()
