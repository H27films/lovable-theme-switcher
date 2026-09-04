import { describe, it, expect, vi } from "vitest";

// The panel module imports the Supabase client at module level — stub it out so
// this unit test stays hermetic (getLowBalanceProducts itself is a pure function).
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { getLowBalanceProducts } from "@/components/branch/LowBalancePanel";
import { boudoirConfig, chicConfig, nuryadiConfig, type OfficeProduct } from "@/lib/branchSimple";

/** Product factory — only the columns the rule reads are populated. */
const product = (overrides: Partial<OfficeProduct> & { id: number; "PRODUCT NAME": string }): OfficeProduct => ({
  "SUPPLIER": null,
  "SUPPLIER PRICE": null,
  "BRANCH PRICE": null,
  "STAFF PRICE": null,
  "CUSTOMER PRICE": null,
  "OFFICE BALANCE": null,
  "OFFICE SECTION": null,
  "UNITS/ORDER": null,
  "BOUDOIR BALANCE": null,
  "CHIC NAILSPA BALANCE": null,
  "NUR YADI BALANCE": null,
  "Colour": null,
  "BOUDOIR FAVOURITE": null,
  "CHIC NAILSPA FAVOURITE": null,
  "NUR YADI FAVOURITE": null,
  ...overrides,
});

describe("getLowBalanceProducts", () => {
  it("includes favourites even when their balance is above the low-balance threshold", () => {
    const rows = [
      product({ id: 1, "PRODUCT NAME": "Fav Product", "BOUDOIR BALANCE": 50 }),
    ];
    const result = getLowBalanceProducts(rows, boudoirConfig, {
      isFav: (p: any) => p.id === 1,
      lowBalanceOf: () => 5,
    });
    expect(result.map(p => p["PRODUCT NAME"])).toEqual(["Fav Product"]);
  });

  it("includes non-favourites whose balance is LOWER than the branch's low-balance threshold", () => {
    const rows = [
      product({ id: 1, "PRODUCT NAME": "Low Stock", "BOUDOIR BALANCE": 2 }),
      product({ id: 2, "PRODUCT NAME": "Healthy Stock", "BOUDOIR BALANCE": 10 }),
    ];
    const result = getLowBalanceProducts(rows, boudoirConfig, {
      isFav: () => false,
      lowBalanceOf: (p: any) => (p.id === 1 ? 5 : 5), // threshold 5 for both
    });
    expect(result.map(p => p["PRODUCT NAME"])).toEqual(["Low Stock"]);
  });

  it("excludes products at exactly the threshold (strictly lower than)", () => {
    const rows = [product({ id: 1, "PRODUCT NAME": "At Threshold", "BOUDOIR BALANCE": 5 })];
    const result = getLowBalanceProducts(rows, boudoirConfig, {
      isFav: () => false,
      lowBalanceOf: () => 5,
    });
    expect(result).toEqual([]);
  });

  it("excludes products with no low-balance threshold unless they are favourites", () => {
    const rows = [product({ id: 1, "PRODUCT NAME": "No Threshold", "BOUDOIR BALANCE": 0 })];
    const result = getLowBalanceProducts(rows, boudoirConfig, {
      isFav: () => false,
      lowBalanceOf: () => null,
    });
    expect(result).toEqual([]);
  });

  it("treats a missing/zero balance as below any positive threshold", () => {
    const rows = [
      product({ id: 1, "PRODUCT NAME": "Null Balance" }),
      product({ id: 2, "PRODUCT NAME": "Zero Balance", "BOUDOIR BALANCE": 0 }),
    ];
    const result = getLowBalanceProducts(rows, boudoirConfig, {
      isFav: () => false,
      lowBalanceOf: () => 5,
    });
    expect(result.map(p => p["PRODUCT NAME"])).toEqual(["Null Balance", "Zero Balance"]);
  });

  it("keeps the union of both rules without duplicates and sorts A–Z by product name", () => {
    const rows = [
      product({ id: 1, "PRODUCT NAME": "Zebra Grass", "BOUDOIR BALANCE": 1 }),
      product({ id: 2, "PRODUCT NAME": "Apple Bloom", "BOUDOIR BALANCE": 99 }),
      product({ id: 3, "PRODUCT NAME": "Mango Scrub", "BOUDOIR BALANCE": 3 }),
    ];
    const result = getLowBalanceProducts(rows, boudoirConfig, {
      isFav: (p: any) => p.id === 2, // Apple Bloom: favourite above threshold
      lowBalanceOf: () => 5, // Zebra Grass + Mango Scrub below threshold
    });
    expect(result.map(p => p["PRODUCT NAME"])).toEqual(["Apple Bloom", "Mango Scrub", "Zebra Grass"]);
  });

  it("dedupes rows sharing a PRODUCT NAME (first occurrence wins)", () => {
    const rows = [
      product({ id: 1, "PRODUCT NAME": "Dup Product", "BOUDOIR BALANCE": 1 }),
      product({ id: 2, "PRODUCT NAME": "Dup Product", "BOUDOIR BALANCE": 50 }),
    ];
    const result = getLowBalanceProducts(rows, boudoirConfig, {
      isFav: () => false,
      lowBalanceOf: () => 5,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("uses each branch's own balance column (Chic + Nur Yadi)", () => {
    const chicRows = [
      product({ id: 1, "PRODUCT NAME": "Chic Low", "CHIC NAILSPA BALANCE": 1, "CHIC NAILSPA FAVOURITE": "TRUE" }),
      product({ id: 2, "PRODUCT NAME": "Chic Ok", "CHIC NAILSPA BALANCE": 20 }),
    ];
    const chicResult = getLowBalanceProducts(chicRows, chicConfig, {
      isFav: (p: any) => p["CHIC NAILSPA FAVOURITE"] === "TRUE",
      lowBalanceOf: (p: any) => (p.id === 2 ? 5 : null),
    });
    expect(chicResult.map(p => p["PRODUCT NAME"])).toEqual(["Chic Low"]);

    const nuryadiRows = [
      product({ id: 1, "PRODUCT NAME": "NY Low", "NUR YADI BALANCE": 2 }),
      product({ id: 2, "PRODUCT NAME": "NY Fav", "NUR YADI BALANCE": 30 }),
    ];
    const nuryadiResult = getLowBalanceProducts(nuryadiRows, nuryadiConfig, {
      isFav: (p: any) => p.id === 2,
      lowBalanceOf: (p: any) => (p.id === 1 ? 10 : null),
    });
    expect(nuryadiResult.map(p => p["PRODUCT NAME"])).toEqual(["NY Fav", "NY Low"]);
  });

  it("falls back to favourites-only when no lowBalanceOf lookup is provided", () => {
    const rows = [
      product({ id: 1, "PRODUCT NAME": "Fav", "BOUDOIR BALANCE": 0 }),
      product({ id: 2, "PRODUCT NAME": "Low But Not Fav", "BOUDOIR BALANCE": 1 }),
    ];
    const result = getLowBalanceProducts(rows, boudoirConfig, { isFav: (p: any) => p.id === 1 });
    expect(result.map(p => p["PRODUCT NAME"])).toEqual(["Fav"]);
  });
});

