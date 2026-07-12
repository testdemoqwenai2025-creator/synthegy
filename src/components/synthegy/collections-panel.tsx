"use client";

import * as React from "react";
import {
  FolderPlus,
  Folder,
  Loader2,
  Trash2,
  Download,
  FileText,
  Database,
  Plus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  api,
  type Collection,
  type CollectionItem,
  type CollectionItemInput,
} from "@/lib/synthegy/api";
import { exportUrl } from "@/lib/synthegy/molecule-api";
import { moleculeImageUrl } from "@/lib/synthegy/molecule-api";
import { cn } from "@/lib/utils";

interface CollectionsPanelProps {
  // When provided, shows a "Save current results" button that bulk-adds
  // these compounds to a chosen collection.
  currentResults?: CollectionItemInput[];
  refreshKey?: number;
}

export function CollectionsPanel({ currentResults, refreshKey }: CollectionsPanelProps) {
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<Record<string, CollectionItem[]>>({});
  const [showCreate, setShowCreate] = React.useState(false);
  const [newLabel, setNewLabel] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saveTarget, setSaveTarget] = React.useState<string>(""); // collection id for "save current results"
  const [saveStatus, setSaveStatus] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listCollections();
      setCollections(res.collections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, refreshKey]);

  const createCollection = async () => {
    if (!newLabel.trim()) return;
    try {
      const res = await api.createCollection(newLabel, newDesc || undefined);
      setCollections((prev) => [res.collection, ...prev]);
      setNewLabel("");
      setNewDesc("");
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  };

  const deleteCollection = async (id: string) => {
    if (!confirm("Delete this collection and all its compounds?")) return;
    try {
      await api.deleteCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!items[id]) {
      try {
        const res = await api.getCollection(id);
        setItems((prev) => ({ ...prev, [id]: res.items }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load items failed");
      }
    }
  };

  const removeItem = async (collectionId: string, cid: number) => {
    try {
      await api.removeCollectionItem(collectionId, cid);
      setItems((prev) => ({
        ...prev,
        [collectionId]: (prev[collectionId] ?? []).filter((i) => i.cid !== cid),
      }));
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, itemCount: c.itemCount - 1 } : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  };

  const saveCurrentResults = async () => {
    if (!saveTarget || !currentResults || currentResults.length === 0) return;
    setSaveStatus("Saving...");
    try {
      const res = await api.addCollectionItemsBulk(saveTarget, currentResults);
      setSaveStatus(`Added ${res.added}, skipped ${res.skipped} duplicates`);
      // Refresh items for this collection
      const detail = await api.getCollection(saveTarget);
      setItems((prev) => ({ ...prev, [saveTarget]: detail.items }));
      setCollections((prev) =>
        prev.map((c) =>
          c.id === saveTarget ? { ...c, itemCount: detail.items.length } : c
        )
      );
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus(null);
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30">
              <Folder className="h-4.5 w-4.5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Compound collections
              </div>
              <div className="text-[11px] text-muted-foreground">
                Save compound sets to named collections · export as SDF or CSV ·
                persisted in the Synthegy backend
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
            <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
            New collection
          </Button>
        </div>

        {/* Save current results bar */}
        {currentResults && currentResults.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2">
            <Plus className="h-3.5 w-3.5 text-accent" />
            <span className="text-[12px] text-foreground">
              <strong>{currentResults.length}</strong> compounds in current search
            </span>
            <select
              value={saveTarget}
              onChange={(e) => setSaveTarget(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-[12px] text-foreground outline-none focus:border-accent"
            >
              <option value="">Choose collection...</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.itemCount})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={saveCurrentResults}
              disabled={!saveTarget}
              className="h-7 gap-1 text-[11px]"
            >
              Save all
            </Button>
            {saveStatus && (
              <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                <Check className="h-3 w-3" />
                {saveStatus}
              </span>
            )}
          </div>
        )}

        {/* Create new collection form */}
        {showCreate && (
          <div className="mt-4 space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Collection name (e.g. 'COX-2 hits', 'Fragment screen positives')"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={createCollection} disabled={!newLabel.trim()}>
                Create
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Collections list */}
        <div className="mt-4 space-y-2">
          {loading && collections.length === 0 && (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && collections.length === 0 && (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center text-[12px] text-muted-foreground">
              No collections yet. Create one above to start saving compounds.
            </div>
          )}

          {collections.map((coll) => {
            const expanded = expandedId === coll.id;
            const collItems = items[coll.id] ?? [];
            const cids = collItems.map((i) => i.cid);
            return (
              <div
                key={coll.id}
                className="overflow-hidden rounded-md border border-border/60 bg-background"
              >
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    onClick={() => toggleExpand(coll.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <Folder className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                      {coll.label}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {coll.itemCount} compounds
                    </Badge>
                  </button>
                  {collItems.length > 0 && (
                    <div className="flex items-center gap-1">
                      <a
                        href={exportUrl("sdf", cids)}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        title="Download as SDF (structure + properties)"
                      >
                        <Download className="h-3 w-3" />
                        SDF
                      </a>
                      <a
                        href={exportUrl("csv", cids)}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        title="Download as CSV (properties only)"
                      >
                        <FileText className="h-3 w-3" />
                        CSV
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => deleteCollection(coll.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Delete collection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-border/60 bg-muted/10">
                    {coll.description && (
                      <div className="px-3 py-2 text-[12px] italic text-muted-foreground">
                        {coll.description}
                      </div>
                    )}
                    {collItems.length === 0 ? (
                      <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                        No compounds in this collection yet. Use the search tools
                        above and click &ldquo;Save all&rdquo; to populate.
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto scrollbar-slim">
                        {collItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 border-b border-border/40 px-3 py-2 last:border-0"
                          >
                            <img
                              src={moleculeImageUrl(String(item.cid), "cid", "60x60")}
                              alt={item.name ?? `CID ${item.cid}`}
                              className="h-10 w-10 shrink-0 rounded bg-white"
                              loading="lazy"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-medium text-foreground">
                                {item.name ?? `CID ${item.cid}`}
                              </div>
                              <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                                <span className="font-mono">CID {item.cid}</span>
                                {item.molecularFormula && <span>{item.molecularFormula}</span>}
                                {item.molecularWeight && <span>MW {item.molecularWeight}</span>}
                                {item.xlogp !== null && <span>XLogP {item.xlogp}</span>}
                                {item.tpsa !== null && <span>TPSA {item.tpsa}</span>}
                                {item.source && (
                                  <span className="text-primary">· {item.source}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeItem(coll.id, item.cid)}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                              aria-label="Remove from collection"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>
            Collections are stored in the backend&apos;s SQLite database. SDF exports
            include the full connection table (atoms + bonds) from PubChem —
            loadable in RDKit, OpenBabel, or ChemDraw.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
