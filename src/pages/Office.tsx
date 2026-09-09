import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSlideExit, useSlideEnter, slideExitStyle } from "@/hooks/useSlideTransition";
import Sync from "@/components/office/Sync";
import OfficeLogTable from "@/components/office/OfficeLogTable";
import { SalesPanel } from "@/components/office/sales/SalesPanel";
import { OfficeHeader } from "@/components/office/OfficeHeader";
import { BottomNavOffice } from "@/components/office/BottomNavOffice";

interface OfficeProduct {
  id: number;
  "PRODUCT NAME": string;
  "SUPPLIER": string | null;
  "SUPPLIER PRICE": number | null;
  "BRANCH PRICE": number | null;
  "STAFF PRICE": number | null;
  "CUSTOMER PRICE": number | null;
  "OFFICE BALANCE": number | null;
  "OFFICE SECTION": string | null;
  "UNITS/ORDER": number | null;
  "BOUDOIR BALANCE": number | null;
  "CHIC NAILSPA BALANCE": number | null;
  "NUR YADI BALANCE": number | null;
  "Colour": string | null;
  "OFFICE FAVOURITE": string | null;
  "PAR": number | null;
}

interface OfficeProps {
  onBack?: () => void;
  onBackToMain?: () => void;
  products?: OfficeProduct[];
}

const hdrStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "#000000", textTransform: "uppercase",
  letterSpacing: "0.08em",
};


const Office = ({ onBack, onBackToMain, products = [] }: OfficeProps) => {
  const { exiting, slideTo } = useSlideExit();
  const enterStyle = useSlideEnter();
  const location = useLocation();
  // ── SYNC PANEL STATE ────────────────────────────────────
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showSalesPanel, setShowSalesPanel] = useState(false);
  // The bottom nav is hidden while the Sales panel is open: swipe up from the
  // bottom edge of the screen to reveal it, swipe down to hide it again.
  const [salesNavVisible, setSalesNavVisible] = useState(false);
  const salesNavSwipe = useRef<{ startY: number } | null>(null);
  useEffect(() => {
    if (!showSalesPanel) { setSalesNavVisible(false); return; }
    const EDGE_ZONE = 64;  // gesture only starts within this many px of the screen bottom
    const THRESHOLD = 36;  // swipe distance (px) needed to toggle the nav
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      salesNavSwipe.current = t.clientY > window.innerHeight - EDGE_ZONE ? { startY: t.clientY } : null;
    };
    const onMove = (e: TouchEvent) => {
      const start = salesNavSwipe.current;
      if (!start) return;
      const dy = start.startY - e.touches[0].clientY; // positive = swiping up
      if (dy > THRESHOLD && !salesNavVisible) { setSalesNavVisible(true); salesNavSwipe.current = null; }
      else if (dy < -THRESHOLD && salesNavVisible) { setSalesNavVisible(false); salesNavSwipe.current = null; }
    };
    const opts = { capture: true, passive: true };
    window.addEventListener("touchstart", onStart, opts);
    window.addEventListener("touchmove", onMove, opts);
    return () => {
      window.removeEventListener("touchstart", onStart, opts);
      window.removeEventListener("touchmove", onMove, opts);
    };
  }, [showSalesPanel, salesNavVisible]);

  // Open Sales / Sync directly when returning from the Order / Search pages via
  // the bottom nav — they slide back here with { openPanel } router state.
  useEffect(() => {
    const openPanel = (location.state as { openPanel?: string } | null)?.openPanel;
    if (openPanel === "sales") setShowSalesPanel(true);
    else if (openPanel === "sync") setShowSyncPanel(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const BRANCH_NAME = "OFFICE";

  // ── Local products (synced from prop, refreshed after order) ─
  const [localProducts, setLocalProducts] = useState<OfficeProduct[]>(products);
  useEffect(() => { setLocalProducts(products ?? []); }, [products]);

  const refreshLocalProducts = async () => {
    let allData: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await (supabase as any)
        .from("AllFileProducts").select("*").range(from, from + 999);
      if (error || !data?.length) break;
      allData = allData.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    setLocalProducts(allData);
  };

  // Standalone route: no products prop provided → load them here
  useEffect(() => {
    if (!products || products.length === 0) refreshLocalProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Log table refresh trigger ────────────────────────────────
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);

  const dim: React.CSSProperties = { color: "hsl(var(--muted-foreground))" };


  return (
    <div style={{
      height: "100dvh", background: "linear-gradient(to bottom, hsl(38 30% 92%) 0%, hsl(var(--background)) 48px)", color: "hsl(var(--foreground))",
      fontFamily: "'Raleway', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden",
      ...enterStyle,
      ...slideExitStyle(exiting),
    }}>

            {/* ── TOP AREA ── */}
            <div style={{ paddingLeft: "12px", paddingRight: "12px", paddingTop: "12px", flexShrink: 0 }}>

{/* Branch name header row */}
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
  <button
    onClick={() => slideTo("/simple/admin", undefined, "back")}
    style={{
      display: "block", fontSize: "clamp(22px, 6vw, 36px)", fontWeight: 300,
      letterSpacing: "0.08em", color: "hsl(var(--foreground))",
      background: "none", border: "none", cursor: "pointer", textAlign: "left",
      padding: 0, fontFamily: "Raleway, inherit", lineHeight: 1,
    }}
  >
    {BRANCH_NAME}
  </button>
  <OfficeHeader onOpenSync={() => setShowSyncPanel(true)} />
</div>


        </div> 
        
      {/* ── MIDDLE — bounded flex box that stops just short of the floating
          bottom nav (nav top = safe-area + 66px; the 70px clearance leaves the
          same ~4px gap the branch log table uses), so the log table scrolls
          inside this region and never renders behind the nav pill ── */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", paddingLeft: "12px", paddingRight: "12px", paddingTop: "4px", marginBottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)" }}>

        {/* ══ SEARCH + RECENT ══════════════════════════════════════ */}
        <>

            

            {/* ══ LOG TABLE ══════════════════════════════════════════════ */}
            <OfficeLogTable
              refreshTrigger={logRefreshTrigger}
            />


        </>
      </div>

        {/* ══ SALES PANEL OVERLAY ══════════════════════════════════ */}
        {showSalesPanel && (
          <SalesPanel onClose={() => setShowSalesPanel(false)} />
        )}

        {/* ═ SYNC PANEL ══════════════════════════════ */}
        {showSyncPanel && (
          <Sync
            onClose={() => setShowSyncPanel(false)}
            onImported={() => setLogRefreshTrigger(prev => prev + 1)}
            onProductsUpdated={refreshLocalProducts}
          />
        )}

        {/* ── BOTTOM NAV (Home / Order / Sales / Search / Admin Portal) ── */}
        <BottomNavOffice
          active={showSalesPanel ? "sales" : "home"}
          hidden={showSalesPanel && !salesNavVisible}
          onSelect={(key) => {
            if (key === "home") { setShowSalesPanel(false); setShowSyncPanel(false); }
            else if (key === "order") slideTo("/simple/order", { from: "office" }, "forward");
            else if (key === "sales") setShowSalesPanel(v => !v);
            else if (key === "search") slideTo("/simple/search", { from: "office" }, "forward");
            else if (key === "admin") slideTo("/simple/admin", undefined, "back");
          }}
        />

    </div>
  );
};

export default Office;