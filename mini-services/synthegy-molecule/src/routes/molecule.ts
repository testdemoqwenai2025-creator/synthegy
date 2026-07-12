// Routes for the molecule service.

import { Hono } from "hono";
import {
  getPropertiesByName,
  getPropertiesByCID,
  getPropertiesBySMILES,
  getSynonyms,
  getDescriptions,
  searchCompounds,
  similaritySearch,
  substructureSearch,
  propertyFilter,
  getStructureImage,
  type CompoundProperties,
  type CompoundDescription,
  type PropertyFilter,
} from "../pubchem.ts";
import { getBioactivity } from "../chembl.ts";
import { cacheStats, cacheClearExpired } from "../cache.ts";

export const molecule = new Hono();

// --- Full molecule record (properties + synonyms + descriptions) ----------

export interface MoleculeRecord {
  properties: CompoundProperties;
  synonyms: string[];
  descriptions: CompoundDescription[];
  pubchemUrl: string;
  fetchedAt: number;
  cached: boolean;
}

async function buildMoleculeRecord(
  props: CompoundProperties,
  cached: boolean
): Promise<MoleculeRecord> {
  const [synonyms, descriptions] = await Promise.all([
    getSynonyms(props.cid).catch(() => []),
    getDescriptions(props.cid).catch(() => []),
  ]);
  return {
    properties: props,
    synonyms,
    descriptions,
    pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${props.cid}`,
    fetchedAt: Date.now(),
    cached,
  };
}

// GET /api/molecule/name/:name — full molecule record by name
molecule.get("/name/:name", async (c) => {
  const name = c.req.param("name");
  const props = await getPropertiesByName(name).catch((err) => {
    throw new Error(`Lookup failed: ${err.message}`);
  });
  if (!props) {
    return c.json(
      {
        error: "not_found",
        message: `No PubChem compound found for name "${name}".`,
        query: name,
      },
      404
    );
  }
  const record = await buildMoleculeRecord(props, false);
  return c.json({ molecule: record });
});

// GET /api/molecule/cid/:cid — full molecule record by CID
molecule.get("/cid/:cid", async (c) => {
  const cidNum = Number(c.req.param("cid"));
  if (!Number.isFinite(cidNum) || cidNum <= 0) {
    return c.json({ error: "validation_error", message: "cid must be a positive integer" }, 400);
  }
  const props = await getPropertiesByCID(cidNum).catch((err) => {
    throw new Error(`Lookup failed: ${err.message}`);
  });
  if (!props) {
    return c.json(
      { error: "not_found", message: `No PubChem compound for CID ${cidNum}.`, cid: cidNum },
      404
    );
  }
  const record = await buildMoleculeRecord(props, false);
  return c.json({ molecule: record });
});

// GET /api/molecule/smiles/:smiles — full molecule record by SMILES
molecule.get("/smiles/:smiles", async (c) => {
  const smiles = decodeURIComponent(c.req.param("smiles"));
  const props = await getPropertiesBySMILES(smiles).catch((err) => {
    throw new Error(`Lookup failed: ${err.message}`);
  });
  if (!props) {
    return c.json(
      {
        error: "not_found",
        message: `No PubChem compound found for SMILES "${smiles}".`,
        query: smiles,
      },
      404
    );
  }
  const record = await buildMoleculeRecord(props, false);
  return c.json({ molecule: record });
});

// GET /api/molecule/search?q=&limit= — search by free text, returns ranked CIDs
molecule.get("/search", async (c) => {
  const q = c.req.query("q") ?? "";
  const limit = Math.min(Number(c.req.query("limit") ?? 10), 25);
  if (!q.trim()) {
    return c.json({ error: "validation_error", message: "q query parameter is required" }, 400);
  }
  const result = await searchCompounds(q, limit).catch((err) => {
    throw new Error(`Search failed: ${err.message}`);
  });
  // For convenience, fetch properties for each CID in parallel.
  const propLookups = await Promise.all(
    result.cids.map((cid) =>
      getPropertiesByCID(cid)
        .then((p) => p)
        .catch(() => null)
    )
  );
  const compounds = propLookups
    .filter((p): p is CompoundProperties => p !== null)
    .map((p) => ({
      cid: p.cid,
      name: p.iupacName ?? p.molecularFormula,
      molecularFormula: p.molecularFormula,
      molecularWeight: p.molecularWeight,
      canonicalSMILES: p.canonicalSMILES,
    }));
  return c.json({
    query: result.query,
    total: result.total,
    count: compounds.length,
    compounds,
  });
});

// GET /api/molecule/similarity?smiles=&threshold=&max= — 2D similarity search
molecule.get("/similarity", async (c) => {
  const smiles = c.req.query("smiles") ?? "";
  const threshold = Math.max(50, Math.min(100, Number(c.req.query("threshold") ?? 90)));
  const maxRecords = Math.min(Number(c.req.query("max") ?? 10), 25);
  if (!smiles.trim()) {
    return c.json(
      { error: "validation_error", message: "smiles query parameter is required" },
      400
    );
  }
  const cids = await similaritySearch(smiles, threshold, maxRecords).catch((err) => {
    throw new Error(`Similarity search failed: ${err.message}`);
  });
  const propLookups = await Promise.all(
    cids.map((cid) => getPropertiesByCID(cid).catch(() => null))
  );
  const compounds = propLookups
    .filter((p): p is CompoundProperties => p !== null)
    .map((p) => ({
      cid: p.cid,
      name: p.iupacName ?? p.molecularFormula,
      molecularFormula: p.molecularFormula,
      molecularWeight: p.molecularWeight,
      canonicalSMILES: p.canonicalSMILES,
    }));
  return c.json({
    query: { smiles, threshold, maxRecords },
    count: compounds.length,
    compounds,
  });
});

// GET /api/molecule/name/:name/image — proxy 2D structure PNG (cached)
molecule.get("/name/:name/image", async (c) => {
  const name = c.req.param("name");
  const size = c.req.query("size") ?? "300x300";
  const result = await getStructureImage(name, "name", size).catch((err) => {
    throw new Error(`Image fetch failed: ${err.message}`);
  });
  if (!result) {
    return c.json(
      { error: "not_found", message: `No structure image for name "${name}".` },
      404
    );
  }
  return new Response(result.blob, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=2592000", // 30 days
      "X-Molecule-Source": "pubchem",
    },
  });
});

// GET /api/molecule/cid/:cid/image — proxy 2D structure PNG by CID
molecule.get("/cid/:cid/image", async (c) => {
  const cid = c.req.param("cid");
  const size = c.req.query("size") ?? "300x300";
  const result = await getStructureImage(cid, "cid", size).catch((err) => {
    throw new Error(`Image fetch failed: ${err.message}`);
  });
  if (!result) {
    return c.json(
      { error: "not_found", message: `No structure image for CID ${cid}.` },
      404
    );
  }
  return new Response(result.blob, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=2592000",
      "X-Molecule-Source": "pubchem",
    },
  });
});

// GET /api/molecule/cid/:cid/synonyms — just synonyms
molecule.get("/cid/:cid/synonyms", async (c) => {
  const cidNum = Number(c.req.param("cid"));
  if (!Number.isFinite(cidNum)) {
    return c.json({ error: "validation_error", message: "cid must be numeric" }, 400);
  }
  const synonyms = await getSynonyms(cidNum).catch(() => []);
  return c.json({ cid: cidNum, count: synonyms.length, synonyms });
});

// GET /api/molecule/substructure?smiles=&max=
// Find all compounds containing the given SMILES scaffold.
molecule.get("/substructure", async (c) => {
  const smiles = c.req.query("smiles") ?? "";
  const maxRecords = Math.min(Number(c.req.query("max") ?? 15), 50);
  if (!smiles.trim()) {
    return c.json(
      { error: "validation_error", message: "smiles query parameter is required" },
      400
    );
  }
  const cids = await substructureSearch(smiles, maxRecords).catch((err) => {
    throw new Error(`Substructure search failed: ${err.message}`);
  });
  const propLookups = await Promise.all(
    cids.map((cid) => getPropertiesByCID(cid).catch(() => null))
  );
  const compounds = propLookups
    .filter((p): p is CompoundProperties => p !== null)
    .map((p) => ({
      cid: p.cid,
      name: p.iupacName ?? p.molecularFormula,
      molecularFormula: p.molecularFormula,
      molecularWeight: p.molecularWeight,
      canonicalSMILES: p.canonicalSMILES,
      xLogP: p.xLogP,
      tpsa: p.tpsa,
    }));
  return c.json({
    query: { smiles, maxRecords },
    count: compounds.length,
    compounds,
  });
});

// GET /api/molecule/filter?fields=XLGP:2:4,TPSA:60:100&MW:200:400&limit=15
// OR POST with JSON body for cleaner API.
// Filter compounds by computed property ranges (XLogP, TPSA, MW, etc.).
molecule.get("/filter", async (c) => {
  const fieldsParam = c.req.query("fields") ?? "";
  const limit = Math.min(Number(c.req.query("limit") ?? 15), 50);
  if (!fieldsParam) {
    return c.json(
      {
        error: "validation_error",
        message:
          'fields query parameter is required. Format: "XLGP:2:4,TPSA:60:100" (FIELD:min:max, comma-separated)',
        availableFields: ["XLGP", "TPSA", "MW", "HAC", "RBC", "HBDC", "HBAC", "CPLX", "TFC"],
      },
      400
    );
  }
  const filters: PropertyFilter[] = fieldsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const parts = s.split(":");
      if (parts.length !== 3) return null;
      const field = parts[0].toUpperCase() as PropertyFilter["field"];
      const min = Number(parts[1]);
      const max = Number(parts[2]);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
      return { field, min, max };
    })
    .filter((f): f is PropertyFilter => f !== null);

  if (!filters.length) {
    return c.json(
      { error: "validation_error", message: "No valid filters parsed from fields parameter." },
      400
    );
  }

  const result = await propertyFilter(filters, limit).catch((err) => {
    throw new Error(`Property filter failed: ${err.message}`);
  });

  const propLookups = await Promise.all(
    result.cids.map((cid) => getPropertiesByCID(cid).catch(() => null))
  );
  const compounds = propLookups
    .filter((p): p is CompoundProperties => p !== null)
    .map((p) => ({
      cid: p.cid,
      name: p.iupacName ?? p.molecularFormula,
      molecularFormula: p.molecularFormula,
      molecularWeight: p.molecularWeight,
      canonicalSMILES: p.canonicalSMILES,
      xLogP: p.xLogP,
      tpsa: p.tpsa,
    }));
  return c.json({
    query: filters,
    totalMatches: result.total,
    count: compounds.length,
    compounds,
  });
});

// GET /api/molecule/bioactivity?inchikey=BSYNRYMUTXBXSQ-UHFFFAOYSA-N&type=IC50
// Look up ChEMBL drug-development + bioactivity data for a compound.
molecule.get("/bioactivity", async (c) => {
  const inchikey = c.req.query("inchikey") ?? "";
  const type = c.req.query("type") || undefined; // IC50, Ki, Kd, EC50, etc.
  if (!inchikey.trim()) {
    return c.json(
      { error: "validation_error", message: "inchikey query parameter is required" },
      400
    );
  }
  const result = await getBioactivity(inchikey, type).catch((err) => {
    throw new Error(`ChEMBL lookup failed: ${err.message}`);
  });
  return c.json({ bioactivity: result });
});

// GET /api/molecule/stats — cache statistics (for ops dashboard)
molecule.get("/stats", (c) => {
  return c.json(cacheStats());
});

// POST /api/molecule/cache/clear — purge expired cache entries
molecule.post("/cache/clear", (c) => {
  const removed = cacheClearExpired();
  return c.json({ ok: true, removed, stats: cacheStats() });
});
