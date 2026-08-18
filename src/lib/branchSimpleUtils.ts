export const USAGE_TYPES = ["Customer Sale", "Staff Sale", "Salon Use", "FOC"] as const;

export const THERAPISTS = ["AILING", "SZI WAH", "ANNIE", "HAMZA"] as const;

export type UsageType = (typeof USAGE_TYPES)[number];

export const isYes = (v: any): boolean =>
  v === true ||
  v === 1 ||
  (typeof v === "string" &&
    (v.toUpperCase() === "YES" || v.toUpperCase() === "TRUE"));

export const makeIsFavourite =
  (favouriteKey: string) =>
  (p: any): boolean =>
    isYes(p[favouriteKey]);

