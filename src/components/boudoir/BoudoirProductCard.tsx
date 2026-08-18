import React from "react";
import { Star } from "lucide-react";

interface BoudoirProductCardProps {
  selectedProduct: any;
  isFav: (p: any) => boolean;
  onToggleFav: (product: any) => void;
  onBack: () => void;
}

export const BoudoirProductCard = ({ selectedProduct, isFav, onToggleFav, onBack }: BoudoirProductCardProps) => {
  if (!selectedProduct) return null;

  return (
    <div style={{ flexShrink: 0, marginBottom: "24px", paddingBottom: "20px", borderBottom: "0.5px solid hsl(var(--border))" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", gap: "12px" }}>
        <div style={{ fontSize: "clamp(16px, 4.5vw, 22px)", fontWeight: 400, fontFamily: "Raleway, inherit", lineHeight: 1.3, color: "hsl(var(--foreground))", flex: 1 }}>
          {selectedProduct["PRODUCT NAME"]}
        </div>
        {(selectedProduct as any)["BOUDOIR BALANCE"] != null && (
          <div style={{ fontSize: "clamp(16px, 4.5vw, 22px)", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
            {(selectedProduct as any)["BOUDOIR BALANCE"]}
          </div>
        )}

        <button
          onClick={() => toggleFavourite(selectedProduct)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
        >
          <Star size={16} fill={isFav(selectedProduct) ? "hsl(var(--foreground))" : "none"} color="hsl(var(--foreground))" />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Staff</div>
          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
            {selectedProduct["STAFF PRICE"] != null ? `RM ${Number(selectedProduct["STAFF PRICE"]).toFixed(2)}` : "—"}
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "4px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Customer</div>
          <div style={{ fontSize: "15px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
            {selectedProduct["CUSTOMER PRICE"] != null ? `RM ${Number(selectedProduct["CUSTOMER PRICE"]).toFixed(2)}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
};