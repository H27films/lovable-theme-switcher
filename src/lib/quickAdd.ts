// ── Quick Add curated product lists ─────────────────────────────
// Controls which products appear in the QuickAdd popup (the round "+" Add
// circle next to the branch BottomNav) on each branch page. Names must match
// the product's "PRODUCT NAME" value exactly; items are shown in the order
// listed here.
//
// While a branch's array is left empty, the popup temporarily shows that
// branch's favourites from the live `Favourites` Supabase table (A→Z) until
// the final curated list is decided.
import type { BranchKey } from "./branchSimple";

export const QUICK_ADD_PRODUCTS: Record<BranchKey, string[]> = {
  boudoir: [],
  chic: [],
  nuryadi: [],
};

/** Favourites table column holding each branch's favourite flag (mirrors Favourites.tsx) */
export const FAVOURITES_TABLE_COLUMN: Record<BranchKey, string> = {
  boudoir: "BOUDOIR FAVOURITE",
  chic: "CHIC NAILSPA FAVOURITE",
  nuryadi: "NUR YADI FAVOURITE",
};