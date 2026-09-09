import React from "react";
import { Star } from "lucide-react";
import type { OfficeProduct, OrderLine } from "@/components/office/OrderSummaryOffice";

interface BelowParOverlayProps {
  belowParList: OfficeProduct[];
  orderLines: OrderLine[];
  isInOrder: (p: OfficeProduct) => boolean;
  toggleBelowPar: (p: OfficeProduct) => void;
  isOfficeFav: (p: OfficeProduct) => boolean;
  toggleOfficeFav: (
    product: OfficeProduct,
    setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>
  ) => Promise<void>;
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  setBelowParList: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  setEditParProduct: (p: OfficeProduct | null) => void;
  setEditParValue: (v: string) => void;
  balCell: (balance: number | null, par: number | null) => React.ReactNode;
  onClose: () => void;
  fg: string;
  muted: string;
  border: string;
  hdrStyle: React.CSSProperties;
}

/**
 * Full-screen "BELOW PAR" overlay panel for the Office Order page — extracted
 * verbatim from src/pages/Order.tsx as a pure refactor (no visual or behavioural
 * change). The PAR edit popover it can trigger still lives in Order.tsx.
 */
export function BelowParOverlay({
  belowParList,
  orderLines,
  isInOrder,
  toggleBelowPar,
  isOfficeFav,
  toggleOfficeFav,
  setProducts,
  setBelowParList,
  setEditParProduct,
  setEditParValue,
  balCell,
  onClose,
  fg,
  muted,
  border,
  hdrStyle,
}: BelowParOverlayProps) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "hsl(var(--background))",
      display: "flex", flexDirection: "column",
      zIndex: 100,
    }}>
      {/* Panel header — no bottom border; the column headers keep a single line below them */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", flexShrink: 0,
      }}>
        <div>
          {/* Title is clickable — closes the overlay and returns to the order section
              (same pattern as the clickable ORDER title in the page top bar). */}
          <div
            onClick={onClose}
            style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: fg, cursor: "pointer" }}
          >
            BELOW PAR
          </div>
          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, marginTop: "2px" }}>
            {belowParList.length} {belowParList.length === 1 ? "Product" : "Products"}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Back"
          title="Back"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: fg, display: "flex", alignItems: "center", touchAction: "manipulation" }}
        >
          {/* Same left-arrow style as the Search page header */}
          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="30" y1="8" x2="1" y2="8" />
            <polyline points="9,1 1,8 9,15" />
          </svg>
        </button>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr 40px 40px 40px 40px 28px",
        gap: "4px",
        padding: "8px 16px",
        borderBottom: border,
        flexShrink: 0,
      }}>
        <div />
        <div style={{ ...hdrStyle, fontSize: "9px" }}>PRODUCT</div>
        <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>OFF</div>
        <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>BOU</div>
        <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>CHI</div>
        <div style={{ ...hdrStyle, fontSize: "9px", textAlign: "center" }}>NUR</div>
        <div />
      </div>

      {/* Product list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {belowParList.length === 0 ? (
          <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, padding: "24px 16px" }}>
            All products are above PAR 🎉
          </div>
        ) : (
          belowParList.map((p, i) => {
            const inOrder = isInOrder(p);
            const par = p["PAR"];
            return (
              <div
                key={`${p["PRODUCT NAME"]}|||${p["SUPPLIER"]}`}
                onClick={() => toggleBelowPar(p)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr 40px 40px 40px 40px 28px",
                  gap: "4px",
                  alignItems: "center",
                  padding: "11px 16px",
                  borderBottom: i < belowParList.length - 1 ? border : "none",
                  cursor: "pointer",
                  background: inOrder ? "hsl(var(--card))" : "transparent",
                }}
              >
                {/* Checkbox — round circle; filled black with a white tick when in order */}
                <div style={{
                  width: "16px", height: "16px",
                  border: `1.5px solid ${inOrder ? fg : "hsl(var(--border))"}`,
                  borderRadius: "50%",
                  background: inOrder ? fg : "transparent",
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
                    {isOfficeFav(p) && <Star size={8} fill="currentColor" style={{ color: fg, flexShrink: 0 }} />}
                    <div style={{ fontSize: "13px", fontWeight: inOrder ? 500 : 300, fontFamily: "Raleway, inherit", color: fg, lineHeight: 1.3 }}>{p["PRODUCT NAME"]}</div>
                  </div>
                  {p["SUPPLIER"] && <div style={{ fontSize: "10px", fontFamily: "Raleway, inherit", color: muted, marginTop: "1px" }}>{p["SUPPLIER"]}</div>}
                </div>

                {/* Balances — tap to edit PAR */}
                <div
                  onClick={e => { e.stopPropagation(); setEditParProduct(p); setEditParValue(String(par ?? "")); }}
                  style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", cursor: "pointer", position: "relative" }}
                >
                  {balCell(p["OFFICE BALANCE"], par)}
                </div>
                <div style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", color: muted, fontWeight: 300 }}>
                  {p["BOUDOIR BALANCE"] ?? "—"}
                </div>
                <div style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", color: muted, fontWeight: 300 }}>
                  {p["CHIC NAILSPA BALANCE"] ?? "—"}
                </div>
                <div style={{ fontSize: "12px", fontFamily: "Raleway, inherit", textAlign: "center", color: muted, fontWeight: 300 }}>
                  {p["NUR YADI BALANCE"] ?? "—"}
                </div>

                {/* Favourite star */}
                <button
                  onClick={e => { e.stopPropagation(); toggleOfficeFav(p, setProducts); setBelowParList(prev => prev.map(x => x.id === p.id ? { ...x, "OFFICE FAVOURITE": (isOfficeFav(p) ? null : "TRUE") } : x)); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Star
                    size={13}
                    strokeWidth={1.5}
                    fill={isOfficeFav(p) ? fg : "none"}
                    style={{ color: isOfficeFav(p) ? fg : muted }}
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
            borderRadius: "999px", cursor: "pointer",
          }}
        >
          DONE · {orderLines.length} {orderLines.length === 1 ? "ITEM" : "ITEMS"} IN ORDER
        </button>
      </div>
    </div>
  );
}
