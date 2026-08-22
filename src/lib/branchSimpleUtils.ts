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
  { backgroundColor: "hsl(24 38% 42%)",  color: "hsl(42 65% 95%)" },  // terracotta
  { backgroundColor: "hsl(210 30% 44%)", color: "hsl(212 80% 96%)" }, // slate blue
  { backgroundColor: "hsl(155 28% 38%)", color: "hsl(150 60% 95%)" }, // sage green
  { backgroundColor: "hsl(275 30% 46%)", color: "hsl(275 70% 96%)" }, // dusty violet
];

/**
 * Deterministic pill colours for a therapist name. The known names in
 * THERAPISTS each get their own stable colour; any other name is hashed
 * onto the palette so its shade stays consistent wherever it appears.
 * The returned object uses real CSS style keys, so it can be spread
 * directly into a React `style` prop.
 */
export const therapistPillStyle = (name: string | null | undefined): { backgroundColor: string; color: string } => {
  const n = (name ?? "").trim().toUpperCase();
  if (!n) return { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))" };

  let idx = (THERAPISTS as readonly string[]).indexOf(n);
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

