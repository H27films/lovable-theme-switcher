import React from "react";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X } from "lucide-react";

interface BoudoirUsageTableProps {
  activePanel: "USAGE" | "ORDER" | "CASH" | null;
  setActivePanel: (panel: "USAGE" | "ORDER" | "CASH" | null) => void;
  products: any[];
  isFav: (p: any) => boolean;
  usageSearch: string;
  setUsageSearch: React.Dispatch<React.SetStateAction<string>>;
  showUsageDropdown: boolean;
  setShowUsageDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  usageInputRef: React.RefObject<HTMLInputElement>;
  onBack: () => void;
}

export const BoudoirUsageTable = ({
  activePanel,
  setActivePanel,
  products,
  isFav,
  usageSearch,
  setUsageSearch,
  showUsageDropdown,
  setShowUsageDropdown,
  usageInputRef,
  onBack,
}: BoudoirUsageTableProps) => {
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
  const [searchMode, setSearchMode] = React.useState<"idle" | "active" | "result">("idle");
  const [usageEntries, setUsageEntries] = React.useState<any[]>([]);
  const [usageSearchLocal, setUsageSearchLocal] = React.useState("");
  const [showUsageDropdownLocal, setShowUsageDropdownLocal] = React.useState(false);

  // Keep local state in sync with parent
  React.useEffect(() => {
    setUsageSearchLocal(usageSearch);
    setShowUsageDropdownLocal(showUsageDropdown);
  }, [usageSearch, showUsageDropdown]);

  const toggleFavourite = async (product: any) => {
    const currentlyFav = isFav(product);
    const newVal = !currentlyFav;
    // TODO: supabase update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, "BOUDOIR FAVOURITE": newVal } : p));
    setSelectedProduct(prev => prev && prev.id === product.id ? { ...prev, "BOUDOIR FAVOURITE": newVal } : prev);
  };

  const sortLog = (rows: any[]) => [...rows].sort((a, b) => {
    const dateDiff = b.DATE.localeCompare(a.DATE);
    if (dateDiff !== 0) return dateDiff;
    const aOrder = a.TYPE === "Order" ? 0 : 1;
    const bOrder = b.TYPE === "Order" ? 0 : 1;
    return aOrder - bOrder;
  });

  // ... rest of usage table logic would go here
  // For now, simplified rendering

  return (
    <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px" }}>
      {usageEntries.length === 0 && (
        <div style={{ paddingTop: "24px", fontSize: "13px", fontWeight: 300, color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>
          Select a product above to add it
        </div>
      )}

      {usageEntries.map((entry) => (
        <div key={entry.id} style={{ paddingTop: "12px", paddingBottom: "12px", borderBottom: "0.5px solid hsl(var(--border))" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: "10px", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }>{entry.productName}</span>
              <span style={{ fontSize: "17px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--green, 120 60% 40%))", flexShrink: 0 }>{entry.projectedBalance}</span>
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
              <button
                onClick={() => setUsageEntries(prev => prev.map(e => e.id === entry.id ? { ...e, qty: Math.max(1, e.qty - 1) } : e))}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", color: "hsl(var(--muted-foreground))" }}
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }>{entry.starting + entry.qty}</div>
          </div>
        </div>
      ))}
    </div>
  );
};