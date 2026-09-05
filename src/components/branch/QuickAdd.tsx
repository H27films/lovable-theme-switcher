import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type BranchConfig, type OfficeProduct } from "@/lib/branchSimple";
import { QUICK_ADD_PRODUCTS, FAVOURITES_TABLE_COLUMN } from "@/lib/quickAdd";

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
  const [savedName, setSavedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Branch balances for products this popup has already written, mirroring the
  // DB so rapid consecutive taps compute correct STARTING/ENDING balances even
  // before the optimistic products-state update has round-tripped.
  const lastEndingRef = useRef<Map<string, number>>(new Map());
  // Serializes submissions so concurrent taps still write (and balance) in order.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Per-product tap-cooldown timestamps + row confirm timer.
  const lastTapRef = useRef<Map<string, number>>(new Map());
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
  }, []);

  // Branch favourites from the live `Favourites` Supabase table — the popup's
  // default content until the curated QUICK_ADD_PRODUCTS list is filled in.
  // Same source/pattern as the Favourites panel (paginated reads, client-side
  // "TRUE" check on the branch's favourite column).
  const [favNames, setFavNames] = useState<string[]>([]);
  const [favsLoading, setFavsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFavsLoading(true);
      try {
        const favCol = FAVOURITES_TABLE_COLUMN[config.key];
        const rows: any[] = [];
        let from = 0;
        const batch = 1000;
        while (true) {
          const { data, error } = await (supabase as any)
            .from("Favourites")
            .select(`id, "PRODUCT NAME", "${favCol}"`)
            .range(from, from + batch - 1);
          if (error || !data?.length) break;
          rows.push(...data);
          if (data.length < batch) break;
          from += batch;
        }
        if (cancelled) return;
        const isTrue = (v: unknown) => String(v ?? "").trim().toUpperCase() === "TRUE";
        const names = Array.from(new Set(
          rows
            .filter((r: any) => isTrue(r[favCol]))
            .map((r: any) => String(r["PRODUCT NAME"] ?? "").trim())
            .filter(n => n)
        )).sort((a, b) => a.localeCompare(b));
        setFavNames(names);
      } catch {
        if (!cancelled) setFavNames([]);
      } finally {
        if (!cancelled) setFavsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [config.key]);

  const items = useMemo(() => {
    // Curated list (once filled in) takes precedence, shown in configured order;
    // otherwise the branch's favourites from the Favourites table, A→Z.
    const curated = QUICK_ADD_PRODUCTS[config.key] ?? [];
    const names = curated.length > 0 ? curated : favNames;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of names) {
      const name = String(raw ?? "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push(name);
    }
    return out;
  }, [config.key, favNames]);

  const logProduct = (productName: string): Promise<boolean> => {
    return queueRef.current.then(async () => {
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
        return true;
      } catch (err: any) {
        lastEndingRef.current.delete(productName);
        setError(err?.message || "Unknown error");
        return false;
      }
    });
  };

  // Row-tap flow: log the product, run the row confirm animation (name swipes
  // right → "Saved" → name reappears from the left), then leave the box open so
  // the user can keep selecting more products.
  const handleRowTap = (productName: string) => {
    if (savedName) return;
    const now = Date.now();
    const last = lastTapRef.current.get(productName) ?? 0;
    if (now - last < TAP_COOLDOWN_MS) return;
    lastTapRef.current.set(productName, now);

    logProduct(productName).then((ok: boolean) => {
      if (!ok) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

      setSavedName(productName);
      // Leave time for: name exit right (0.22s) + "Saved" enter (0.22s) + hold,
      // then the name re-enters from the left. Box stays open.
      saveTimerRef.current = window.setTimeout(() => {
        setSavedName(null);
      }, 900);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.25, ease: "easeOut" }}
      style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
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

      {/* Favourite product rows — one tap = one -1 "Salon Use" log entry */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
        {items.length === 0 && (
          <div style={{ padding: "18px 0 10px", textAlign: "center", fontSize: "11px", letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }}>
            {favsLoading ? "LOADING…" : "NO QUICK ADD PRODUCTS SET"}
          </div>
        )}
        {items.map(name => {
          const saved = savedName === name;
          return (
            <button
              key={name}
              onClick={() => handleRowTap(name)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 2px",
                background: "none",
                border: "none",
                borderBottom: "0.5px solid hsl(var(--border))",
                cursor: "pointer",
                textAlign: "left",
                overflow: "hidden",
              }}
            >
              {/* Row confirm: on tap the name swipes right out, "Saved" shows,
                  then the name reappears from the left. */}
              <span style={{ flex: 1, minWidth: 0, display: "block", overflow: "hidden", textAlign: "left" }}>
                <AnimatePresence mode="wait" initial={false}>
                  {saved ? (
                    <motion.span
                      key="saved"
                      initial={{ x: 28, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 40, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.04em" }}
                    >
                      Saved
                      <Check size={14} strokeWidth={2.5} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="name"
                      initial={{ x: -40, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 40, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      style={{ display: "block", fontSize: "14.5px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", lineHeight: 1.35 }}
                    >
                      {name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
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