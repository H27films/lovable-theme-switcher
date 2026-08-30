import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Search from "./Search";
import Order from "./Order";
import Office from "./Office";
import Boudoir from "@/pages/Boudoir";
import Chic from "@/pages/Chic";
import NurYadi from "@/pages/NurYadi";
import { X, Search as SearchIcon, Building2, ChevronDown, ChevronUp, Star, Home } from "lucide-react";
import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";

const hdrStyle: React.CSSProperties = {
  fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit",
  color: "hsl(var(--muted-foreground))", textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

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
  "BOUDOIR FAVOURITE": string | boolean | null;
  "CHIC NAILSPA FAVOURITE": string | boolean | null;
  "NUR YADI FAVOURITE": string | boolean | null;
}

import { useNavigate } from "react-router-dom";

const SubLanding = () => {
  const navigate = useNavigate();
  const { tablet } = useTabletMode();

  const [products, setProducts] = useState<OfficeProduct[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      let allData: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("AllFileProducts")
          .select("*")
          .range(from, from + batchSize - 1);
        if (error || !data?.length) break;
        allData = allData.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      setProducts(allData);
    };
    fetchProducts();
  }, []);

  const [activeSection, setActiveSection] = useState<"search" | "branches" | "order" | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<
    "at-menu" | "menu-leaving" | "section-entering" | "at-section" | "section-leaving" | "menu-entering"
  >("at-menu");

  const navigateTo = (section: "search" | "branches" | "order") => {
    setTransitionPhase("menu-leaving");
    setTimeout(() => {
      setActiveSection(section);
      setTransitionPhase("section-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-section")));
    }, 280);
  };

  const navigateBack = () => {
    setTransitionPhase("section-leaving");
    setTimeout(() => {
      setActiveSection(null);
      setTransitionPhase("menu-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-menu")));
    }, 280);
  };

  const navigateToBranch = (branch: "office" | "boudoir" | "chic" | "nuryadi") => {
    if (branch === "office") {
      navigate("/simple/office");
    } else {
      // Pass origin so the branch page's header title knows where to navigate back to
      navigate(`/simple/${branch}`, { state: { from: "sublanding" } });
    }
  };

  const navigateBackToBranches = () => {
    navigate("/simple/branches/admin");
  };

  const navigateBackToMain = () => {
    navigate("/");
  };

  const menuTransitionStyle: React.CSSProperties = {
    transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
    transform:
      transitionPhase === "menu-leaving" ? "translateX(-30%)" :
      transitionPhase === "menu-entering" ? "translateX(-30%)" : "translateX(0)",
    filter:
      transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? "blur(6px)" : "blur(0px)",
    opacity: transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? 0 : 1,
  };

  const sectionTransitionStyle: React.CSSProperties = {
    transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
    transform:
      transitionPhase === "section-entering" ? "translateX(30%)" :
      transitionPhase === "section-leaving" ? "translateX(30%)" : "translateX(0)",
    filter:
      transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? "blur(6px)" : "blur(0px)",
    opacity: transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? 0 : 1,
  };

  return (
    <div
      style={{
        minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
      }}
    >
      {/* Fixed Home button (top left) - only show on home menu */}
      <a
        href="/"
        aria-label="Go to main landing page"
        title="Home"
        style={{
          position: "fixed",
          left: "20px",
          top: "calc(env(safe-area-inset-top, 0px) + 24px)",
          zIndex: 60,
          display: activeSection !== null ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "hsl(var(--muted-foreground))",
          textDecoration: "none",
        }}
      >
        <Home size={18} strokeWidth={1.4} />
      </a>

      <div className="max-w-full mx-auto px-3">
        {/* Home Menu */}
        {activeSection === null && (
          <div style={{ position: "relative", minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh", overflow: "hidden", ...menuTransitionStyle }}>
            {/* Idle: 3 items centered */}
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: "12px",
              opacity: 1,
              // In tablet mode the zoomed page fills exactly the viewport, so
              // give the centered items a gentle lift so they sit slightly above centre.
              transform: tablet ? "translateY(-5dvh)" : "translateY(0)",
              transition: "opacity 0.38s ease, transform 0.38s ease",
              pointerEvents: "auto",
            }}>
              {(["BRANCHES", "SEARCH", "ORDER"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    if (item === "SEARCH") { navigateTo("search"); }
                    else if (item === "ORDER") { navigateTo("order"); }
                    else { navigate("/simple/branches"); }
                  }}
                  style={{
                    display: "block",
                    textAlign: "left",
                    padding: "2px 0",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "clamp(26px, 8vw, 44px)",
                    fontWeight: 300,
                    letterSpacing: "0.05em",
                    color: "hsl(var(--foreground))",
                    lineHeight: 1,
                    transition: "opacity 0.2s ease",
                    overflow: "hidden",
                    width: "100%",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.5")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <div style={{ display: "flex", alignItems: "baseline", whiteSpace: "nowrap" }}>
                    <span style={{ flexShrink: 0 }}>{item}</span>
                    <span style={{ fontSize: "clamp(26px, 8vw, 44px)", fontWeight: 300, letterSpacing: "0.05em", opacity: 0.07, marginLeft: "0.25em" }}>{item}</span>
                    <span style={{ fontSize: "clamp(26px, 8vw, 44px)", fontWeight: 300, letterSpacing: "0.05em", opacity: 0.05, marginLeft: "0.25em" }}>{item}</span>
                    <span style={{ fontSize: "clamp(26px, 8vw, 44px)", fontWeight: 300, letterSpacing: "0.05em", opacity: 0.03, marginLeft: "0.25em" }}>{item}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section pages */}
        {activeSection !== null && (
          <div style={sectionTransitionStyle}>
            {activeSection === "search" && <Search onBack={navigateBack} />}
            {activeSection === "order" && <Order onBack={navigateBack} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubLanding;