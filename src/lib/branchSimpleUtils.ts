export const USAGE_TYPES = ["Salon Use", "Staff", "Customer", "FOC", "Transfer"] as const;

// Alphabetical order for cycling through the therapist pill
export const THERAPISTS = ["AILING", "ANNIE", "HAMZA", "SZI WAH"] as const;

export type UsageType = (typeof USAGE_TYPES)[number];

// "AILING" -> "Ailing", "CUSTOMER SALE" -> "Customer Sale"
export const toTitleCase = (s: string): string =>
  s.toLowerCase().split(" ").map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");

// Value saved to the AllFileLog "USAGE PILL" column (what the pill says, capitalised)
export const usagePillValue = (type: string): string => toTitleCase(type);

// Value saved to the AllFileLog "TYPE" column (only Salon Use / Customer / Staff / Transfer / Order allowed)
export const typeColumnValue = (type: string): string =>
  type === "Customer" ? "Customer"
  : type === "Staff" ? "Staff"
  : type === "Transfer" ? "Transfer"
  : "Salon Use";

// Value saved to the AllFileLog "THERAPIST" column; blank when the placeholder is still selected
export const therapistValue = (therapist: string): string | null =>
  therapist === "THERAPIST" ? null : toTitleCase(therapist);

// ── Therapist pill colours ─────────────────────────────────────
// Muted, distinct shades keyed by therapist name so each person is
// instantly recognisable in the log tables / pills. Medium tones work
// on the light (cream), dark and sand themes alike.
const THERAPIST_PILL_PALETTE: { backgroundColor: string; color: string }[] = [
  { backgroundColor: "hsl(202 29% 76%)", color: "hsl(202 40% 22%)" }, // Cloudy Valley
  { backgroundColor: "hsl(208 20% 60%)", color: "hsl(208 35% 18%)" }, // Tsunami
  { backgroundColor: "hsl(37 15% 56%)",  color: "hsl(37 30% 15%)" },  // Weather Board
  { backgroundColor: "hsl(28 16% 33%)",  color: "hsl(28 45% 95%)" },  // Volcanic Island
  { backgroundColor: "hsl(354 54% 24%)", color: "hsl(354 60% 95%)" }, // Red Oxide
];

/**
 * Deterministic pill colours for a therapist name. When the full therapist
 * set is supplied, each distinct name is assigned its own palette slot
 * (alphabetical within that set), so no two therapists ever share a colour.
 * When the set is unknown, the known names in THERAPISTS keep a stable
 * colour and any other name is hashed onto the palette, so its shade stays
 * consistent wherever it appears. The returned object uses real CSS style
 * keys, so it can be spread directly into a React `style` prop.
 */
export const therapistPillStyle = (
  name: string | null | undefined,
  allTherapists?: readonly (string | null | undefined)[]
): { backgroundColor: string; color: string } => {
  const n = (name ?? "").trim().toUpperCase();
  if (!n) return { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))" };

  // When we know the full therapist set, map every distinct name onto its own
  // (unique) palette index based on alphabetical order within that set.
  if (allTherapists && allTherapists.length > 0) {
    const known = allTherapists
      .map(x => String(x ?? "").trim().toUpperCase())
      .filter(v => v.length > 0)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));
    const idx = known.indexOf(n);
    if (idx >= 0) return THERAPIST_PILL_PALETTE[idx % THERAPIST_PILL_PALETTE.length];
  }

  // Fallback when the set is unknown: known names keep a fixed slot; any other
  // name is hashed onto the palette so its shade stays consistent everywhere.
  let idx = THERAPISTS.indexOf(n as (typeof THERAPISTS)[number]);
  if (idx < 0) {
    let hash = 0;
    for (let i = 0; i < n.length; i++) hash = (hash * 31 + n.charCodeAt(i)) >>> 0;
    idx = hash % THERAPIST_PILL_PALETTE.length;
  }
  return THERAPIST_PILL_PALETTE[idx];
};

export const isYes = (v: any): boolean =>
  v === true ||
  v === 1 ||
  (typeof v === "string" &&
    (v.toUpperCase() === "YES" || v.toUpperCase() === "TRUE"));

export const makeIsFavourite =
  (favouriteKey: string) =>
  (p: any): boolean =>
    isYes(p[favouriteKey]);

