import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";
import { Home, Building2, Sparkles, Scissors, User, Search as SearchIcon, ClipboardList, ChevronRight } from "lucide-react";
import Search from "./Search";
import Order from "./Order";

const AdminPortal = () => {
  const navigate = useNavigate();
  const { tablet } = useTabletMode();

  const [activeSection, setActiveSection] = useState<"search" | "order" | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<
    "at-menu" | "menu-leaving" | "section-entering" | "at-section" | "section-leaving" | "menu-entering"
  >("at-menu");

  const navigateTo = (section: "search" | "order") => {
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

  const branches = [
    { label: "Office",   key: "office"   as const, icon: <Building2 size={15} color="rgb(110,110,110)" strokeWidth={1.5} /> },
    { label: "Boudoir",  key: "boudoir"  as const, icon: <Sparkles   size={15} color="rgb(110,110,110)" strokeWidth={1.5} /> },
    { label: "Chic",     key: "chic"     as const, icon: <Scissors   size={15} color="rgb(110,110,110)" strokeWidth={1.5} /> },
    { label: "Nur Yadi", key: "nuryadi"  as const, icon: <User       size={15} color="rgb(110,110,110)" strokeWidth={1.5} /> },
  ];

  const handleBranch = (key: "office" | "boudoir" | "chic" | "nuryadi") => {
    if (key === "office") {
      navigate("/simple/office");
    } else {
      navigate(`/simple/${key}`, { state: { from: "adminportal" } });
    }
  };

  // Pill row style — fully rounded, light grey, exactly like the email/password rows
  const pillRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    height: "54px",
    background: "rgba(255,255,255,0.55)",
    borderRadius: "9999px",          // ← fully pill-shaped, not square corners
    padding: "0 14px 0 8px",
    border: "1px solid rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "background 0.15s ease",
  };

  return (
    <div
      style={{
        minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "'Raleway', sans-serif",
        position: "relative",
      }}
    >
      {/* Home button */}
      <a
        href="/"
        aria-label="Go to main landing page"
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

      {/* Main menu */}
      {activeSection === null && (
        <div
          style={{
            minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "stretch",
            padding: "0 20px",
            transform: tablet ? "translateY(-5dvh)" : "translateY(0)",
            ...menuTransitionStyle,
          }}
        >
          <div style={{ width: "100%", maxWidth: "400px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* ── BRANCHES CARD — white card, pill rows inside ── */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "16px",
                boxShadow: "0 2px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              {branches.map(({ label, key, icon }, i) => (
                <div
                  key={key}
                  onClick={() => handleBranch(key)}
                  style={{
                    ...pillRow,
                    marginBottom: i < branches.length - 1 ? "10px" : "0",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.55)")}
                >
                  {/* White circle — exactly like the email/password icon circle */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginRight: "12px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                    }}
                  >
                    {icon}
                  </div>

                  <span style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "rgb(50,50,50)",
                    fontFamily: "'Raleway', sans-serif",
                    letterSpacing: "0.01em",
                  }}>
                    {label}
                  </span>

                  <ChevronRight size={14} style={{ marginLeft: "auto", color: "rgba(0,0,0,0.2)" }} />
                </div>
              ))}
            </div>

            {/* ── SEARCH & ORDER — dark card, exactly like "New in / C.Lab Joints" ── */}
            <div
              style={{
                background: "#1e1e1e",
                borderRadius: "28px",
                padding: "22px 24px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              {/* SEARCH — styled like "New in" block */}
              <div
                onClick={() => navigateTo("search")}
                style={{ cursor: "pointer", padding: "4px 0 12px", transition: "opacity 0.15s ease" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    {/* "New in" equivalent */}
                    <h3 style={{
                      fontSize: "22px",
                      fontWeight: 500,
                      color: "#ffffff",
                      margin: "0 0 2px 0",
                      fontFamily: "'Raleway', sans-serif",
                      lineHeight: 1.1,
                    }}>
                      Search
                    </h3>
                    {/* "C.Lab Joints" equivalent */}
                    <p style={{
                      fontSize: "15px",
                      color: "rgba(255,255,255,0.4)",
                      margin: 0,
                      fontFamily: "'Raleway', sans-serif",
                    }}>
                      Find products across branches
                    </p>
                  </div>
                  {/* "Discover" equivalent */}
                  <span style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.02em",
                  }}>
                    Open
                  </span>
                </div>
              </div>

              {/* Thin divider */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "0 0 12px 0" }} />

              {/* ORDER — same layout */}
              <div
                onClick={() => navigateTo("order")}
                style={{ cursor: "pointer", padding: "4px 0 0", transition: "opacity 0.15s ease" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <h3 style={{
                      fontSize: "22px",
                      fontWeight: 500,
                      color: "#ffffff",
                      margin: "0 0 2px 0",
                      fontFamily: "'Raleway', sans-serif",
                      lineHeight: 1.1,
                    }}>
                      Order
                    </h3>
                    <p style={{
                      fontSize: "15px",
                      color: "rgba(255,255,255,0.4)",
                      margin: 0,
                      fontFamily: "'Raleway', sans-serif",
                    }}>
                      Place and manage orders
                    </p>
                  </div>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.02em",
                  }}>
                    Open
                  </span>
                </div>
              </div>
            </div>

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
  );
};

export default AdminPortal;