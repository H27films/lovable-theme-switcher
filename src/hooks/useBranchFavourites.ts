import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BranchKey } from "@/lib/branchSimple";

export interface FavouriteRow {
  id: number;
  "PRODUCT NAME": string;
  "SOURCE ID": number | null;
  "COLOUR": string | null;
  "BOUDOIR FAVOURITE": string | null;
  "CHIC NAILSPA FAVOURITE": string | null;
  "NUR YADI FAVOURITE": string | null;
}

/** Favourites table column per branch (verified against the live schema). */
export const FAVOURITE_COLUMN: Record<BranchKey, string> = {
  boudoir: "BOUDOIR FAVOURITE",
  chic: "CHIC NAILSPA FAVOURITE",
  nuryadi: "NUR YADI FAVOURITE",
};

/**
 * Reads the Favourites table (the dropdown's source of truth) and exposes
 * favourite/colour lookups keyed by SOURCE ID (= AllFileProducts.id).
 */
export const useBranchFavourites = (branch: BranchKey) => {
  const [rows, setRows] = useState<FavouriteRow[]>([]);
  const column = FAVOURITE_COLUMN[branch];

  const refresh = useCallback(async () => {
    let all: any[] = [];
    let from = 0;
    const batch = 1000;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("Favourites")
        .select("*")
        .range(from, from + batch - 1);
      if (error || !data?.length) break;
      all = all.concat(data);
      if (data.length < batch) break;
      from += batch;
    }
    setRows(all as FavouriteRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const bySourceId = useMemo(() => {
    const m = new Map<number, FavouriteRow>();
    rows.forEach(r => { if (r["SOURCE ID"] != null) m.set(Number(r["SOURCE ID"]), r); });
    return m;
  }, [rows]);

  /** Ids (AllFileProducts.id) present in Favourites — the dropdown universe. */
  const allowedIds = useMemo(() => new Set(bySourceId.keys()), [bySourceId]);

  const isFav = useCallback((p: any) => {
    const row = bySourceId.get(Number(p?.id));
    return String((row as any)?.[column] ?? "").trim().toUpperCase() === "TRUE";
  }, [bySourceId, column]);

  const isColour = useCallback((p: any) => {
    const row = bySourceId.get(Number(p?.id));
    return String(row?.["COLOUR"] ?? "").trim().toUpperCase() === "YES";
  }, [bySourceId]);

  /** Label shown in the dropdown: the Favourites table's PRODUCT NAME. */
  const nameOf = useCallback((p: any) => {
    const row = bySourceId.get(Number(p?.id));
    return row?.["PRODUCT NAME"] ?? p?.["PRODUCT NAME"];
  }, [bySourceId]);

  /** Marks/unmarks the Favourites row matched via SOURCE ID. */
  const toggleFavourite = useCallback(async (p: any) => {
    const sourceId = Number(p?.id);
    const row = bySourceId.get(sourceId);
    if (!row) return;
    const newVal = isFav(p) ? null : "TRUE";
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, [column]: newVal } as FavouriteRow : r));
    const { error } = await (supabase as any)
      .from("Favourites")
      .update({ [column]: newVal })
      .eq("SOURCE ID", sourceId);
    if (error) {
      console.error("Favourite update failed:", error);
      await refresh();
    }
  }, [bySourceId, column, isFav, refresh]);

  return { favouriteRows: rows, bySourceId, allowedIds, isFav, isColour, nameOf, toggleFavourite, refreshFavourites: refresh };
};
