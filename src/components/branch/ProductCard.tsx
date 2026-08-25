import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { isYes } from "@/lib/branchSimpleUtils";
import { type OfficeProduct } from "@/lib/branchSimple";

interface ProductCardProps {
  selectedProduct: any;
  balanceKey: keyof OfficeProduct;
  favouriteKey: keyof OfficeProduct;
  onToggleFav: (product: any) => void;
  /** Favourite lookup (defaults to the product's own favourite column) */
  isFavourite?: (product: any) => boolean;
  /** The BRANCH value in AllFileLog used to filter usage stats. */
  branchLogName: string;
}

export const ProductCard = ({ selectedProduct, balanceKey, favouriteKey, onToggleFav, isFavourite, branchLogName }: ProductCardProps) => {
  const [usage, setUsage] = useState<number | null>(null);
  const [period, setPeriod] = useState<number | null>(null);
  const [perWeek, setPerWeek] = useState<number | null>(null);

  useEffect(() => {
    setUsage(null);
    setPeriod(null);
    setPerWeek(null);
    if (!selectedProduct || !branchLogName) return;

    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("AllFileLog")
        .select("QTY, DATE")
        .eq("PRODUCT NAME", selectedProduct["PRODUCT NAME"])
        .eq("BRANCH", branchLogName);
      if (cancelled) return;

      // Only count records that reduced stock (negative QTY)
      const rows = (data || []).filter((r: any) => Number(r.QTY) < 0);
      const usageVal = rows.reduce((sum: number, r: any) => sum + Math.abs(Number(r.QTY)), 0);

      const times = rows.map((r: any) => new Date(r.DATE).getTime()).filter((t) => Number.isFinite(t));
      let periodVal = 0;
      if (times.length > 0) {
        const min = Math.min(...times);
        const max = Math.max(...times);
        periodVal = Math.round((max - min) / (1000 * 60 * 60 * 24 * 7));
      }

      setUsage(usageVal);
      setPeriod(periodVal);
      setPerWeek(periodVal > 0 ? Math.round((usageVal / periodVal) * 10) / 10 : null);
    })();

    return () => { cancelled = true; };
  }, [selectedProduct, branchLogName]);

  if (!selectedProduct) return null;

  const isFav = (p: any) => (isFavourite ? isFavourite(p) : isYes(p[favouriteKey]));

  return (
    <div style={{ flexShrink: 0, marginBottom: "12px", paddingBottom: "0px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{ fontSize: "clamp(16px, 4.5vw, 22px)", fontWeight: 400, fontFamily: "Raleway, inherit", lineHeight: 1.3, color: "hsl(var(--foreground))", flex: 1 }}>
          {selectedProduct["PRODUCT NAME"]}
        </div>
        <button
          onClick={() => onToggleFav(selectedProduct)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
        >
          <Star
            size={16}
            fill={isFav(selectedProduct) ? "hsl(var(--foreground))" : "none"}
            color="hsl(var(--foreground))"
          />
        </button>
      </div>

      {(selectedProduct as any)[balanceKey] != null && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Balance</div>
          <div style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: Number((selectedProduct as any)[balanceKey]) <= 0 ? "hsl(0 70% 50%)" : "hsl(var(--foreground))" }}>
            {(selectedProduct as any)[balanceKey]}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
        <div>
          <div style={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Staff Price</div>
          <div style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
            {selectedProduct["STAFF PRICE"] != null ? `RM ${Number(selectedProduct["STAFF PRICE"]).toFixed(2)}` : "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Customer Price</div>
          <div style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
            {selectedProduct["CUSTOMER PRICE"] != null ? `RM ${Number(selectedProduct["CUSTOMER PRICE"]).toFixed(2)}` : "—"}
          </div>
        </div>
        <div />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginTop: "12px" }}>
        <div>
          <div style={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Usage</div>
          <div style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
            {usage ?? "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Period (WK)</div>
          <div style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
            {period ?? "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "11.5px", fontWeight: 700, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", marginBottom: "2px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Per/Week</div>
          <div style={{ fontSize: "16px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
            {perWeek ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
};
