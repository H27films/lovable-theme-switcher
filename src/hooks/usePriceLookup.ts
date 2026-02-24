import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

export interface ProductRow {
  name: string;
  oldPrice: string;
  cnyPrice: string;
  _isNew?: boolean;
}

const SAMPLE_DATA: ProductRow[] = [
  { name: "Sample Product A", oldPrice: "12.50", cnyPrice: "22.10" },
  { name: "Sample Product B", oldPrice: "8.90", cnyPrice: "15.80" },
  { name: "Sample Product C", oldPrice: "34.00", cnyPrice: "60.20" },
];

export function usePriceLookup() {
  const [rate, setRate] = useState(1.77);
  const [data, setData] = useState<ProductRow[]>([]);
  const [overrideCNY, setOverrideCNY] = useState<Record<string, string>>({});
  const [newProducts, setNewProducts] = useState<Set<string>>(new Set());
  const [fullListHeaders, setFullListHeaders] = useState<string[]>([]);
  const [fullListData, setFullListData] = useState<string[][]>([]);
  const [saveFlash, setSaveFlash] = useState(false);

  // Load on mount
  useEffect(() => {
    const savedRate = localStorage.getItem("exchangeRate");
    if (savedRate) setRate(parseFloat(savedRate));

    const np = localStorage.getItem("newProducts");
    const npSet = np ? new Set<string>(JSON.parse(np)) : new Set<string>();
    setNewProducts(npSet);

    const raw = localStorage.getItem("priceLookupData");
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        let combined: ProductRow[] = [];
        if (payload.importedData !== undefined) {
          combined = [...(payload.importedData || []), ...(payload.manualData || [])];
        } else if (payload.data?.length) {
          combined = payload.data;
        }
        const seen = new Map<string, ProductRow>();
        combined.forEach((r: ProductRow) => seen.set(r.name, r));
        setData([...seen.values()]);
        if (payload.overrideCNY) setOverrideCNY(payload.overrideCNY);
      } catch {}
    } else {
      setData(SAMPLE_DATA);
    }

    const fh = localStorage.getItem("fullListHeaders");
    const fd = localStorage.getItem("fullListData");
    if (fh && fd) {
      setFullListHeaders(JSON.parse(fh));
      setFullListData(JSON.parse(fd));
    }
  }, []);

  const toRM = useCallback((cny: string | number) => {
    const v = parseFloat(String(cny));
    return isNaN(v) ? null : (v / rate).toFixed(2);
  }, [rate]);

  const getSavings = useCallback((oldRM: string, newRM: string) => {
    const o = parseFloat(oldRM), n = parseFloat(newRM);
    return (isNaN(o) || isNaN(n)) ? null : (o - n).toFixed(2);
  }, []);

  const getRowCNY = useCallback((row: ProductRow) => {
    return overrideCNY[row.name] !== undefined ? overrideCNY[row.name] : "";
  }, [overrideCNY]);

  const persistData = useCallback((d: ProductRow[], oc: Record<string, string>, np: Set<string>) => {
    const importedData = d.filter(r => !np.has(r.name));
    const manualData = d.filter(r => np.has(r.name));
    localStorage.setItem("priceLookupData", JSON.stringify({ importedData, manualData, overrideCNY: oc }));
    localStorage.setItem("newProducts", JSON.stringify([...np]));
  }, []);

  const saveData = useCallback(() => {
    persistData(data, overrideCNY, newProducts);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }, [data, overrideCNY, newProducts, persistData]);

  const updateRate = useCallback((newRate: number) => {
    if (!isNaN(newRate) && newRate > 0) {
      setRate(newRate);
      localStorage.setItem("exchangeRate", String(newRate));
    }
  }, []);

  const commitPrice = useCallback((name: string, cnyValue: string, priceMode: "unit" | "bundle", bundleQty: number, delivery: number, qty: number) => {
    let storeCNY = parseFloat(cnyValue);
    if (priceMode === "bundle" && bundleQty > 0) storeCNY = storeCNY / bundleQty;
    if (delivery > 0 && qty > 0) storeCNY = storeCNY + (delivery / qty);
    const newOverride = { ...overrideCNY, [name]: storeCNY.toFixed(2) };
    setOverrideCNY(newOverride);
    persistData(data, newOverride, newProducts);
  }, [overrideCNY, data, newProducts, persistData]);

  const clearPrice = useCallback((name: string) => {
    const newOverride = { ...overrideCNY };
    delete newOverride[name];
    setOverrideCNY(newOverride);
  }, [overrideCNY]);

  const removeProduct = useCallback((name: string) => {
    const newData = data.filter(r => r.name !== name);
    const newOverride = { ...overrideCNY };
    delete newOverride[name];
    const np = new Set(newProducts);
    np.delete(name);
    setData(newData);
    setOverrideCNY(newOverride);
    setNewProducts(np);
    persistData(newData, newOverride, np);
  }, [data, overrideCNY, newProducts, persistData]);

  const addNewProduct = useCallback((name: string, finalCNY: number) => {
    const finalRM = finalCNY / rate;
    const newRow: ProductRow = { name, oldPrice: finalRM.toFixed(2), cnyPrice: finalCNY.toFixed(2) };
    const newData = [...data, newRow];
    const newOverride = { ...overrideCNY, [name]: finalCNY.toFixed(2) };
    const np = new Set(newProducts);
    np.add(name);
    setData(newData);
    setOverrideCNY(newOverride);
    setNewProducts(np);
    persistData(newData, newOverride, np);
  }, [data, overrideCNY, newProducts, rate, persistData]);

  const importExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const imported = (rows as Record<string, unknown>[]).map(r => {
        const vals = Object.values(r);
        return {
          name: String(vals[0] || "").trim(),
          oldPrice: String(vals[1] || "").trim(),
          cnyPrice: String(vals[2] || "").trim(),
        };
      }).filter(r => r.name);
      const np = new Set(newProducts);
      imported.forEach(r => np.delete(r.name));
      setData(imported);
      setOverrideCNY({});
      setNewProducts(np);
      persistData(imported, {}, np);
    };
    reader.readAsArrayBuffer(file);
  }, [newProducts, persistData]);

  const importFullList = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, unknown>[];
      if (!rows.length) return;
      const headers = Object.keys(rows[0]);
      const rowData = rows.map(r => Object.values(r).map(v => String(v).trim()));
      setFullListHeaders(headers);
      setFullListData(rowData);
      localStorage.setItem("fullListHeaders", JSON.stringify(headers));
      localStorage.setItem("fullListData", JSON.stringify(rowData));
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const exportExcel = useCallback(() => {
    const headers = ["Product Name", "Old Price (RM)", "China Price (CNY)", "New Price (CNY)", "New Price (RM)", "Savings (RM)"];
    const rows = data.map(row => {
      const cny = getRowCNY(row);
      const rm = cny ? toRM(cny) : null;
      const sav = rm ? getSavings(row.oldPrice, rm) : null;
      return [row.name, row.oldPrice || "", row.cnyPrice || "", cny ? parseFloat(cny).toFixed(2) : "", rm || "", sav || ""];
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 35 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 13 }];
    XLSX.utils.book_append_sheet(wb, ws, "New Product Prices");
    XLSX.writeFile(wb, "New Product Prices.xlsx");
  }, [data, getRowCNY, toRM, getSavings]);

  const sortData = useCallback((col: string, dir: number) => {
    setData(prev => {
      const sorted = [...prev].sort((a, b) => {
        const aCNY = overrideCNY[a.name] || "";
        const bCNY = overrideCNY[b.name] || "";
        switch (col) {
          case "name":
            return a.name.toLowerCase() < b.name.toLowerCase() ? -dir : a.name.toLowerCase() > b.name.toLowerCase() ? dir : 0;
          case "oldPrice":
            return ((parseFloat(a.oldPrice) || 0) - (parseFloat(b.oldPrice) || 0)) * dir;
          case "cnyPrice":
            return ((parseFloat(a.cnyPrice) || 0) - (parseFloat(b.cnyPrice) || 0)) * dir;
          case "newCNY":
            return ((parseFloat(aCNY) || 0) - (parseFloat(bCNY) || 0)) * dir;
          case "newRM": {
            const aRM = aCNY ? parseFloat(aCNY) / rate : 0;
            const bRM = bCNY ? parseFloat(bCNY) / rate : 0;
            return (aRM - bRM) * dir;
          }
          case "savings": {
            const aRM2 = aCNY ? parseFloat(aCNY) / rate : 0;
            const bRM2 = bCNY ? parseFloat(bCNY) / rate : 0;
            const aSav = aCNY ? parseFloat(a.oldPrice) - aRM2 : -Infinity;
            const bSav = bCNY ? parseFloat(b.oldPrice) - bRM2 : -Infinity;
            return (aSav - bSav) * dir;
          }
          default: return 0;
        }
      });
      return sorted;
    });
  }, [overrideCNY, rate]);

  const clearAllData = useCallback(() => {
    localStorage.removeItem("priceLookupData");
    localStorage.removeItem("newProducts");
    setData([]);
    setOverrideCNY({});
    setNewProducts(new Set());
  }, []);

  return {
    rate, data, overrideCNY, newProducts, fullListHeaders, fullListData, saveFlash,
    toRM, getSavings, getRowCNY, saveData, updateRate, commitPrice, clearPrice,
    removeProduct, addNewProduct, importExcel, importFullList, exportExcel, sortData, clearAllData,
  };
}
