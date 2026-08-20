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

export const isYes = (v: any): boolean =>
  v === true ||
  v === 1 ||
  (typeof v === "string" &&
    (v.toUpperCase() === "YES" || v.toUpperCase() === "TRUE"));

export const makeIsFavourite =
  (favouriteKey: string) =>
  (p: any): boolean =>
    isYes(p[favouriteKey]);
