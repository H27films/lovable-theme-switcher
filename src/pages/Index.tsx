import { useState, useCallback } from "react";
import { usePriceLookup, type ProductRow } from "@/hooks/usePriceLookup";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import PriceTable from "@/components/PriceTable";
import NewProductPanel from "@/components/NewProductPanel";
import FullListPanel from "@/components/FullListPanel";
import OrderListPanel from "@/components/OrderListPanel";
import { Lock, Plus, ArrowRight, FileText } from "lucide-react";

const Index = () => {
  const { theme, toggle } = useTheme();
  const store = usePriceLookup();
  const [selectedRow, setSelectedRow] = useState<ProductRow | null>(null);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [fullListOpen, setFullListOpen] = useState(false);
  const [orderListOpen, setOrderListOpen] = useState(false);

  const handleSelectProduct = useCallback((row: ProductRow) => {
    setSelectedRow(row);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCommit = useCallback((name: string, cnyValue: string, mode: "unit" | "bundle", bundleQty: number, delivery: number, qty: number) => {
    store.commitPrice(name, cnyValue, mode, bundleQty, delivery, qty);
  }, [store]);

  const handleDone = useCallback(() => {
    setSelectedRow(null);
  }, []);

  const handleRateConfirm = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) store.updateRate(val);
    setEditingRate(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-16">
      {/* Top bar */}
      <div className="w-full max-w-[760px] flex justify-between items-start mb-16">
        <div>
          <div className="flex items-center gap-5 mb-1.5">
            <h1 className="text-[11px] font-normal tracking-[0.2em] uppercase text-dim">
              Boudoir Product Database
            </h1>
            <ThemeToggle theme={theme} toggle={toggle} />
          </div>
          <p className="text-[28px] font-light tracking-tight">Price Lookup</p>
          <p className="text-2xl font-light tracking-tight text-foreground mt-1">
            1 RM = ¥
            {editingRate ? (
              <input
                type="number"
                step="0.01"
                className="minimal-input inline text-2xl font-light w-[70px] py-0"
                value={rateInput}
                autoFocus
                onChange={e => setRateInput(e.target.value)}
                onBlur={handleRateConfirm}
                onKeyDown={e => e.key === "Enter" && handleRateConfirm()}
              />
            ) : (
              <span
                className="cursor-pointer border-b border-border-active hover:border-foreground transition-colors"
                onClick={() => { setEditingRate(true); setRateInput(String(store.rate)); }}
              >
                {store.rate.toFixed(2)}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2.5 mt-2">
          <span className="nav-link" onClick={() => setNewProductOpen(true)}>New Product &nbsp;<Plus size={13} className="inline -mt-0.5" /></span>
          <span className="nav-link" onClick={() => setFullListOpen(true)}>Full Product List &nbsp;<ArrowRight size={13} className="inline -mt-0.5" /></span>
          <span className="nav-link" onClick={() => setOrderListOpen(true)}>Order List &nbsp;<FileText size={13} className="inline -mt-0.5" /></span>
          <span className={`nav-link ${store.saveFlash ? "!text-green" : ""}`} onClick={store.saveData}>
            {store.saveFlash ? "✓ Saved" : "Save"} &nbsp;<Lock size={13} className="inline -mt-0.5" />
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="w-full max-w-[760px]">
        <SearchBar data={store.data} onSelect={handleSelectProduct} />
        <ResultCard
          row={selectedRow}
          rate={store.rate}
          getRowCNY={store.getRowCNY}
          toRM={store.toRM}
          getSavings={store.getSavings}
          onCommit={handleCommit}
          onDone={handleDone}
          onDelete={store.removeProduct}
        />
      </div>

      <PriceTable
        data={store.data}
        rate={store.rate}
        overrideCNY={store.overrideCNY}
        overrideQty={store.overrideQty}
        newProducts={store.newProducts}
        onRowClick={handleSelectProduct}
        onClearPrice={store.clearPrice}
        onRemoveProduct={store.removeProduct}
        onSort={store.sortData}
        onImport={store.importExcel}
        onClearAll={store.clearAllData}
        onExport={store.exportExcel}
        expanded={!!selectedRow}
      />

      <NewProductPanel open={newProductOpen} onClose={() => setNewProductOpen(false)} rate={store.rate} onAdd={store.addNewProduct} />
      <FullListPanel open={fullListOpen} onClose={() => setFullListOpen(false)} headers={store.fullListHeaders} data={store.fullListData} onImport={store.importFullList} onUpdate={store.updateFullListProduct} onClear={store.clearFullListProduct} rate={store.rate} />
      <OrderListPanel open={orderListOpen} onClose={() => setOrderListOpen(false)} data={store.data} overrideCNY={store.overrideCNY} overrideQty={store.overrideQty} rate={store.rate} onSelectProduct={(row) => { handleSelectProduct(row); setOrderListOpen(false); }} />
    </div>
  );
};

export default Index;
