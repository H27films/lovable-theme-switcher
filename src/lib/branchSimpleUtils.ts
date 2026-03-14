export const USAGE_TYPES = ["Salon Use", "Customer", "Staff"] as const;

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

