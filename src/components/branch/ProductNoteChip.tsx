import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useProductNote } from "@/hooks/useProductNote";
import { ProductNotePanel } from "./ProductNotePanel";

interface ProductNoteChipProps {
  /** AllFileProducts.PRODUCT NAME — keys the public "Notes" row. */
  productName: string;
}

// Compact round italic "i" — matches the ProductImage info button, sized for
// dense search rows.
const chipBtnStyle: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "hsl(0 0% 98%)",
  border: "0.5px solid hsl(var(--border))",
  color: "hsl(var(--foreground))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
  fontSize: "12px",
  fontWeight: 600,
  fontStyle: "italic",
  lineHeight: 1,
  fontFamily: "Raleway, inherit",
};

/**
 * Product note opener for search dropdown rows. Renders the round "i" chip and
 * opens the note in a portal'd modal so the scrolling dropdown never clips it.
 * Stops click propagation so tapping the chip does not select the row.
 */
export const ProductNoteChip = ({ productName }: ProductNoteChipProps) => {
  const api = useProductNote(productName);

  // Close on Escape while the modal is open (same nicety as the image zoom).
  useEffect(() => {
    if (!api.showNotes) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") api.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api.showNotes, api.close]);

  return (
    <>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          api.toggle();
        }}
        title="Product note"
        style={chipBtnStyle}
      >
        i
      </button>
      {api.showNotes && createPortal(
        <div
          onClick={api.close}
          title="Tap anywhere to close"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
            boxSizing: "border-box",
            touchAction: "none",
            overscrollBehavior: "contain",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(360px, 100%)",
              background: "hsl(var(--background))",
              border: "0.5px solid hsl(var(--border))",
              borderRadius: "14px",
              padding: "14px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: 1.35,
                color: "hsl(var(--foreground))",
                fontFamily: "Raleway, inherit",
              }}
            >
              {productName}
            </div>
            <ProductNotePanel api={api} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};