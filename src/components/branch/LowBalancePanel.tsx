import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isYes } from "@/lib/branchSimpleUtils";
import { type BranchConfig, type OfficeProduct } from "@/lib/branchSimple";

interface LowBalancePanelProps {
  config: BranchConfig;
  products: OfficeProduct[];
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  /** Branch favourite check (useBranchFavourites.isFav) — falls back to the AllFileProducts favourite column. */
  isFav?: (p: any) => boolean;
  /** Branch favourite toggle (useBranchFavourites.toggleFavourite) — drives the star button in each row. */
  toggleFavourite?: (p: any) => void | Promise<void>;
  /** Is the product (matched by PRODUCT NAME) currently in the branch order? */
  isProductInOrder: (productName: string) => boolean;
  /** Add/remove the product from the branch order. */
  onToggleProduct: (p: OfficeProduct) => void;
  /** Total items currently in the branch order (footer counter). */
  orderItemCount: number;
  onClose: () => void;
}

const fg = "hsl(var(--foreground, 0 0% 100%))";
const muted = "hsl(var(--muted-foreground, 0 0% 50%))";
const border = "0.5px solid hsl(var(--border, 0 0% 50%))";
const red = "hsl(0 84% 60%)";

const hdrStyle: React.CSSProperties = {
  fontSize: "9px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: fg, textTransform: "uppercase", letterSpacing: "0.08em",
};

/**
 * The branch's favourite products — the Low Balance list. Everything marked TRUE
 * in the branch's Favourites column (Favourites table via isFav; falls back to the
 * AllFileProducts favourite column), shown regardless of PAR level. Rows are deduped
 * by PRODUCT NAME (branch order entries are keyed by name) and sorted A–Z.
 */
export const getLowBalanceProducts = (
  products: OfficeProduct[],
  config: BranchConfig,
  opts?: { isFav?: (p: any) => boolean }
): OfficeProduct[] => {
  const isFav = opts?.isFav || ((p: any) => isYes(p[config.favouriteKey]));
  const seen = new Map<string, OfficeProduct>();
  for (const p of products) {
    if (!isFav(p)) continue;
    const name = p["PRODUCT NAME"];
    if (!name || seen.has(name)) continue;
    seen.set(name, p);
  }
  return Array.from(seen.values()).sort((a, b) =>
    String(a["PRODUCT NAME"]).localeCompare(String(b["PRODUCT NAME"]))
  );
};

// Balance display helper: red + bold if at/below PAR (or no balance yet), muted otherwise —
// same treatment as the OFF balance column in the Office Below Par overlay.
const balanceCell = (bal: number | null | undefined, par: number | null | undefined) => {
  const below = !!par && par > 0 && (bal === null || bal === undefined || bal <= par);
  return (
    <span style={{ color: below ? red : muted, fontWeight: below ? 600 : 300 }}>
      {bal ?? "—"}
    </span>
  );
};

/**
 * "Low Balance" overlay for the branch Order panels (Boudoir / Chic / Nur Yadi).
 * Shows the branch's favourite products (branch Favourites column, regardless of
 * PAR level). Rows are tappable to add/remove the product from the branch order,
 * the branch balance cell is tappable to edit its PAR, and the star toggles the
 * branch's Favourites table entry. The clickable LOW BALANCE title closes the
 * overlay, returning to the order section.
 */
