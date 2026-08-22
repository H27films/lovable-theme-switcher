// Shared domain types + per-branch configuration for the Simple resource pages.
// The three branch pages (Boudoir / Chic / Nur Yadi) are 99% identical; the only
// differences are captured here as BranchConfig, so a single BranchSimple component
// can drive all three.
import { USAGE_TYPES, THERAPISTS, type UsageType } from "./branchSimpleUtils";

export { USAGE_TYPES, THERAPISTS, type UsageType };

export interface OfficeProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "OFFICE BALANCE": number | null;
  "OFFICE SECTION": string | null;
  "UNITS/ORDER": number | null;
  "BOUDOIR BALANCE": number | null;
  "CHIC NAILSPA BALANCE": number | null;
  "NUR YADI BALANCE": number | null;
  "Colour": string | null;
  "BOUDOIR FAVOURITE": string | boolean | null;
  "CHIC NAILSPA FAVOURITE": string | boolean | null;
  "NUR YADI FAVOURITE": string | boolean | null;
  "UOM"?: string | null;
  "PAR"?: number | null;
  "OFFICE FAVOURITE"?: string | boolean | null;
}

export interface LogRow {
  id: number;
  DATE: string;
  "PRODUCT NAME": string;
  BRANCH: string;
  TYPE: string;
  QTY: number;
  "STARTING BALANCE": number;
  "ENDING BALANCE": number;
  GRN?: string;
  "OFFICE BALANCE"?: number;
}

export interface EntryLine {
  id: number;
  productName: string;
  type: UsageType;
  qty: number;
  therapist: string;
  note: string;
  noteOpen: boolean;
}

export interface CashRow {
  id: number;
  Branch: string;
  "Total GST": number | null;
  Credit: number | null;
  QR: number | null;
  Cash: number | null;
  Date: string;
  Error: number | null;
  Explanation: string | null;
}

export interface CashEntryState {
  date: string;
  totalGST: string;
  credit: string;
  qr: string;
  cashOverride: string;
  error: string;
  errorNote: string;
  expanded: boolean;
  existingId?: number;
}

export type BranchKey = "boudoir" | "chic" | "nuryadi";

export interface BranchConfig {
  key: BranchKey;
  /** Header title e.g. "BOUDOIR" */
  displayName: string;
  /** Products column key containing the branch's stock balance */
  balanceKey: keyof OfficeProduct;
  /** Products column key holding the favourite flag */
  favouriteKey: keyof OfficeProduct;
  /** Value stored in AllFileLog.BRANCH for this branch */
  logBranchName: string;
  /** Value stored in Cash.Branch for this branch */
  cashBranchName: string;
  /** Prefix used when generating GRN numbers e.g. "BOU" */
  grnPrefix: string;
  /** Heading printed on the GRN PDF */
  pdfHeader: string;
  /** Download filename for the cash deposit export */
  cashExportFilename: string;
  /** Download filename (no extension) for the order form export */
  orderExportFilename: string;
  /** Section heading for favourites in the pickers */
  favouritesLabel: string;
}

export const boudoirConfig: BranchConfig = {
  key: "boudoir",
  displayName: "BOUDOIR",
  balanceKey: "BOUDOIR BALANCE",
  favouriteKey: "BOUDOIR FAVOURITE",
  logBranchName: "Boudoir",
  cashBranchName: "Boudoir",
  grnPrefix: "BOU",
  pdfHeader: "BOUDOIR",
  cashExportFilename: "Boudoir Cash Export.csv",
  orderExportFilename: "BoudoirOrder",
  favouritesLabel: "Boudoir Favourites",
};

export const chicConfig: BranchConfig = {
  key: "chic",
  displayName: "CHIC",
  balanceKey: "CHIC NAILSPA BALANCE",
  favouriteKey: "CHIC NAILSPA FAVOURITE",
  logBranchName: "Chic Nailspa",
  cashBranchName: "Chic Nailspa",
  grnPrefix: "CHIC",
  pdfHeader: "CHIC",
  cashExportFilename: "Chic Nailspa Export.csv",
  orderExportFilename: "ChicOrder",
  favouritesLabel: "Chic Nailspa Favourites",
};

export const nuryadiConfig: BranchConfig = {
  key: "nuryadi",
  displayName: "NUR YADI",
  balanceKey: "NUR YADI BALANCE",
  favouriteKey: "NUR YADI FAVOURITE",
  logBranchName: "Nur Yadi",
  cashBranchName: "Nur Yadi",
  grnPrefix: "NUR",
  pdfHeader: "NUR YADI",
  cashExportFilename: "Nur Yadi Cash Export.csv",
  orderExportFilename: "NurYadiOrder",
  favouritesLabel: "Nur Yadi Favourites",
};

export const BRANCH_CONFIGS: Record<BranchKey, BranchConfig> = {
  boudoir: boudoirConfig,
  chic: chicConfig,
  nuryadi: nuryadiConfig,
};