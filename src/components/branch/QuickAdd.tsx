import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type BranchConfig, type OfficeProduct } from "@/lib/branchSimple";
import { isYes } from "@/lib/branchSimpleUtils";
import { QUICK_ADD_PRODUCTS } from "@/lib/quickAdd";

interface QuickAddProps {
  config: BranchConfig;
  products: OfficeProduct[];
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  refreshBranchLog: () => void | Promise<void>;
  setSelectedProduct: React.Dispatch<React.SetStateAction<OfficeProduct | null>>;
  onClose: () => void;
}

// Fixed defaults for every Quick Add entry — each tap writes one UsageTable-style
// "Salon Use" row of qty -1 with no therapist and no note, straight to AllFileLog.
const QTY = -1;
// typeColumnValue("Salon Use") === "Salon Use" and usagePillValue("Salon Use") === "Salon Use",
// so TYPE / USAGE PILL are written with this value directly.
const TYPE_VALUE = "Salon Use";
// Short per-product cooldown so an accidental double-tap doesn't write two rows.
const TAP_COOLDOWN_MS = 500;

/**
 * Content of the QuickAdd popup opened by BottomNavQuickAdd. Tapping a product
 * immediately performs the same write as pressing Submit in the UsageTable —
 * one AllFileLog row plus the AllFileProducts balance update — while staying
 * on the branch page (no navigation, no draft entries).
 */
export const QuickAdd = ({ config, products, setProducts, refreshBranchLog, setSelectedProduct, onClose }: QuickAddProps) => {
  const BALANCE_KEY = config.balanceKey as keyof OfficeProduct;
  const [savedRows, setSavedRows] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  // Branch balances for products this popup has already written, mirroring the
  // DB so rapid consecutive taps compute correct STARTING/ENDING balances even
  // before the optimistic products-state update has round-tripped.
  const lastEndingRef = useRef<Map<string, number>>(new Map());
  // Serializes submissions so concurrent taps still write (and balance) in order.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Per-product tap-cooldown timestamps + "✓ Saved" feedback timers.
  const lastTapRef = useRef<Map<string, number>>(new Map());
  const savedTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => () => {
    savedTimersRef.current.forEach(t => window.clearTimeout(t));
  }, []);

  const items = useMemo(() => {
    const byName = new Map<string, OfficeProduct>();
    products.forEach(p => {
      const name = p["PRODUCT NAME"];
      if (name && !byName.has(name)) byName.set(name, p);
    });
    const curated = QUICK_ADD_PRODUCTS[config.key] ?? [];
    let names: string[];
    if (curated.length > 0) {
      // Curated list: shown exactly in the configured order.
      names = curated;
    } else {
      // Temporary fallback until the curated list is filled in: the branch's
      // favourites, A→Z, restricted to the products the UsageTable picker offers
      // (UNITS/ORDER null or ≤ 1).
      names = Array.from(byName.values())
        .filter(p => (p["UNITS/ORDER"] == null || p["UNITS/ORDER"] <= 1) && isYes(p[config.favouriteKey]))
        .map(p => p["PRODUCT NAME"])
        .sort((a, b) => a.localeCompare(b));
    }
    const seen = new Set<string>();
    const out: OfficeProduct[] = [];
    for (const name of names) {
      if (seen.has(name)) continue;
      const p = byName.get(name);
      if (p) { seen.add(name); out.push(p); }
    }
    return out;
  }, [products, config]);

  const logProduct = (productName: string) => {
    const now = Date.now();
    const last = lastTapRef.current.get(productName) ?? 0;
    if (now - last < TAP_COOLDOWN_MS) return;
    lastTapRef.current.set(productName, now);

    queueRef.current = queueRef.current.then(async () => {
      try {
        const product = products.find(p => p["PRODUCT NAME"] === productName);
        const startingBalance = lastEndingRef.current.get(productName) ?? Number(product?.[BALANCE_KEY] ?? 0);
        const endingBalance = startingBalance + QTY;
        lastEndingRef.current.set(productName, endingBalance);

        const today = new Date().toISOString().split("T")[0];
        const { error: logErr } = await (supabase as any).from("AllFileLog").insert({
          "DATE": today,
          "PRODUCT NAME": productName,
          "BRANCH": config.logBranchName,
          "SUPPLIER": null,
          "TYPE": TYPE_VALUE,
          "USAGE PILL": TYPE_VALUE,
          "THERAPIST": null,
          "NOTES": "",
          "STARTING BALANCE": startingBalance,
          "QTY": QTY,
          "ENDING BALANCE": endingBalance,
          "GRN": null,
          "OFFICE BALANCE": Number(product?.["OFFICE BALANCE"] ?? 0),
        });
        if (logErr) throw new Error(logErr.message || "Write failed");

        await (supabase as any).from("AllFileProducts")
          .update({ [BALANCE_KEY]: endingBalance })
          .eq("PRODUCT NAME", productName);

        // Optimistic state updates so the home page reflects the new balance instantly.
        setProducts(prev => prev.map(p =>
          p["PRODUCT NAME"] === productName
            ? { ...p, [BALANCE_KEY]: Number(p[BALANCE_KEY] ?? 0) + QTY }
            : p
        ));
        setSelectedProduct(prev =>
          prev && prev["PRODUCT NAME"] === productName
            ? { ...prev, [BALANCE_KEY]: Number(prev[BALANCE_KEY] ?? 0) + QTY }
            : prev
        );

        setError(null);
        refreshBranchLog();

        setSavedRows(prev => { const n = new Set(prev); n.add(productName); return n; });
        const t = window.setTimeout(() => {
          savedTimersRef.current.delete(productName);
          setSavedRows(prev => { const n = new Set(prev); n.delete(productName); return n; });
        }, 2500);
        savedTimersRef.current.set(productName, t);
      } catch (err: any) {
        lastEndingRef.current.delete(productName);
        setError(err?.message || "Unknown error");
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.25, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "8px", flexShrink: 0 }}>
        <span style={{ fontSize: "20px", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>QUICK ADD</span>
        <button
          onClick={onClose}
          aria-label="Close quick add"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Curated product rows — one tap = one -1 "Salon Use" log entry */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
        {items.length === 0 && (
          <div style={{ padding: "18px 0 10px", textAlign: "center", fontSize: "11px", letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
            NO QUICK ADD PRODUCTS SET
          </div>
        )}
        {items.map(p => {
          const name = p["PRODUCT NAME"];
          const saved = savedRows.has(name);
          return (
            <button
              key={name}
              onClick={() => logProduct(name)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                padding: "12px 2px",
                background: "none",
                border: "none",
                borderBottom: "0.5px solid hsl(var(--border))",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", lineHeight: 1.35 }}>{name}</span>
              {saved ? (
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", letterSpacing: "0.06em", fontFamily: "Raleway, inherit", color: "hsl(var(--green, 120 60% 40%))" }}>
                  <Check size={12} strokeWidth={2.5} /> Saved
                </span>
              ) : (
                <span style={{ flexShrink: 0, fontSize: "11px", letterSpacing: "0.04em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
                  −1 · {TYPE_VALUE}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ flexShrink: 0, paddingTop: "8px", fontSize: "11px", color: "hsl(0 70% 50%)", letterSpacing: "0.04em", fontFamily: "Raleway, inherit" }}>
          ✗ {error}
        </div>
      )}
    </motion.div>
  );
};