// ── Quick Add curated product lists ─────────────────────────────
// Controls which products appear in the QuickAdd popup (the round "+" Add
// circle next to the branch BottomNav) on each branch page. Names must match
// the product's "PRODUCT NAME" value in AllFileProducts exactly; items are
// shown in the order listed here.
//
// While a branch's array is left empty, the popup temporarily falls back to
// that branch's favourites (the same products the UsageTable picker offers)
// so the flow works before the final curated list is decided.
import type { BranchKey } from "./branchSimple";

export const QUICK_ADD_PRODUCTS: Record<BranchKey, string[]> = {
  boudoir: [],
  chic: [],
  nuryadi: [],
};