// /api/collections — CRUD for named compound collections.
//
// A collection groups compounds a chemist wants to keep (e.g. "COX-2 hits",
// "fragment screen positives", "lead series A"). Each item stores the PubChem
// CID + enough molecular data to render without re-querying PubChem.

import { Hono } from "hono";
import { z } from "zod";
import {
  db,
  newId,
  type CollectionRow,
  type CollectionItemRow,
} from "../db.ts";

export const collections = new Hono();

const CreateBody = z.object({
  label: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  chemistId: z.string().max(100).optional(),
});

const AddItemBody = z.object({
  cid: z.number().int().min(0),  // 0 = no PubChem CID (ChEMBL-only compounds)
  name: z.string().max(300).optional(),
  molecularFormula: z.string().max(100).optional(),
  molecularWeight: z.string().max(50).optional(),
  canonicalSMILES: z.string().min(1).max(2000),
  inchikey: z.string().max(50).optional(),
  xlogp: z.number().optional(),
  tpsa: z.number().optional(),
  source: z.string().max(50).optional(),
});

const AddItemsBody = z.object({
  items: z.array(AddItemBody).min(1).max(100),
});

// GET / — list collections with item counts
collections.get("/", (c) => {
  const rows = db
    .prepare(
      `SELECT col.*, (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = col.id) AS item_count
       FROM collections col
       ORDER BY col.updated_at DESC LIMIT 200`
    )
    .all() as (CollectionRow & { item_count: number })[];

  return c.json({
    count: rows.length,
    collections: rows.map((r) => ({
      id: r.id,
      label: r.label,
      description: r.description,
      chemistId: r.chemist_id,
      itemCount: r.item_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
});

// POST / — create a new collection
collections.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
  }
  const now = Date.now();
  const id = newId("coll");
  db.prepare(
    `INSERT INTO collections (id, label, description, chemist_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    parsed.data.label,
    parsed.data.description ?? null,
    parsed.data.chemistId ?? null,
    now,
    now
  );

  return c.json(
    {
      collection: {
        id,
        label: parsed.data.label,
        description: parsed.data.description ?? null,
        chemistId: parsed.data.chemistId ?? null,
        itemCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    },
    201
  );
});

// GET /:id — get one collection with all its items
collections.get("/:id", (c) => {
  const id = c.req.param("id");
  const coll = db
    .prepare(`SELECT * FROM collections WHERE id = ?`)
    .get(id) as CollectionRow | null;
  if (!coll) {
    return c.json({ error: "not_found", message: "Collection not found." }, 404);
  }
  const items = db
    .prepare(
      `SELECT * FROM collection_items WHERE collection_id = ? ORDER BY added_at DESC`
    )
    .all(id) as CollectionItemRow[];

  return c.json({
    collection: {
      id: coll.id,
      label: coll.label,
      description: coll.description,
      chemistId: coll.chemist_id,
      createdAt: coll.created_at,
      updatedAt: coll.updated_at,
    },
    items: items.map(itemRowToApi),
  });
});

// PATCH /:id — update label/description
collections.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const patch = z
    .object({
      label: z.string().min(1).max(120).optional(),
      description: z.string().max(2000).nullable().optional(),
    })
    .safeParse(body);
  if (!patch.success) {
    return c.json({ error: "validation_error", issues: patch.error.issues }, 400);
  }
  const now = Date.now();
  // Build dynamic update — only set provided fields.
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (patch.data.label !== undefined) {
    sets.push("label = ?");
    args.push(patch.data.label);
  }
  if (patch.data.description !== undefined) {
    sets.push("description = ?");
    args.push(patch.data.description ?? "");
  }
  sets.push("updated_at = ?");
  args.push(now);
  args.push(id);
  const result = db
    .prepare(`UPDATE collections SET ${sets.join(", ")} WHERE id = ?`)
    .run(...args);
  if (result.changes === 0) {
    return c.json({ error: "not_found", message: "Collection not found." }, 404);
  }
  return c.json({ ok: true, updatedAt: now });
});

// DELETE /:id — delete a collection (cascades to items)
collections.delete("/:id", (c) => {
  const id = c.req.param("id");
  const result = db.prepare(`DELETE FROM collections WHERE id = ?`).run(id);
  if (result.changes === 0) {
    return c.json({ error: "not_found", message: "Collection not found." }, 404);
  }
  return c.json({ ok: true });
});

// POST /:id/items — add a single compound
collections.post("/:id/items", async (c) => {
  const id = c.req.param("id");
  // Verify collection exists
  const exists = db.prepare(`SELECT id FROM collections WHERE id = ?`).get(id);
  if (!exists) {
    return c.json({ error: "not_found", message: "Collection not found." }, 404);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = AddItemBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
  }
  const item = parsed.data;
  const itemId = newId("item");
  const now = Date.now();
  try {
    db.prepare(
      `INSERT INTO collection_items
       (id, collection_id, cid, name, molecular_formula, molecular_weight,
        canonical_smiles, inchikey, xlogp, tpsa, source, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      itemId,
      id,
      item.cid,
      item.name ?? null,
      item.molecularFormula ?? null,
      item.molecularWeight ?? null,
      item.canonicalSMILES,
      item.inchikey ?? null,
      item.xlogp ?? null,
      item.tpsa ?? null,
      item.source ?? null,
      now
    );
  } catch (err) {
    // UNIQUE(collection_id, cid) — compound already in collection
    if (String(err).includes("UNIQUE")) {
      return c.json(
        { error: "already_exists", message: "Compound already in this collection." },
        409
      );
    }
    throw err;
  }
  // Bump collection updated_at
  db.prepare(`UPDATE collections SET updated_at = ? WHERE id = ?`).run(now, id);
  return c.json({ ok: true, itemId, addedAt: now }, 201);
});

// POST /:id/items/bulk — add multiple compounds at once
collections.post("/:id/items/bulk", async (c) => {
  const id = c.req.param("id");
  const exists = db.prepare(`SELECT id FROM collections WHERE id = ?`).get(id);
  if (!exists) {
    return c.json({ error: "not_found", message: "Collection not found." }, 404);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = AddItemsBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
  }
  const now = Date.now();
  const insert = db.prepare(
    `INSERT INTO collection_items
     (id, collection_id, cid, name, molecular_formula, molecular_weight,
      canonical_smiles, inchikey, xlogp, tpsa, source, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(collection_id, cid, canonical_smiles) DO NOTHING`
  );
  let added = 0;
  let skipped = 0;
  for (const item of parsed.data.items) {
    const result = insert.run(
      newId("item"),
      id,
      item.cid,
      item.name ?? null,
      item.molecularFormula ?? null,
      item.molecularWeight ?? null,
      item.canonicalSMILES,
      item.inchikey ?? null,
      item.xlogp ?? null,
      item.tpsa ?? null,
      item.source ?? null,
      now
    );
    if (result.changes > 0) added++;
    else skipped++;
  }
  db.prepare(`UPDATE collections SET updated_at = ? WHERE id = ?`).run(now, id);
  return c.json({ ok: true, added, skipped, addedAt: now });
});

// DELETE /:id/items/:cid — remove a single compound by CID
collections.delete("/:id/items/:cid", (c) => {
  const id = c.req.param("id");
  const cid = Number(c.req.param("cid"));
  if (!Number.isFinite(cid)) {
    return c.json({ error: "validation_error", message: "cid must be numeric" }, 400);
  }
  const result = db
    .prepare(`DELETE FROM collection_items WHERE collection_id = ? AND cid = ?`)
    .run(id, cid);
  if (result.changes === 0) {
    return c.json(
      { error: "not_found", message: "Item not found in this collection." },
      404
    );
  }
  const now = Date.now();
  db.prepare(`UPDATE collections SET updated_at = ? WHERE id = ?`).run(now, id);
  return c.json({ ok: true });
});

function itemRowToApi(r: CollectionItemRow) {
  return {
    id: r.id,
    collectionId: r.collection_id,
    cid: r.cid,
    name: r.name,
    molecularFormula: r.molecular_formula,
    molecularWeight: r.molecular_weight,
    canonicalSMILES: r.canonical_smiles,
    inchikey: r.inchikey,
    xlogp: r.xlogp,
    tpsa: r.tpsa,
    source: r.source,
    addedAt: r.added_at,
  };
}
