import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { BranchKey } from "@/lib/branchSimple";

/**
 * Row shape of the live `Favourites` Supabase table.
 * NOTE: the generated types.ts is stale — the live table also carries the
 * balance columns below (verified against the database), so reads/writes for
 * those go through the established `(supabase as any)` pattern.
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

const BRANCH_LABEL: Record<BranchKey, string> = {
  boudoir: "Boudoir",
  chic: "Chic Nailspa",
  nuryadi: "Nur Yadi",
};

interface FavouritesProps {
  open: boolean;
  onClose: () => void;
  branch: BranchKey;
}

const isTrue = (v: unknown) => String(v ?? "").trim().toUpperCase() === "TRUE";

export const Favourites = ({ open, onClose, branch }: FavouritesProps) => {
  const [rows, setRows] = useState<FavouriteProductRow[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const favCol = FAVOURITE_COLUMN[branch];
  const balCol = BALANCE_COLUMN[branch];

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
    const list = all as FavouriteProductRow[];
    setRows(list);
    // Pre-tick every product already saved as a favourite for this branch
    const initial = new Set<number>();
    list.forEach(r => { if (isTrue((r as any)[FAVOURITE_COLUMN[branch]])) initial.add(r.id); });
    setChecked(initial);
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
    // Favourites first, then alphabetical — mirrors Order's list ordering
    return [...matched].sort((a, b) => {
      const af = checked.has(a.id) ? 0 : 1;
      const bf = checked.has(b.id) ? 0 : 1;
      if (af !== bf) return af - bf;
      return String(a["PRODUCT NAME"] ?? "").localeCompare(String(b["PRODUCT NAME"] ?? ""));
    });
  })();

  /**
   * Submit: write the branch's favourite column for EVERY product in the list,
   * matched by PRODUCT NAME — checked rows become "TRUE", unchecked become ""
   * (never NULL). Two bulk updates keep it fast regardless of list size.
   */
  const handleSubmit = async () => {
    if (saving || loading) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const namesOf = (ids: Set<number>) =>
        Array.from(new Set(
          rows.filter(r => ids.has(r.id))
            .map(r => String(r["PRODUCT NAME"] ?? "").trim())
            .filter(Boolean)
        ));
      const checkedNames = namesOf(checked);
      const uncheckedIds = new Set(rows.filter(r => !checked.has(r.id)).map(r => r.id));
      const uncheckedNames = namesOf(uncheckedIds);

      if (checkedNames.length > 0) {
        const { error } = await (supabase as any)
          .from("Favourites")
          .update({ [favCol]: "TRUE" })
          .in("PRODUCT NAME", checkedNames);
        if (error) throw error;
      }
      if (uncheckedNames.length > 0) {
        const { error } = await (supabase as any)
          .from("Favourites")
          .update({ [favCol]: "" })
          .in("PRODUCT NAME", uncheckedNames);
        if (error) throw error;
      }

      // Sync local state so re-opening reflects the saved selection
      setRows(prev => prev.map(r => ({ ...r, [favCol]: checked.has(r.id) ? "TRUE" : "" })));
      setSuccessMsg(`Favourites saved for ${BRANCH_LABEL[branch]}`);
      setTimeout(() => setSuccessMsg(null), 3000);
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
      position: "fixed", inset: 0, zIndex: 2000,
      height: "100dvh", overflow: "hidden",
      background: "hsl(var(--background))", color: "hsl(var(--foreground))",
      fontFamily: "Raleway, inherit",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar — same treatment as the ORDER header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", borderBottom: "0.5px solid hsl(var(--border))", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: "hsl(var(--foreground))" }}>
            FAVOURITES
          </div>
          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>
            {BRANCH_LABEL[branch]} · {loading ? "loading…" : `${checked.size} of ${rows.length} selected`}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }}
        >
          <X size={20} strokeWidth={1.5} />
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
            const balance = (r as any)[balCol] as number | null | undefined;
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

                {/* Product name */}
                <div style={{
                  flex: 1, marginRight: "8px",
                  fontSize: "13px", fontWeight: isChecked ? 500 : 300,
                  fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", lineHeight: 1.3,
                }}>
                  {r["PRODUCT NAME"]}
                </div>

                {/* Branch balance — Order.tsx-style colouring */}
                <div style={{
                  fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit",
                  color: balanceColour(balance), flexShrink: 0,
                }}>
                  {balance ?? "—"}
                </div>
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