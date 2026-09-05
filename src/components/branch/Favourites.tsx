import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, MoveLeft, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { BranchKey } from "@/lib/branchSimple";

/**
 * Row shape of the live `Favourites` Supabase table.
 * NOTE: the generated types.ts is stale — the live table also carries the
 * balance / low-balance columns below (verified against the database), so
 * reads/writes for those go through the established `(supabase as any)` pattern.
 * The BALANCE columns are a legacy snapshot nothing updates — the BAL column
 * displays live AllFileProducts stock instead (see fetchRows), with these
 * snapshot values only as a fallback when a row has no matching product.
 */
export interface FavouriteProductRow {
  id: number;
  "PRODUCT NAME": string | null;
  "SOURCE ID": number | null;
  COLOUR?: string | null;
  DUPLICATE?: string | null;
  "BOUDOIR FAVOURITE": string | null;
  "CHIC NAILSPA FAVOURITE": string | null;
  "NUR YADI FAVOURITE": string | null;
  "BOUDOIR BALANCE"?: number | null;
  "CHIC NAILSPA BALANCE"?: number | null;
  "NUR YADI BALANCE"?: number | null;
  "BOUDOIR LOW BALANCE"?: number | null;
  "CHIC NAILSPA LOW BALANCE"?: number | null;
  "NUR YADI LOW BALANCE"?: number | null;
}

/** Favourites table column holding each branch's favourite flag */
const FAVOURITE_COLUMN: Record<BranchKey, string> = {
  boudoir: "BOUDOIR FAVOURITE",
  chic: "CHIC NAILSPA FAVOURITE",
  nuryadi: "NUR YADI FAVOURITE",
};

/** Favourites table column holding each branch's stock balance */
const BALANCE_COLUMN: Record<BranchKey, string> = {
  boudoir: "BOUDOIR BALANCE",
  chic: "CHIC NAILSPA BALANCE",
  nuryadi: "NUR YADI BALANCE",
};

/** Favourites table column holding each branch's low-balance threshold */
const LOW_BALANCE_COLUMN: Record<BranchKey, string> = {
  boudoir: "BOUDOIR LOW BALANCE",
  chic: "CHIC NAILSPA LOW BALANCE",
  nuryadi: "NUR YADI LOW BALANCE",
};

const BRANCH_LABEL: Record<BranchKey, string> = {
  boudoir: "Boudoir",
  chic: "Chic Nailspa",
  nuryadi: "Nur Yadi",
};

interface FavouritesProps {
  open: boolean;
  onClose: () => void;
  branch: BranchKey;
  /** Called after a successful submit + brief ✓ confirmation — closes the panel and lets the branch page reset to its default view */
  onSubmitted?: () => void;
}

const isTrue = (v: unknown) => String(v ?? "").trim().toUpperCase() === "TRUE";

