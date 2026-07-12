// Knowledge graph builder: links a compound to its biological context.
//
// Traversal: compound → ChEMBL targets (via existing molecule service) →
// KEGG pathways + OpenTargets diseases.
//
// The graph is returned as nodes + edges for frontend visualisation.

import {
  findKeggCompound,
  getKeggPathways,
  findTarget,
  getDiseasesForTarget,
  type KeggPathway,
  type DiseaseAssociation,
} from "./clients.ts";

export interface GraphNode {
  id: string;
  label: string;
  type: "compound" | "target" | "pathway" | "disease";
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraph {
  compound: { name: string; smiles: string };
  nodes: GraphNode[];
  edges: GraphEdge[];
  targets: Array<{ chemblId: string; name: string; geneSymbol: string | null; ensemblId: string | null }>;
  pathways: KeggPathway[];
  diseases: DiseaseAssociation[];
  fetchedAt: number;
}

// Build a knowledge graph for a compound.
// `targets` should come from the molecule service's ChEMBL lookup — a list of
// { chemblId, name } pairs. We then find the gene symbol for each target,
// look up KEGG pathways for the compound, and find diseases for each target.
export async function buildKnowledgeGraph(
  compoundName: string,
  compoundSmiles: string,
  targets: Array<{ chemblId: string; name: string; geneSymbol?: string }>
): Promise<KnowledgeGraph> {
  const nodes: GraphNode[] = [
    { id: "compound", label: compoundName, type: "compound", metadata: { smiles: compoundSmiles } },
  ];
  const edges: GraphEdge[] = [];

  // 1. Add target nodes
  const targetInfo: Array<{ chemblId: string; name: string; geneSymbol: string | null; ensemblId: string | null }> = [];
  for (const t of targets.slice(0, 5)) {
    // Try to extract a gene symbol from the target name (common patterns)
    const geneSymbol = t.geneSymbol ?? extractGeneSymbol(t.name);
    let ensemblId: string | null = null;
    if (geneSymbol) {
      const otTarget = await findTarget(geneSymbol).catch(() => null);
      if (otTarget) ensemblId = otTarget.ensemblId;
    }
    targetInfo.push({ chemblId: t.chemblId, name: t.name, geneSymbol, ensemblId });
    nodes.push({
      id: `target:${t.chemblId}`,
      label: t.name,
      type: "target",
      metadata: { chemblId: t.chemblId, geneSymbol, ensemblId },
    });
    edges.push({ source: "compound", target: `target:${t.chemblId}`, label: "active against" });
  }

  // 2. Find KEGG pathways for the compound
  const keggId = await findKeggCompound(compoundName).catch(() => null);
  const pathways: KeggPathway[] = [];
  if (keggId) {
    const paths = await getKeggPathways(keggId).catch(() => []);
    pathways.push(...paths);
    for (const p of paths.slice(0, 8)) {
      const nodeId = `pathway:${p.pathwayId}`;
      nodes.push({ id: nodeId, label: p.name, type: "pathway", metadata: { pathwayId: p.pathwayId } });
      edges.push({ source: "compound", target: nodeId, label: "involved in" });
    }
  }

  // 3. Find diseases for each target (via OpenTargets)
  const allDiseases: DiseaseAssociation[] = [];
  const seenDiseases = new Set<string>();
  for (const t of targetInfo) {
    if (!t.ensemblId) continue;
    const diseases = await getDiseasesForTarget(t.ensemblId, 5).catch(() => []);
    for (const d of diseases) {
      if (seenDiseases.has(d.diseaseId)) continue;
      seenDiseases.add(d.diseaseId);
      allDiseases.push(d);
      const nodeId = `disease:${d.diseaseId}`;
      nodes.push({ id: nodeId, label: d.diseaseName, type: "disease", metadata: { score: d.score } });
      edges.push({ source: `target:${t.chemblId}`, target: nodeId, label: "treats/associates" });
    }
  }

  return {
    compound: { name: compoundName, smiles: compoundSmiles },
    nodes,
    edges,
    targets: targetInfo,
    pathways,
    diseases: allDiseases.slice(0, 15),
    fetchedAt: Date.now(),
  };
}

// Try to extract a gene symbol from a target name.
// Common patterns: "Cyclooxygenase-2" → "PTGS2", "EGFR" → "EGFR", etc.
function extractGeneSymbol(name: string): string | null {
  const upper = name.toUpperCase().trim();
  // Direct match: if the name IS a gene symbol (all caps, short)
  if (/^[A-Z][A-Z0-9]{1,7}$/.test(upper)) return upper;
  // Common aliases
  const aliases: Record<string, string> = {
    "CYCLOOXYGENASE-2": "PTGS2",
    "CYCLOOXYGENASE 2": "PTGS2",
    "CYCLOOXYGENASE-1": "PTGS1",
    "CYCLOOXYGENASE 1": "PTGS1",
    "CYCLOOXYGENASE": "PTGS2",
    "PROSTAGLANDIN G/H SYNTHASE 2": "PTGS2",
    "PROSTAGLANDIN G/H SYNTHASE 1": "PTGS1",
    "PROSTAGLANDIN-ENDOPEROXIDE SYNTHASE 2": "PTGS2",
    "EPIDERMAL GROWTH FACTOR RECEPTOR": "EGFR",
    "VASCULAR ENDOTHELIAL GROWTH FACTOR RECEPTOR 2": "KDR",
    "DOPAMINE D2 RECEPTOR": "DRD2",
    "SEROTONIN 2A RECEPTOR": "HTR2A",
    "HISTAMINE H1 RECEPTOR": "HRH1",
  };
  return aliases[upper] ?? null;
}
