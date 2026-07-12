#!/usr/bin/env python3
"""
Synthegy Acquisition Prospectus — PDF report generator.
Uses ReportLab with the dark palette from the PDF skill.
"""

import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# --- Font registration ---
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
# NotoSansSC is a variable font with brackets in filename - use Sarasa instead
pdfmetrics.registerFont(TTFont('NotoSansSC', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', f'{FONT_DIR}/truetype/chinese/SarasaMonoSC-Bold.ttf'))

# --- Palette (from cascade) ---
PAGE_BG       = colors.HexColor('#090a0b')
SECTION_BG    = colors.HexColor('#181b1c')
CARD_BG       = colors.HexColor('#232729')
TABLE_STRIPE  = colors.HexColor('#1a1e20')
HEADER_FILL   = colors.HexColor('#375260')
BORDER        = colors.HexColor('#4b575d')
ACCENT        = colors.HexColor('#74b2d2')
ACCENT_2      = colors.HexColor('#be6d52')
TEXT_PRIMARY  = colors.HexColor('#ecedee')
TEXT_MUTED    = colors.HexColor('#919699')
SEM_SUCCESS   = colors.HexColor('#77b48c')

# --- Styles ---
styles = getSampleStyleSheet()

sCoverTitle = ParagraphStyle('CoverTitle', parent=styles['Title'],
    fontName='NotoSerifSC-Bold', fontSize=42, leading=48,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=8)
sCoverKicker = ParagraphStyle('CoverKicker', parent=styles['Normal'],
    fontName='NotoSansSC', fontSize=11, leading=14,
    textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=20)
sCoverSummary = ParagraphStyle('CoverSummary', parent=styles['Normal'],
    fontName='NotoSerifSC', fontSize=12, leading=18,
    textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=12)
sCoverMeta = ParagraphStyle('CoverMeta', parent=styles['Normal'],
    fontName='NotoSansSC', fontSize=10, leading=14,
    textColor=TEXT_MUTED, alignment=TA_LEFT)
sCoverContact = ParagraphStyle('CoverContact', parent=styles['Normal'],
    fontName='NotoSansSC-Bold', fontSize=12, leading=16,
    textColor=ACCENT, alignment=TA_LEFT)

sH1 = ParagraphStyle('H1', parent=styles['Heading1'],
    fontName='NotoSerifSC-Bold', fontSize=22, leading=28,
    textColor=ACCENT, spaceBefore=24, spaceAfter=12)
sH2 = ParagraphStyle('H2', parent=styles['Heading2'],
    fontName='NotoSerifSC-Bold', fontSize=16, leading=22,
    textColor=TEXT_PRIMARY, spaceBefore=16, spaceAfter=8)
sBody = ParagraphStyle('Body', parent=styles['Normal'],
    fontName='NotoSerifSC', fontSize=10.5, leading=16,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT, spaceAfter=8)
sBodyMuted = ParagraphStyle('BodyMuted', parent=sBody,
    textColor=TEXT_MUTED)
sBullet = ParagraphStyle('Bullet', parent=sBody,
    leftIndent=16, bulletIndent=4, spaceAfter=4)
sStat = ParagraphStyle('Stat', parent=styles['Normal'],
    fontName='NotoSerifSC-Bold', fontSize=28, leading=32,
    textColor=ACCENT, alignment=TA_CENTER)
sStatLabel = ParagraphStyle('StatLabel', parent=styles['Normal'],
    fontName='NotoSansSC', fontSize=9, leading=12,
    textColor=TEXT_MUTED, alignment=TA_CENTER)
sPull = ParagraphStyle('Pull', parent=sBody,
    fontName='NotoSerifSC-Bold', fontSize=14, leading=20,
    textColor=ACCENT, leftIndent=20, rightIndent=20, spaceBefore=12, spaceAfter=12)
sFooter = ParagraphStyle('Footer', parent=styles['Normal'],
    fontName='NotoSansSC', fontSize=8, leading=10,
    textColor=TEXT_MUTED, alignment=TA_CENTER)

W, H = A4
LEFT_M = 25*mm
RIGHT_M = 25*mm
TOP_M = 25*mm
BOTTOM_M = 25*mm
CONTENT_W = W - LEFT_M - RIGHT_M

def build_story():
    story = []

    # ===== PAGE 1: COVER =====
    story.append(Spacer(1, 60*mm))
    story.append(Paragraph("ACQUISITION PROSPECTUS &amp; TECHNICAL BRIEF", sCoverKicker))
    story.append(Paragraph("SYNTHEGY", sCoverTitle))
    story.append(Paragraph("Strategy-Aware AI for Synthetic Chemistry", sCoverKicker))
    story.append(Spacer(1, 20*mm))
    story.append(Paragraph(
        "A seven-tier agentic reasoning platform connecting twelve free public databases "
        "through a single LLM reasoning layer -- from molecular structure to clinical outcome, "
        "bench to bedside, in one platform.",
        sCoverSummary))
    story.append(Spacer(1, 30*mm))
    story.append(Paragraph("Prepared for: Acquirers in pharmaceutical, biotechnology, and scientific AI sectors", sCoverMeta))
    story.append(Paragraph("Document classification: Confidential -- for distribution to 40 selected organisations", sCoverMeta))
    story.append(Spacer(1, 15*mm))
    story.append(Paragraph("To express interest, contact: synthegy.acquisition@gmail.com", sCoverContact))
    story.append(PageBreak())

    # ===== PAGE 2: EXECUTIVE SUMMARY =====
    story.append(Paragraph("Executive Summary", sH1))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

    story.append(Paragraph(
        "<b>Synthegy is a bench-to-bedside intelligence platform</b> that connects twelve free public "
        "databases -- PubChem, ChEMBL, the Open Reaction Database, Europe PMC, RCSB PDB, KEGG, "
        "OpenTargets, Google Patents, openFDA, and the WHO Global Health Observatory -- through a "
        "single LLM reasoning layer. It takes a chemist from molecular structure lookup to clinical "
        "outcome prediction in one session, using only free data and open-source tooling.",
        sBody))

    story.append(Paragraph(
        "The platform deploys as four Bun/Hono microservices (ports 3001-3005) behind a Next.js 16 "
        "frontend, with a Caddy gateway handling routing and API-key authentication. Every endpoint "
        "is cached in SQLite with TTLs appropriate to the data's mutability. The architecture is "
        "designed for horizontal scale -- each microservice is independently deployable and stateless "
        "except for its cache.",
        sBody))

    story.append(Spacer(1, 8*mm))

    # Stats row
    stat_data = [
        [Paragraph("7", sStat), Paragraph("12", sStat), Paragraph("300", sStat), Paragraph("30+", sStat)],
        [Paragraph("tiers", sStatLabel), Paragraph("data sources", sStatLabel),
         Paragraph("patients", sStatLabel), Paragraph("endpoints", sStatLabel)],
    ]
    stat_table = Table(stat_data, colWidths=[CONTENT_W/4]*4, rowHeights=[36, 16])
    stat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), SECTION_BG),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEABOVE', (0,0), (-1,0), 1, ACCENT),
        ('LINEBELOW', (0,-1), (-1,-1), 1, ACCENT),
    ]))
    story.append(stat_table)
    story.append(Spacer(1, 8*mm))

    story.append(Paragraph(
        '"The chemistry equivalent of an LHC data pipeline -- raw molecular data filtered through '
        'an LLM reasoning layer into strategic decisions."',
        sPull))

    story.append(Paragraph(
        "The knowledge graph -- which traverses compound, target, pathway, and disease databases in a "
        "single API call -- is the core differentiator. No existing chemistry-AI platform connects these "
        "four layers automatically. The active-learning feedback loop records every chemist accept/revise "
        "signal and extracts keyword patterns, creating a proprietary preference profile that compounds "
        "with usage. The clinical layer (300 synthetic patients across 6 diseases, with a 50-year "
        "epidemiological basis and real FDA/WHO government data integration) provides a ready-to-swap "
        "pipeline for real-world evidence partnerships.",
        sBody))

    story.append(PageBreak())

    # ===== PAGE 3: THE PROBLEM & OPPORTUNITY =====
    story.append(Paragraph("The Problem", sH1))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

    story.append(Paragraph(
        "When a medicinal chemistry team has five candidate synthesis routes and needs to pick one to "
        "advance, they make a decision worth $5-10 million with spreadsheets, gut feel, and a two-hour "
        "meeting. The data needed to make that decision empirically -- experimental reaction precedents, "
        "ADMET profiles, literature confidence, patent freedom-to-operate, biological target context, "
        "and clinical outcome data -- exists across twelve different public databases. But no one connects "
        "them.",
        sBody))

    story.append(Paragraph(
        "The result: pharmaceutical companies spend $2.6 billion per approved drug, with 90% of "
        "candidates failing in clinical trials. Much of that failure is predictable at the chemistry "
        "stage -- if the right data were connected and reasoned over before the first synthesis.",
        sBody))

    story.append(Paragraph("The Opportunity", sH2))

    story.append(Paragraph(
        "Synthegy turns that multi-database lookup -- which currently takes a PhD chemist 2-3 days -- into "
        "a 2-minute automated report. The chemist types a natural-language instruction, the platform "
        "fetches PubChem properties, ChEMBL bioactivity, ORD experimental reactions, RDKit ADMET "
        "descriptors, Europe PMC literature confidence, RCSB PDB structures, KEGG pathways, OpenTargets "
        "disease associations, Google Patents, openFDA adverse events, and WHO health indicators -- then "
        "feeds it all to an LLM Strategic Evaluator that scores the route and explains its reasoning.",
        sBody))

    story.append(Paragraph(
        "The chemistry software TAM is $2 billion. The drug discovery AI market is projected to reach "
        "$8 billion by 2030. But the real opportunity is not software revenue -- it is owning the decision "
        "moment. Every pharma company makes 50+ route-selection decisions per year. Each one is worth "
        "$10M+ in downstream costs. Synthegy can generate a Compound Advancement Report for each one in "
        "2 minutes, at zero marginal cost, using data that is free.",
        sBody))

    story.append(PageBreak())

    # ===== PAGE 4: TECHNICAL ARCHITECTURE =====
    story.append(Paragraph("Technical Architecture", sH1))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

    story.append(Paragraph(
        "Synthegy is built as a seven-tier microservice architecture. Each tier is independently "
        "deployable, horizontally scalable, and backed by SQLite caching with TTLs appropriate to the "
        "data's mutability. All services use Bun (the JavaScript runtime) with Hono (the web framework) "
        "for sub-millisecond cold starts and native TypeScript throughout. The Python services "
        "(ORD parser, RDKit ADMET, patient generator) are invoked via subprocess bridges.",
        sBody))

    arch_data = [
        ["Tier", "Service", "Port", "Data Sources", "Key Capability"],
        ["01", "Frontend", "3000", "--", "Next.js 16, typed API clients, session-aware UI"],
        ["02", "Middleware", "--", "--", "Caddy gateway, API-key auth, rate limiting, CORS"],
        ["03", "Backend", "3001", "--", "LLM Strategic Evaluator, sessions, collections, feedback"],
        ["04", "Molecule", "3002", "PubChem (124M), ChEMBL (2.4M)", "Lookup, substructure, property filter, similarity"],
        ["05", "Experimental", "3003", "ORD (100K), RDKit, Europe PMC (40M)", "Reactions, ADMET, literature confidence"],
        ["06", "Biological", "3004", "PDB (220K), KEGG, OpenTargets, Patents (100M)", "Knowledge graph, 3D structures, patents"],
        ["07", "Clinical", "3005", "openFDA, WHO GHO, synthetic cohorts", "300 patients, 6 diseases, prediction, CDISC"],
    ]
    arch_table = Table(arch_data, colWidths=[12*mm, 28*mm, 12*mm, 55*mm, 63*mm])
    arch_table.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'NotoSansSC-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'NotoSansSC', 8),
        ('TEXTCOLOR', (0,0), (-1,0), TEXT_PRIMARY),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MUTED),
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('BACKGROUND', (0,1), (-1,-1), SECTION_BG),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SECTION_BG, TABLE_STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('TEXTCOLOR', (1,1), (1,-1), ACCENT),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph(
        "All twelve data sources are free, public, and require no API keys. The platform's marginal "
        "cost per query is effectively zero -- the only infrastructure cost is the Bun runtime and SQLite "
        "cache storage. The LLM Strategic Evaluator uses the z-ai-web-dev-sdk, which provides "
        "chat completions with structured JSON output.",
        sBody))

    story.append(PageBreak())

    # ===== PAGE 5: DATA SOURCES TABLE =====
    story.append(Paragraph("Data Sources &amp; Capabilities", sH1))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

    story.append(Paragraph(
        "Synthegy integrates twelve free public databases -- more than any competing chemistry-AI "
        "platform. Each source is cached with TTLs appropriate to its mutability: molecular structures "
        "(30 days), literature (7 days), adverse events (24 hours), and real-time data (no cache).",
        sBody))
    story.append(Spacer(1, 4*mm))

    ds_data = [
        ["Source", "Scale", "Capability", "Free?"],
        ["PubChem PUG REST", "124M compounds", "Structure lookup, substructure search, property filter", "Yes"],
        ["NCBI E-utilities", "124M indexed", "Ranked compound search, numerical property ranges", "Yes"],
        ["ChEMBL REST API", "2.4M bioactive", "Bioactivity (IC50/Ki/Kd), mechanisms, target search", "Yes"],
        ["Open Reaction DB", "100K+ reactions", "Real experimental procedures, inputs, conditions, yields", "Yes"],
        ["RDKit (computed)", "Deterministic", "Lipinski, Veber, BBB, PAINS alerts, drug-likeness score", "Yes"],
        ["Europe PMC", "40M+ citations", "Literature confidence scoring, top papers by citation", "Yes"],
        ["RCSB PDB", "220K+ structures", "3D protein structures, resolution, ligands, organisms", "Yes"],
        ["KEGG REST", "500+ pathways", "Compound to pathway mapping", "Yes"],
        ["OpenTargets GraphQL", "100K+ associations", "Target to disease scoring, therapeutic relevance", "Yes"],
        ["Google Patents", "100M+ patents", "Patent mining, assignee tracking, freedom-to-operate", "Yes"],
        ["openFDA", "600K+ events/drug", "Real adverse event counts, top reactions, drug labels", "Yes"],
        ["WHO GHO", "3,070 indicators", "Global health observatory, mortality, NCD data", "Yes"],
    ]
    ds_table = Table(ds_data, colWidths=[38*mm, 28*mm, 80*mm, 14*mm])
    ds_table.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'NotoSansSC-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'NotoSansSC', 8),
        ('TEXTCOLOR', (0,0), (-1,0), TEXT_PRIMARY),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MUTED),
        ('TEXTCOLOR', (3,1), (3,-1), SEM_SUCCESS),
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SECTION_BG, TABLE_STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('TEXTCOLOR', (0,1), (0,-1), ACCENT),
    ]))
    story.append(ds_table)

    story.append(PageBreak())

    # ===== PAGE 6: KNOWLEDGE GRAPH =====
    story.append(Paragraph("The Knowledge Graph Differentiator", sH1))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

    story.append(Paragraph(
        "The single feature that no competing platform offers: a knowledge graph that traverses four "
        "databases in a single API call, linking a chemical compound to its biological context through "
        "targets, pathways, and diseases.",
        sBody))

    story.append(Paragraph("The Traversal", sH2))
    story.append(Paragraph(
        "<b>Compound</b> (PubChem) -&gt; <b>Targets</b> (ChEMBL, with gene-symbol extraction) -&gt; "
        "<b>Pathways</b> (KEGG REST) -&gt; <b>Diseases</b> (OpenTargets GraphQL, with association scores)",
        sPull))

    story.append(Paragraph(
        "When a chemist looks up Aspirin, the knowledge graph returns 28 nodes and 27 edges in under 2 "
        "seconds: the compound node, the Cyclooxygenase target (gene PTGS2, Ensembl ENSG00000073756), "
        "the KEGG pathway (bile secretion), and 15 associated diseases with scores -- rheumatoid arthritis "
        "(0.635), gout (0.631), migraine (0.631), osteoarthritis (0.623), headache (0.618), ulcerative "
        "colitis (0.613), fever, pain, myocardial infarction, and more.",
        sBody))

    story.append(Paragraph(
        "This is not a search result. It is a biological context graph that tells the chemist not just "
        "what the compound is, but what it does, how it does it, and what diseases it might treat -- in "
        "one call, from four databases, with no manual lookup.",
        sBody))

    story.append(Paragraph("Why This Matters", sH2))
    story.append(Paragraph(
        "Every chemistry-AI platform can look up a compound. Every bioinformatics platform can look up a "
        "target. But no platform connects the two automatically -- because the link between a PubChem CID "
        "and an OpenTargets disease association requires traversing four different databases with four "
        "different query languages (REST, REST, REST, GraphQL) and four different identifier systems "
        "(CID, ChEMBL ID, gene symbol, Ensembl ID, MONDO ID).",
        sBody))

    story.append(Paragraph(
        "Synthegy's knowledge graph handles this traversal automatically, including gene-symbol "
        "extraction from target names ('Cyclooxygenase' -&gt; PTGS2), Ensembl ID resolution via "
        "OpenTargets search, and KEGG compound-to-pathway linking. The chemist sees the result; the "
        "platform handles the plumbing.",
        sBody))

    story.append(PageBreak())

    # ===== PAGE 7: CLINICAL LAYER =====
    story.append(Paragraph("Clinical Layer: 6 Diseases, 300 Patients, 50-Year Span", sH1))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

    story.append(Paragraph(
        "The clinical layer is what separates Synthegy from every other chemistry-AI platform. It is "
        "not just a chemistry tool -- it is a bench-to-bedside intelligence system that connects molecular "
        "structures to patient outcomes.",
        sBody))

    story.append(Paragraph("Synthetic Cohorts with Real Government Data", sH2))
    story.append(Paragraph(
        "Six disease cohorts (rheumatoid arthritis, migraine, gout, osteoarthritis, ulcerative colitis, "
        "asthma) with 50 patients each -- 300 total. Each cohort spans 50 years of epidemiological reality "
        "(1975-2025) with era-appropriate treatment patterns, disease-specific biomarkers, outcome "
        "metrics, and outlier types (juvenile onset, exceptional responders, severe adverse events).",
        sBody))

    story.append(Paragraph(
        "Alongside the synthetic data, the platform integrates real government data from openFDA "
        "(adverse event counts for every drug -- e.g. methotrexate: 494,655 events) and the WHO Global "
        "Health Observatory (3,070 health indicators). Where no government data exists for a specific "
        "disease, the platform explicitly surfaces 'Null' rather than hiding the gap -- transparency that "
        "pharma partners value.",
        sBody))

    story.append(Paragraph("Outcome Prediction &amp; Regulatory Export", sH2))
    story.append(Paragraph(
        "A logistic-regression outcome prediction model uses biomarkers, treatment history, and "
        "diagnosis era to estimate remission probability per patient. The model is trained on the "
        "synthetic cohort and designed for fine-tuning when real patient data arrives. A CDISC SDTM "
        "export endpoint produces regulatory-ready output (DM, AE, VS domains) compatible with FDA "
        "submission standards.",
        sBody))

    story.append(Paragraph(
        "The RWE (Real-World Evidence) CSV import pipeline is the swap path: when a hospital or CRO "
        "partner provides de-identified patient data, the synthetic generator is replaced with a CSV "
        "parser. Every downstream analysis endpoint -- cohort statistics, outcome distributions, "
        "predictions, CDISC export -- stays identical. One function changes; the platform adapts.",
        sBody))

    story.append(PageBreak())

    # ===== PAGE 8: COMMERCIAL OPPORTUNITY =====
    story.append(Paragraph("Commercial Opportunity &amp; Acquisition Thesis", sH1))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=12))

    story.append(Paragraph("The Market", sH2))
    story.append(Paragraph(
        "The chemistry software market is $2 billion. The AI-in-drug-discovery market is projected to "
        "reach $8 billion by 2030, growing at 40% CAGR. But the real addressable market is not software "
        "licensing -- it is the $50 billion spent annually on late-stage drug failures that could be "
        "predicted earlier with better data integration.",
        sBody))

    story.append(Paragraph("Comparable Transactions", sH2))

    comp_data = [
        ["Company", "Valuation", "What They Did", "Synthegy's Edge"],
        ["Exscientia", "$1.5B (acquired)", "AI-driven candidate nomination", "Broader data integration, clinical layer"],
        ["Recursion", "$2B (IPO)", "Phenotypic screening + AI", "Knowledge graph, multi-database reasoning"],
        ["Schrodinger", "$1.5B (public)", "Physics-based lead optimisation", "Free data sources, LLM reasoning layer"],
        ["Insitro", "$2B (private)", "ML for drug discovery", "Active learning feedback loop"],
    ]
    comp_table = Table(comp_data, colWidths=[30*mm, 28*mm, 58*mm, 54*mm])
    comp_table.setStyle(TableStyle([
        ('FONT', (0,0), (-1,0), 'NotoSansSC-Bold', 8),
        ('FONT', (0,1), (-1,-1), 'NotoSansSC', 8),
        ('TEXTCOLOR', (0,0), (-1,0), TEXT_PRIMARY),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_MUTED),
        ('TEXTCOLOR', (3,1), (3,-1), ACCENT),
        ('BACKGROUND', (0,0), (-1,0), HEADER_FILL),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SECTION_BG, TABLE_STRIPE]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 6*mm))

    story.append(Paragraph("Acquisition Thesis", sH2))
    story.append(Paragraph(
        "Synthegy is seeking a single acquirer -- a pharmaceutical company, biotechnology firm, or "
        "scientific AI platform -- that can deploy the technology across its R&amp;D organisation and "
        "connect it to real patient data. The platform is production-ready: all code is on GitHub, "
        "all services are containerised, all endpoints are documented, and the architecture is designed "
        "for horizontal scale.",
        sBody))

    story.append(Paragraph(
        "The knowledge graph traversal method, the active-learning feedback loop, and the multi-database "
        "integration architecture are the three defensible IP assets. A provisional patent on the "
        "traversal method is recommended pre-acquisition.",
        sBody))

    story.append(Spacer(1, 15*mm))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=8))
    story.append(Paragraph(
        "<b>To express interest in acquiring Synthegy, contact:</b><br/>"
        "synthegy.acquisition@gmail.com<br/><br/>"
        "All responses acknowledged within 48 hours with appropriate technical and commercial follow-up.<br/><br/>"
        "Source code: github.com/testdemoqwenai2025-creator/synthegy<br/>"
        "Live platform: preview-chat-6cbbdd64-b04b-40df-a2f3-12616b64fcbf.space-z.ai",
        sBody))

    return story


def page_decorator(canvas, doc):
    """Dark background + page number."""
    canvas.saveState()
    canvas.setFillColor(PAGE_BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFont('NotoSansSC', 8)
    canvas.setFillColor(TEXT_MUTED)
    page_num = canvas.getPageNumber()
    canvas.drawCentredString(W/2, 12*mm, f"Synthegy Acquisition Prospectus  |  Page {page_num}  |  Confidential")
    canvas.restoreState()


def main():
    output_path = "/home/z/my-project/download/Synthegy_Acquisition_Prospectus.pdf"
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_M, rightMargin=RIGHT_M,
        topMargin=TOP_M, bottomMargin=BOTTOM_M,
        title="Synthegy Acquisition Prospectus",
        author="Synthegy",
        subject="Acquisition Prospectus & Technical Brief",
        creator="Synthegy",
    )
    story = build_story()
    doc.build(story, onFirstPage=page_decorator, onLaterPages=page_decorator)
    print(f"PDF generated: {output_path}")
    print(f"Size: {os.path.getsize(output_path):,} bytes")


if __name__ == "__main__":
    main()