export const LowBalancePanel = ({
  config, products, setProducts,
  isFav: propIsFav, toggleFavourite,
  isProductInOrder, onToggleProduct, orderItemCount, onClose,
}: LowBalancePanelProps) => {
  const isFav = propIsFav || ((p: any) => isYes(p[config.favouriteKey]));
  const balKey = config.balanceKey as string;

  const [editParProduct, setEditParProduct] = useState<OfficeProduct | null>(null);
  const [editParValue, setEditParValue] = useState("");

  const saveParValue = async (product: OfficeProduct, newPar: number | null) => {
    await (supabase as any)
      .from("AllFileProducts")
      .update({ "PAR": newPar })
      .eq("id", product.id);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, "PAR": newPar } : p));
  };

  const lowBalanceProducts = getLowBalanceProducts(products, config, { isFav });

  return (
    <>
      <div style={{
        position: "absolute", inset: 0,
        background: "hsl(var(--background, 0 0% 0%))",
        display: "flex", flexDirection: "column",
        zIndex: 100,
      }}>
        {/* Panel header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 16px 16px", borderBottom: border, flexShrink: 0,
        }}>
          <div>
            {/* Title is clickable — closes the overlay and returns to the order section
                (same pattern as the clickable BELOW PAR title on the Office Order page). */}
            <div
              onClick={onClose}
              style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", fontFamily: "Raleway, inherit", color: fg, cursor: "pointer" }}
            >
              LOW BALANCE
            </div>
            <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, marginTop: "2px" }}>
              {lowBalanceProducts.length} {lowBalanceProducts.length === 1 ? "product" : "products"} · tap to add/remove from order
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: muted, display: "flex", alignItems: "center" }}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 48px 28px",
          gap: "4px",
          padding: "8px 16px",
          borderBottom: border,
          flexShrink: 0,
        }}>
          <div />
          <div style={{ ...hdrStyle }}>PRODUCT</div>
          <div style={{ ...hdrStyle, textAlign: "center" }}>BAL</div>
          <div />
        </div>

        {/* Product list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {lowBalanceProducts.length === 0 ? (
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, padding: "24px 16px" }}>
              All products are above PAR 🎉
            </div>
          ) : (
            lowBalanceProducts.map((p, i) => {
              const inOrder = isProductInOrder(p["PRODUCT NAME"]);
              const par = (p as any)["PAR"] as number | null;
              const fav = isFav(p);
              return (
                <div
                  key={p.id}
                  onClick={() => onToggleProduct(p)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr 48px 28px",
                    gap: "4px",
                    alignItems: "center",
                    padding: "11px 16px",
                    borderBottom: i < lowBalanceProducts.length - 1 ? border : "none",
                    cursor: "pointer",
                    background: inOrder ? "hsl(var(--card, 0 0% 10%))" : "transparent",
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: "16px", height: "16px",
                    border: `1.5px solid ${inOrder ? red : "hsl(var(--border, 0 0% 50%))"}`,
                    borderRadius: "3px",
                    background: inOrder ? red : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {inOrder && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* Product name + supplier */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {fav && <Star size={8} fill="currentColor" style={{ color: fg, flexShrink: 0 }} />}
                      <div style={{ fontSize: "13px", fontWeight: inOrder ? 500 : 300, fontFamily: "Raleway, inherit", color: fg, lineHeight: 1.3 }}>{p["PRODUCT NAME"]}</div>
                    </div>
                    {p["SUPPLIER"] && <div style={{ fontSize: "10px", fontFamily: "Raleway, inherit", color: muted, marginTop: "1px" }}>{p["SUPPLIER"]}</div>}
                  </div>

                  {/* Branch balance — tap to edit PAR */}
                  <div
                    onClick={e => { e.stopPropagation(); setEditParProduct(p); setEditParValue(String(par ?? "")); }}
                    style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", cursor: "pointer", position: "relative" }}
                  >
                    {balanceCell((p as any)[balKey], par)}
                  </div>

                  {/* Favourite star — branch-specific Favourites table column */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavourite?.(p); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Star
                      size={13}
                      strokeWidth={1.5}
                      fill={fav ? fg : "none"}
                      style={{ color: fav ? fg : muted }}
                    />
                  </button>
                </div>
              );
            })
          )}
          <div style={{ paddingBottom: "40px" }} />
        </div>

        {/* Footer: done button */}
        <div style={{ padding: "12px 16px", borderTop: border, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "12px",
              fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
              letterSpacing: "0.12em", textTransform: "uppercase",
              border: "0.5px solid hsl(var(--foreground))",
              background: "hsl(var(--foreground))",
              color: "hsl(var(--background))",
              borderRadius: "6px", cursor: "pointer",
            }}
          >
            DONE · {orderItemCount} {orderItemCount === 1 ? "ITEM" : "ITEMS"} IN ORDER
          </button>
        </div>
      </div>

      {/* PAR edit popover (portalled to <body> — keeps it clear of the panel's tablet zoom) */}
      {editParProduct && createPortal(
        <div
          onClick={() => setEditParProduct(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              padding: "20px 20px 16px",
              width: "260px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            {/* Product name */}
            <div style={{ fontSize: "12px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "4px" }}>
              {editParProduct["SUPPLIER"]}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", marginBottom: "16px", lineHeight: 1.3 }}>
              {editParProduct["PRODUCT NAME"]}
            </div>

            {/* PAR label + input */}
            <div style={{ fontSize: "11px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.1em", color: "hsl(var(--muted-foreground))", marginBottom: "6px", textTransform: "uppercase" }}>
              PAR
            </div>
            <input
              autoFocus
              type="number"
              value={editParValue}
              onChange={e => setEditParValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const val = editParValue.trim() === "" ? null : Number(editParValue);
                  saveParValue(editParProduct, isNaN(val as number) ? null : val);
                  setEditParProduct(null);
                }
                if (e.key === "Escape") setEditParProduct(null);
              }}
              style={{
                width: "100%", padding: "10px 12px",
                fontSize: "18px", fontFamily: "Raleway, inherit", fontWeight: 300,
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="0"
            />

            {/* Buttons */}
            <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
              <button
                onClick={() => setEditParProduct(null)}
                style={{
                  flex: 1, padding: "9px",
                  fontSize: "12px", fontWeight: 500, fontFamily: "Raleway, inherit", letterSpacing: "0.08em",
                  background: "transparent",
                  border: "0.5px solid hsl(var(--border))",
                  borderRadius: "6px", cursor: "pointer",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  const val = editParValue.trim() === "" ? null : Number(editParValue);
                  saveParValue(editParProduct, isNaN(val as number) ? null : val);
                  setEditParProduct(null);
                }}
                style={{
                  flex: 1, padding: "9px",
                  fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", letterSpacing: "0.08em",
                  background: "hsl(var(--foreground))",
                  border: "0.5px solid hsl(var(--foreground))",
                  borderRadius: "6px", cursor: "pointer",
                  color: "hsl(var(--background))",
                }}
              >
                SAVE
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};





