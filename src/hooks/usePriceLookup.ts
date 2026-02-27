import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export interface ProductRow {
  name: string;
  oldPrice: string;
  cnyPrice: string;
  officeStock: string;
  _isNew?: boolean;
}

export function usePriceLookup() {
  const [rate, setRate] = useState(1.77);
  const [data, setData] = useState<ProductRow[]>([]);
  const [overrideCNY, setOverrideCNY] = useState<Record<string, string>>({});
  const [overrideQty, setOverrideQty] = useState<Record<string, number>>({});
  const [newProducts, setNewProducts] = useState<Set<string>>(new Set());
  const [fullListHeaders, setFullListHeaders] = useState<string[]>([]);
  const [fullListData, setFullListData] = useState<string[][]>([]);
  const [saveFlash, setSaveFlash] = useState(false);

  // Load on mount
  useEffect(() => {
    const savedRate = localStorage.getItem("exchangeRate");
    if (savedRate) setRate(parseFloat(savedRate));

    // First load from localStorage instantly
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
        // Sort by Product Name alphabetically
        const sortedData = [...seen.values()].sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        setData(sortedData);
        if (payload.overrideCNY) setOverrideCNY(payload.overrideCNY);
        if (payload.overrideQty) setOverrideQty(payload.overrideQty);
      } catch {}
    }

    const np = localStorage.getItem("newProducts");
    const npSet = np ? new Set<string>(JSON.parse(np)) : new Set<string>();
    setNewProducts(npSet);

    const fh = localStorage.getItem("fullListHeaders");
    const fd = localStorage.getItem("fullListData");
    if (fh && fd) {
      setFullListHeaders(JSON.parse(fh));
      setFullListData(JSON.parse(fd));
    }

    // Then fetch from Supabase and override
    fetchFromSupabase();
    fetchFullListFromSupabase();
  }, []);

  const fetchFromSupabase = async () => {
    try {
      const { data: rows, error } = await supabase
        .from("Inputhalflist")
        .select("*");

      if (error) throw error;
      if (!rows || rows.length === 0) return;

      const products: ProductRow[] = rows.map((r: any) => ({
        name: r["Product Name"] || "",
        oldPrice: r["Old Price (RM)"] ? String(r["Old Price (RM)"]) : "",
        cnyPrice: r["China Price (CNY)"] ? String(r["China Price (CNY)"]) : "",
        officeStock: r["Office Stock"] ? String(r["Office Stock"]) : "0",
      }));

      // Sort by Product Name alphabetically
      products.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

      const newOverrides: Record<string, string> = {};
      const newQtyMap: Record<string, number> = {};

      rows.forEach((r: any) => {
        const name = r["Product Name"];
        if (name && r["New Price (CNY)"] && parseFloat(r["New Price (CNY)"]) > 0) {
          newOverrides[name] = parseFloat(r["New Price (CNY)"]).toFixed(2);
        }
        if (name && r["Order Qty"] && parseInt(r["Order Qty"]) > 0) {
          newQtyMap[name] = parseInt(r["Order Qty"]);
        }
      });

      setData(products);
      setOverrideCNY(newOverrides);
      setOverrideQty(newQtyMap);

      // Also save to localStorage as backup
      const np = new Set<string>();
      localStorage.setItem("priceLookupData", JSON.stringify({
        importedData: products,
        manualData: [],
        overrideCNY: newOverrides,
        overrideQty: newQtyMap
      }));
      setNewProducts(np);

    } catch (err) {
      console.error("Supabase fetch error:", err);
    }
  };

  const fetchFullListFromSupabase = async () => {
    try {
      const { data: rows, error } = await supabase
        .from("InputFullTable")
        .select("*");

      if (error) throw error;
      if (!rows || rows.length === 0) return;

      // Sort by Product Name alphabetically
      rows.sort((a: any, b: any) => {
        const aName = String(a["Product Name"] || "").toLowerCase();
        const bName = String(b["Product Name"] || "").toLowerCase();
        return aName.localeCompare(bName);
      });

      const headers = ["Product Name", "Old Price (RM)", "China Price (CNY)", "New Price (CNY)", "New Price (RM)", "Savings"];
      const rowData = rows.map((r: any) => [
        String(r["Product Name"] || ""),
        String(r["Old Price (RM)"] || ""),
        String(r["China Price (CNY)"] || ""),
        String(r["New Price (CNY)"] || ""),
        String(r["New Price (RM)"] || ""),
        String(r["Savings"] || ""),
      ]);

      setFullListHeaders(headers);
      setFullListData(rowData);

      // Also save to localStorage as backup
      localStorage.setItem("fullListHeaders", JSON.stringify(headers));
      localStorage.setItem("fullListData", JSON.stringify(rowData));

    } catch (err) {
      console.error("Supabase full list fetch error:", err);
    }
  };

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

  const persistData = useCallback((d: ProductRow[], oc: Record<string, string>, np: Set<string>, oq?: Record<string, number>) => {
    const importedData = d.filter(r => !np.has(r.name));
    const manualData = d.filter(r => np.has(r.name));
    localStorage.setItem("priceLookupData", JSON.stringify({ importedData, manualData, overrideCNY: oc, overrideQty: oq || {} }));
    localStorage.setItem("newProducts", JSON.stringify([...np]));
  }, []);

  const saveToSupabase = async (name: string, cny: string, qty: number, oldPrice: string, rate: number) => {
    try {
      const newRM = (parseFloat(cny) / rate).toFixed(2);
      const savings = (parseFloat(oldPrice) - parseFloat(newRM)).toFixed(2);
      const totalValue = (parseFloat(newRM) * qty).toFixed(2);

      await supabase
        .from("Inputhalflist")
        .update({
          "New Price (CNY)": parseFloat(cny),
          "New Price (RM)": parseFloat(newRM),
          "Savings": parseFloat(savings),
          "Order Qty": qty,
          "Order Value (RM)": parseFloat(totalValue),
        })
        .eq("Product Name", name);

    } catch (err) {
      console.error("Supabase save error:", err);
    }
  };

  const saveData = useCallback(async () => {
    // Save to localStorage
    persistData(data, overrideCNY, newProducts, overrideQty);
    
    // Save all products with prices to Supabase
    const savePromises = data.map(async (row) => {
      const cny = overrideCNY[row.name];
      const qty = overrideQty[row.name] || 0;
      
      if (cny && !isNaN(parseFloat(cny))) {
        await saveToSupabase(row.name, cny, qty, row.oldPrice, rate);
      }
    });
    
    await Promise.all(savePromises);
    
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 2000);
  }, [data, overrideCNY, newProducts, overrideQty, persistData, rate]);

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
    const effectiveQty = priceMode === "bundle" ? bundleQty : qty;
    const newQtyMap = { ...overrideQty, ...(effectiveQty > 0 ? { [name]: effectiveQty } : {}) };
    setOverrideCNY(newOverride);
    setOverrideQty(newQtyMap);
    persistData(data, newOverride, newProducts, newQtyMap);

    // Also save to Supabase
    const row = data.find(r => r.name === name);
    if (row) {
      saveToSupabase(name, storeCNY.toFixed(2), effectiveQty, row.oldPrice, rate);
    }
  }, [overrideCNY, overrideQty, data, newProducts, persistData, rate]);

  const clearPrice = useCallback(async (name: string) => {
    const newOverride = { ...overrideCNY };
    delete newOverride[name];
    const newQtyMap = { ...overrideQty };
    delete newQtyMap[name];
    setOverrideCNY(newOverride);
    setOverrideQty(newQtyMap);
    persistData(data, newOverride, newProducts, newQtyMap);
    
    // Also clear from Supabase
    try {
      await supabase
        .from("Inputhalflist")
        .update({
          "New Price (CNY)": null,
          "New Price (RM)": null,
          "Savings": null,
          "Order Qty": null,
          "Order Value (RM)": null,
        })
        .eq("Product Name", name);
    } catch (err) {
      console.error("Supabase clear error:", err);
    }
  }, [overrideCNY, overrideQty, data, newProducts, persistData]);

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
    const newRow: ProductRow = { name, oldPrice: finalRM.toFixed(2), cnyPrice: finalCNY.toFixed(2), officeStock: "0" };
    const newData = [...data, newRow];
    
    // Sort by Product Name alphabetically
    newData.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    
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
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", header: 1 }) as unknown[][];
      if (rows.length < 2) return;
      const dataRows = rows.slice(1);
      const newOverrides: Record<string, string> = {};
      const newQtyMap: Record<string, number> = {};
      const imported = dataRows.map(vals => {
        const name = String(vals[0] || "").trim();
        const newCNY = String(vals[3] || "").trim();
        const qty = parseInt(String(vals[6] || "0"), 10);
        if (name && newCNY && !isNaN(parseFloat(newCNY)) && parseFloat(newCNY) > 0) {
          newOverrides[name] = parseFloat(newCNY).toFixed(2);
        }
        if (name && qty > 0) {
          newQtyMap[name] = qty;
        }
        return {
          name,
          oldPrice: String(vals[1] || "").trim(),
          cnyPrice: String(vals[2] || "").trim(),
          officeStock: String(vals[8] || "0").trim(),
        };
      }).filter(r => r.name);
      
      // Sort by Product Name alphabetically
      imported.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      
      const np = new Set(newProducts);
      imported.forEach(r => np.delete(r.name));
      setData(imported);
      setOverrideCNY(newOverrides);
      setOverrideQty(newQtyMap);
      setNewProducts(np);
      persistData(imported, newOverrides, np, newQtyMap);
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
    const headers = ["Product Name", "Old Price (RM)", "China Price (CNY)", "New Price (CNY)", "New Price (RM)", "Savings (RM)", "Qty", "Total Value (RM)", "Office Stock"];
    const rows = data.map(row => {
      const cny = getRowCNY(row);
      const rm = cny ? toRM(cny) : null;
      const sav = rm ? getSavings(row.oldPrice, rm) : null;
      const qty = overrideQty[row.name] || 0;
      const totalRM = rm && qty > 0 ? (parseFloat(rm) * qty).toFixed(2) : "";
      return [row.name, row.oldPrice || "", row.cnyPrice || "", cny ? parseFloat(cny).toFixed(2) : "", rm || "", sav || "", qty > 0 ? qty : "", totalRM, row.officeStock || ""];
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 35 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 13 }, { wch: 8 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "New Product Prices");
    XLSX.writeFile(wb, "New Product Prices.xlsx");
  }, [data, getRowCNY, toRM, getSavings, overrideQty]);

  const updateFullListProduct = useCallback(async (productName: string, newCNY: string) => {
    const newCNYNum = parseFloat(newCNY);
    if (isNaN(newCNYNum)) return;

    const newRM = (newCNYNum / rate).toFixed(2);
    
    // Find the product in fullListData
    const productIndex = fullListData.findIndex(row => row[0] === productName);
    if (productIndex === -1) return;
    
    const oldRM = fullListData[productIndex][1];
    const savings = (parseFloat(oldRM) - parseFloat(newRM)).toFixed(2);

    // Update local data
    const updatedData = [...fullListData];
    updatedData[productIndex] = [
      productName,
      oldRM,
      updatedData[productIndex][2], // Keep China Price
      newCNYNum.toFixed(2),
      newRM,
      savings,
    ];
    
    setFullListData(updatedData);
    localStorage.setItem("fullListData", JSON.stringify(updatedData));

    // Save to Supabase
    try {
      await supabase
        .from("InputFullTable")
        .update({
          "New Price (CNY)": newCNYNum,
          "New Price (RM)": parseFloat(newRM),
          "Savings": parseFloat(savings),
        })
        .eq("Product Name", productName);
    } catch (err) {
      console.error("Supabase full list update error:", err);
    }
  }, [fullListData, rate]);

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
          case "qty":
            return ((overrideQty[a.name] || 0) - (overrideQty[b.name] || 0)) * dir;
          case "totalRM": {
            const aRM3 = aCNY ? parseFloat(aCNY) / rate : 0;
            const bRM3 = bCNY ? parseFloat(bCNY) / rate : 0;
            const aTotal = aRM3 * (overrideQty[a.name] || 0);
            const bTotal = bRM3 * (overrideQty[b.name] || 0);
            return (aTotal - bTotal) * dir;
          }
          case "officeStock":
            return ((parseFloat(a.officeStock) || 0) - (parseFloat(b.officeStock) || 0)) * dir;
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
    rate, data, overrideCNY, overrideQty, newProducts, fullListHeaders, fullListData, saveFlash,
    toRM, getSavings, getRowCNY, saveData, updateRate, commitPrice, clearPrice,
    removeProduct, addNewProduct, importExcel, importFullList, exportExcel, sortData, clearAllData,
    updateFullListProduct,
  };
}