export const Favourites = ({ open, onClose, branch, onSubmitted }: FavouritesProps) => {
  const [rows, setRows] = useState<FavouriteProductRow[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /** Editable low-balance inputs (text as typed), keyed by Favourites row id */
  const [lowBalValues, setLowBalValues] = useState<Record<number, string>>({});
  /** Low-balance values as of last load/save — SUBMIT writes only what changed */
  const lowBalBaselineRef = useRef<Record<number, number | null>>({});
  /**
   * Live branch stock from AllFileProducts, keyed by product id (= Favourites.SOURCE ID).
   * The Favourites table's own BALANCE columns are a stale snapshot nothing updates,
   * so the BAL column displays the live value instead — the same source the Search
   * page (and every other balance display in the app) reads from.
   */
  const [liveBalances, setLiveBalances] = useState<Map<number, number | null>>(new Map());

  /** Selection as of last load/save — lets Submit write only what actually changed */
  const baselineRef = useRef<Set<number>>(new Set());

  const favCol = FAVOURITE_COLUMN[branch];
  const balCol = BALANCE_COLUMN[branch];
  const lowCol = LOW_BALANCE_COLUMN[branch];

  // Load ALL rows from the Favourites table (paginated, same pattern as the rest of the app)
  const fetchRows = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
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
    // Live branch stock for the BAL column — read from AllFileProducts (the same
    // source the Search page's product dropdown uses) and matched to each Favourites
    // row via SOURCE ID (= AllFileProducts.id). The Favourites table's own BALANCE
    // columns are a stale snapshot nothing updates, so they are not used for display.
    const balances = new Map<number, number | null>();
    let pfrom = 0;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("AllFileProducts")
        .select(`id, "${balCol}"`)
        .range(pfrom, pfrom + batch - 1);
      if (error || !data?.length) break;
      data.forEach((p: any) => balances.set(Number(p.id), (p[balCol] ?? null) as number | null));
      if (data.length < batch) break;
      pfrom += batch;
    }
    setLiveBalances(balances);
    const list = all as FavouriteProductRow[];
    setRows(list);
    // Pre-tick every product already saved as a favourite for this branch
    const initial = new Set<number>();
    list.forEach(r => { if (isTrue((r as any)[FAVOURITE_COLUMN[branch]])) initial.add(r.id); });
    setChecked(initial);
    baselineRef.current = new Set(initial);
    // Seed the editable low-balance inputs + baseline (values as of load/save)
    const initLow: Record<number, string> = {};
    const initLowBase: Record<number, number | null> = {};
    list.forEach(r => {
      const v = ((r as any)[LOW_BALANCE_COLUMN[branch]] ?? null) as number | null;
      initLow[r.id] = String(v ?? "");
      initLowBase[r.id] = v;
    });
    setLowBalValues(initLow);
    lowBalBaselineRef.current = initLowBase;
    setLoading(false);
  }, [branch]);

  useEffect(() => {
    if (open) fetchRows();
  }, [open, fetchRows]);

  const toggleRow = useCallback((id: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Filtered view — search matches PRODUCT NAME (same feel as Order's "Add product")
  const visibleRows = (() => {
    const q = search.trim().toLowerCase();
    const matched = q
      ? rows.filter(r => String(r["PRODUCT NAME"] ?? "").toLowerCase().includes(q))
      : rows;
    // Favourites first (A–Z), then non-favourites: COLOUR = NO before COLOUR = YES,
    // A–Z by product name within each group (anything not "YES" counts as NO)
    const isColourRow = (r: FavouriteProductRow) => String(r["COLOUR"] ?? "").trim().toUpperCase() === "YES";
    return [...matched].sort((a, b) => {
      const af = checked.has(a.id) ? 0 : 1;
      const bf = checked.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      const ac = isColourRow(a) ? 1 : 0;
      const bc = isColourRow(b) ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return String(a["PRODUCT NAME"] ?? "").localeCompare(String(b["PRODUCT NAME"] ?? ""));
    });
  })();

  /**
   * Submit: write the branch's favourite column matched by PRODUCT NAME —
   * checked rows become "TRUE", unchecked become "" (never NULL) — and the
   * branch's LOW BALANCE column for every row whose value was edited.
   *
   * Only rows whose tick/value changed since load/save are written, and each
   * write is chunked into small .in() batches — with ~1,500 products a single
   * all-names request produces an oversized PostgREST URL that fails silently.
   */
  const handleSubmit = async () => {
    if (saving || loading) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Raw names exactly as stored (no transformation) so filters match
      const nameById = new Map<number, string>();
      rows.forEach(r => {
        const n = String(r["PRODUCT NAME"] ?? "");
        if (n.trim()) nameById.set(r.id, n);
      });

      const addedNames = Array.from(checked)
        .filter(id => !baselineRef.current.has(id))
        .map(id => nameById.get(id))
        .filter((n): n is string => !!n);
      const removedNames = Array.from(baselineRef.current)
        .filter(id => !checked.has(id))
        .map(id => nameById.get(id))
        .filter((n): n is string => !!n);

      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };
      const BATCH = 80; // keeps each PostgREST URL well within limits

      // Low-balance thresholds: only rows whose value changed since load/save,
      // grouped by value so each distinct value is one .in("id", …) batch.
      const lowGroups = new Map<string, number[]>();
      rows.forEach(r => {
        const text = (lowBalValues[r.id] ?? "").trim();
        const parsed = text === "" ? NaN : Number(text);
        const nextVal = text === "" || isNaN(parsed) ? null : parsed;
        if (nextVal === (lowBalBaselineRef.current[r.id] ?? null)) return;
        const key = nextVal === null ? "null" : String(nextVal);
        const ids = lowGroups.get(key) ?? [];
        ids.push(r.id);
        lowGroups.set(key, ids);
      });
      const lowChanges = Array.from(lowGroups.values()).reduce((sum, ids) => sum + ids.length, 0);

      const totalChanges = addedNames.length + removedNames.length + lowChanges;

      for (const batch of chunk(Array.from(new Set(addedNames)), BATCH)) {
        const { error } = await (supabase as any)
          .from("Favourites")
          .update({ [favCol]: "TRUE" })
          .in("PRODUCT NAME", batch);
        if (error) throw error;
      }
      for (const batch of chunk(Array.from(new Set(removedNames)), BATCH)) {
        const { error } = await (supabase as any)
          .from("Favourites")
          .update({ [favCol]: "" })
          .in("PRODUCT NAME", batch);
        if (error) throw error;
      }
      for (const [key, ids] of lowGroups) {
        const val = key === "null" ? null : Number(key);
        for (const batch of chunk(ids, BATCH)) {
          const { error } = await (supabase as any)
            .from("Favourites")
            .update({ [lowCol]: val })
            .in("id", batch);
          if (error) throw error;
        }
      }

      // Sync local state + baselines so re-saving only sends new changes
      baselineRef.current = new Set(checked);
      const nextLowBase: Record<number, number | null> = { ...lowBalBaselineRef.current };
      rows.forEach(r => {
        const text = (lowBalValues[r.id] ?? "").trim();
        const parsed = text === "" ? NaN : Number(text);
        nextLowBase[r.id] = text === "" || isNaN(parsed) ? null : parsed;
      });
      lowBalBaselineRef.current = nextLowBase;
      setRows(prev => prev.map(r => {
        const text = (lowBalValues[r.id] ?? "").trim();
        const parsed = text === "" ? NaN : Number(text);
        return {
          ...r,
          [favCol]: checked.has(r.id) ? "TRUE" : "",
          [lowCol]: text === "" || isNaN(parsed) ? null : parsed,
        } as FavouriteProductRow;
      }));
      setSuccessMsg(totalChanges === 0 ? "No changes to save" : `Saved · ${totalChanges} ${totalChanges === 1 ? "change" : "changes"}`);
      // Keep the ✓ confirmation visible briefly, then close the panel and let the
      // branch page reset to its default view (onSubmitted is wired by BranchHeader).
      setTimeout(() => {
        setSuccessMsg(null);
        (onSubmitted ?? onClose)();
      }, 1200);
    } catch (e: any) {
      console.error("Favourites save failed:", e);
      setErrorMsg(e?.message || "Could not save favourites.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // Balance colouring adapted from Order.tsx's getBalanceColor (no PAR column
  // on Favourites): zero/negative stock reads as low → red, positive → green.
  const balanceColour = (bal: number | null | undefined) => {
    if (bal === null || bal === undefined) return "hsl(var(--muted-foreground))";
    return Number(bal) <= 0 ? "hsl(0 84% 60%)" : "hsl(142 71% 45%)";
  };

    return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 100000,
      height: "100dvh", overflow: "hidden",
      background: "hsl(var(--background))", color: "hsl(var(--foreground))",
      fontFamily: "Raleway, inherit",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar — title block left, long back arrow right (mirrors ORDER header) */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", flexShrink: 0,
      }}>
        {/* Title is clickable too — closes the panel back to the branch's default view
            (same pattern as the clickable LOW BALANCE title on the Order panel) */}
        <div onClick={onClose} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))", lineHeight: 1.1 }}>
            FAVOURITES
            <span style={{ fontSize: "0.65em", fontWeight: 300, letterSpacing: "0.06em" }}>
              {loading ? "" : ` (${checked.size})`}
            </span>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", letterSpacing: "0.1em", color: "hsl(var(--muted-foreground))", marginTop: "3px" }}>
            {BRANCH_LABEL[branch].toUpperCase()}
          </div>
        </div>
                <button
          onClick={onClose}
          aria-label="Back"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center", marginRight: "-8px" }}
        >
          <MoveLeft size={28} strokeWidth={1.2} />
        </button>
      </div>

      {/* Add product search — mirrors Order.tsx */}
      <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "0.5px solid hsl(var(--border))", paddingBottom: "8px" }}>
          <Search size={14} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Add product"
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "hsl(var(--muted-foreground))" }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Product list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Column headers — BAL is read-only stock; LOW BAL is the editable threshold */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "16px 16px 8px", borderBottom: "0.5px solid hsl(var(--border))", flexShrink: 0,
        }}>
          <div style={{ width: "16px", flexShrink: 0 }} />
          <div style={{ flex: 1, marginRight: "8px" }} />
          <div style={{ width: "36px", flexShrink: 0, textAlign: "right", fontSize: "9px", fontWeight: 700, fontFamily: "Raleway, inherit", letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>BAL</div>
          <div style={{ width: "48px", flexShrink: 0, textAlign: "center", fontSize: "9px", fontWeight: 700, fontFamily: "Raleway, inherit", letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>LOW BAL</div>
        </div>
        {loading ? (
          <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", padding: "24px 16px" }}>
            Loading favourites…
          </div>
        ) : visibleRows.length === 0 ? (
          <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", padding: "24px 16px" }}>
            {search ? "No products match your search" : "No products yet"}
          </div>
        ) : (
          visibleRows.map((r, i) => {
            const isChecked = checked.has(r.id);
            // BAL = live AllFileProducts stock (Search-page source) matched via SOURCE ID;
            // falls back to the row's own snapshot column only when no product matches.
            const sourceId = r["SOURCE ID"] != null ? Number(r["SOURCE ID"]) : null;
            const liveBalance = sourceId != null ? liveBalances.get(sourceId) : undefined;
            const balance = (liveBalance !== undefined ? liveBalance : (r as any)[balCol]) as number | null | undefined;
            return (
              <div
                key={r.id}
                onClick={() => toggleRow(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "11px 16px",
                  borderBottom: i < visibleRows.length - 1 ? "0.5px solid hsl(var(--border))" : "none",
                  cursor: "pointer",
                  background: isChecked ? "hsl(var(--card))" : "transparent",
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: "16px", height: "16px", flexShrink: 0,
                  border: `1.5px solid ${isChecked ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                  borderRadius: "3px",
                  background: isChecked ? "hsl(var(--foreground))" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {isChecked && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                                {/* Product name + small star for checked items (no bold weight) */}
                <div style={{
                  flex: 1, marginRight: "8px",
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  {isChecked && (
                    <Star size={11} fill="currentColor" style={{ color: "hsl(var(--foreground))", flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                    {r["PRODUCT NAME"]}
                  </span>
                </div>

                {/* Branch balance — Order.tsx-style colouring */}
                <div style={{
                  width: "36px", flexShrink: 0, textAlign: "right",
                  fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit",
                  color: balanceColour(balance),
                }}>
                  {balance ?? "—"}
                </div>

                {/* Low balance — editable threshold; written to the branch's LOW BALANCE column when SUBMIT is pressed */}
                <input
                  type="number"
                  inputMode="decimal"
                  value={lowBalValues[r.id] ?? ""}
                  placeholder="0"
                  onClick={e => e.stopPropagation()}
                  onChange={e => setLowBalValues(prev => ({ ...prev, [r.id]: e.target.value }))}
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                    if (e.key === "Escape") {
                      setLowBalValues(prev => ({ ...prev, [r.id]: String(lowBalBaselineRef.current[r.id] ?? "") }));
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  style={{
                    width: "48px", flexShrink: 0, textAlign: "center", boxSizing: "border-box",
                    fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit",
                    color: "hsl(var(--foreground))", caretColor: "hsl(var(--foreground))",
                    background: "hsl(var(--muted))",
                    border: "0.5px solid hsl(var(--border))",
                    borderRadius: "6px", outline: "none", padding: "3px 2px",
                  }}
                />
              </div>
            );
          })
        )}
        <div style={{ paddingBottom: "16px" }} />
      </div>

      {/* Sticky footer — black Submit */}
      <div style={{ padding: "12px 16px", borderTop: "0.5px solid hsl(var(--border))", flexShrink: 0 }}>
        {(successMsg || errorMsg) && (
          <div style={{
            fontSize: "11px", fontFamily: "Raleway, inherit", letterSpacing: "0.04em",
            color: errorMsg ? "hsl(0 70% 50%)" : "hsl(142 71% 45%)",
            marginBottom: "8px", textAlign: "center",
          }}>
            {errorMsg ? `✗ ${errorMsg}` : `✓ ${successMsg}`}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={saving || loading}
          style={{
            width: "100%",
            background: "hsl(var(--foreground))", color: "hsl(var(--background))",
            border: "none", borderRadius: "999px", padding: "12px",
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "Raleway, inherit",
            cursor: saving || loading ? "default" : "pointer",
            opacity: saving || loading ? 0.6 : 1,
          }}
        >
          {saving ? "SAVING…" : `SUBMIT (${checked.size})`}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default Favourites;