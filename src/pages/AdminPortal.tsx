import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";
import {
  ArrowLeft,
  Building2,
  Sparkles,
  Scissors,
  User,
  ChevronRight,
  Search as SearchIcon,
  ClipboardList,
} from "lucide-react";
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
    { label: "Office",   key: "office"  as const, icon: <Building2 size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Boudoir",  key: "boudoir" as const, icon: <Sparkles  size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Chic",     key: "chic"    as const, icon: <Scissors  size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Nur Yadi", key: "nuryadi" as const, icon: <User      size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
  ];

  const handleBranch = (key: "office" | "boudoir" | "chic" | "nuryadi") => {
    if (key === "office") {
      navigate("/simple/office");
    } else {
      navigate(`/simple/${key}`, { state: { from: "adminportal" } });
    }
  };

  const pillRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    height: "48px",
    background: "hsl(38 25% 92%)",
    borderRadius: "9999px",
    padding: "0 16px 0 10px",
    cursor: "pointer",
    transition: "background 0.15s ease, transform 0.15s ease",
  };

  const actionPanel: React.CSSProperties = {
    width: "100%",
    maxWidth: "420px",
    margin: "0 auto",
    background: "#1a1a1a",
    borderRadius: "22px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  };

  const actionRow: React.CSSProperties = {
    height: "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    cursor: "pointer",
    transition: "opacity 0.15s ease, transform 0.15s ease",
  };

  return (
    <div
      style={{
        minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "'Raleway', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Admin Portal label */}
      <div
        style={{
          position: "fixed",
          left: "20px",
          top: "calc(env(safe-area-inset-top, 0px) + 24px)",
          zIndex: 60,
          display: activeSection !== null ? "none" : "block",
          fontSize: "13px",
          fontWeight: 400,
          color: "rgba(0,0,0,0.28)",
          letterSpacing: "0.02em",
        }}
      >
        Admin Portal
      </div>

      {/* Back arrow */}
      <a
        href="/"
        aria-label="Go to main landing page"
        style={{
          position: "fixed",
          right: "20px",
          top: "calc(env(safe-area-inset-top, 0px) + 20px)",
          zIndex: 60,
          display: activeSection !== null ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "hsl(var(--muted-foreground))",
          textDecoration: "none",
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <ArrowLeft size={26} strokeWidth={1.4} />
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
            padding: "54px 14px 14px",
            transform: tablet ? "translateY(-5dvh)" : "translateY(0)",
            ...menuTransitionStyle,
          }}
        >
          {/* Main transparent box */}
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              minHeight: tablet ? "86dvh" : "calc(100dvh - 70px)",
              margin: "0 auto",
              background: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: "32px",
              padding: "22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 4px 30px rgba(0,0,0,0.10)",
            }}
          >
            {/* ── BRANCHES ── */}
            <div>
              <p style={{
                fontSize: "16px",
                fontWeight: 500,
                letterSpacing: "0.01em",
                color: "#000000",
                margin: "0 0 12px 4px",
                fontFamily: "'Raleway', sans-serif",
              }}>
                Branches.
              </p>

              {branches.map(({ label, key, icon }, i) => (
                <div
                  key={key}
                  onClick={() => handleBranch(key)}
                  style={{
                    ...pillRow,
                    marginBottom: i < branches.length - 1 ? "10px" : "0",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "hsl(38 22% 88%)";
                    e.currentTarget.style.transform = "scale(1.01)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "hsl(38 25% 92%)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginRight: "12px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    {icon}
                  </div>

                  <span style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "rgb(50,45,40)",
                    fontFamily: "'Raleway', sans-serif",
                    letterSpacing: "0.01em",
                  }}>
                    {label}
                  </span>

                  <ChevronRight size={15} style={{ marginLeft: "auto", color: "rgba(0,0,0,0.25)" }} />
                </div>
              ))}
            </div>

            {/* ── SEARCH & ORDER PANEL ── */}
            <div
              style={{
                ...actionPanel,
                marginTop: "auto",
                paddingTop: "18px",
              }}
            >
              <div
                onClick={() => navigateTo("search")}
                style={actionRow}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = "0.75";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <SearchIcon size={17} color="#ffffff" strokeWidth={1.6} />
                <span style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "#ffffff",
                  fontFamily: "'Raleway', sans-serif",
                  letterSpacing: "0.01em",
                }}>
                  Search
                </span>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", margin: "0 16px" }} />

              <div
                onClick={() => navigateTo("order")}
                style={actionRow}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = "0.75";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <ClipboardList size={17} color="#ffffff" strokeWidth={1.6} />
                <span style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "#ffffff",
                  fontFamily: "'Raleway', sans-serif",
                  letterSpacing: "0.01em",
                }}>
                  Order
                </span>
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
