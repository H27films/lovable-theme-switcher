import { useNavigate } from "react-router-dom";
import { useTheme, type Theme, type Font } from "@/hooks/useTheme";
import React, { useState, useEffect } from "react";
import { Moon, Sun, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Brush-stroke underline SVG
const _brushSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1418 125"><path d="M1412.29 72.17c-11.04-5.78-20.07-14.33-85.46-25.24-22.37-3.63-44.69-7.56-67.07-11.04-167.11-22.06-181.65-21.24-304.94-30.56C888.78 1.39 822.57 1.1 756.44 0c-46.63-.11-93.27 1.56-139.89 2.5C365.5 13.55 452.86 7.68 277.94 23.15 202.57 33.32 127.38 45.01 52.07 55.69c-11.23 2.41-22.63 4.17-33.71 7.22C6.1 66.33 5.64 66.19 3.89 67.79c-7.99 5.78-2.98 20.14 8.72 17.5 33.99-9.47 32.28-8.57 178.06-29.66 4.26 4.48 7.29 3.38 18.42 3.11 13.19-.32 26.38-.53 39.56-1.12 53.51-3.81 106.88-9.62 160.36-13.95 18.41-1.3 36.8-3.12 55.21-4.7 23.21-1.16 46.43-2.29 69.65-3.4 120.28-2.16 85.46-3.13 234.65-1.52 23.42.99 1.57-.18 125.72 6.9 96.61 8.88 200.92 27.94 295.42 46.12 40.87 7.91 116.67 23.2 156.31 36.78 3.81 1.05 8.28-.27 10.51-3.58 3.17-3.72 2.66-9.7-.78-13.13-3.25-3.12-8.14-3.44-12.18-5.08-17.89-5.85-44.19-12.09-63.67-16.56l26.16 3.28c23.02 3.13 46.28 3.92 69.34 6.75 10.8.96 25.43 1.81 34.34-4.39 2.26-1.54 4.86-2.75 6.21-5.27 2.76-4.59 1.13-11.06-3.59-13.68ZM925.4 23.77c37.64 1.4 153.99 10.85 196.64 14.94 45.95 5.51 91.89 11.03 137.76 17.19 24.25 4.77 74.13 11.21 101.72 18.14-11.87-1.15-23.77-1.97-35.65-3.06-133.46-15.9-266.8-33.02-400.47-47.21Z" fill="currentColor"></path></svg>`;
const BRUSH_URL = `url("data:image/svg+xml,${encodeURIComponent(_brushSvg)}")`;

const BRANCHES = [
  { name: "Boudoir", route: "/stock" },
  { name: "Chic Nailspa", route: "/stockchicnailspa" },
  { name: "Nur Yadi", route: "/stocknuryadi" },
];

export default function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme, font, setFont } = useTheme();
  const [visible, setVisible] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [orderConfirmMode, setOrderConfirmMode] = useState(
    () => localStorage.getItem("orderConfirmation") !== "false"
  );

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handlePageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest(".l3-branches-nav") &&
      !target.closest(".l3-branch-overlay")
    ) {
      setBranchesOpen(false);
    }
  };

  const blurredOpacity = 0.25;
  const blurAmount = "blur(5px)";
  const blurLight = "blur(2px)";
  const blurredOpacityLight = 0.5;

  return (
    <>
      <style>{`
        @keyframes l3FadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes l3FadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .l3-b-item {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
          display: block;
          margin-bottom: 2px;
        }
        .l3-branches-open .l3-b-item:nth-child(1) { opacity: 1; transform: translateY(0); transition-delay: 0.08s; }
        .l3-branches-open .l3-b-item:nth-child(2) { opacity: 1; transform: translateY(0); transition-delay: 0.16s; }
        .l3-branches-open .l3-b-item:nth-child(3) { opacity: 1; transform: translateY(0); transition-delay: 0.24s; }

        .l3-b-text {
          display: block;
          font-size: clamp(16px, 2vw, 22px);
          font-weight: 300;
          letter-spacing: 0.20em;
          text-transform: uppercase;
          color: hsl(var(--foreground));
          opacity: 0.65;
          transition: opacity 0.22s ease, letter-spacing 0.28s ease;
          padding: 4px 0;
        }
        .l3-b-item:hover .l3-b-text {
          opacity: 1;
          letter-spacing: 0.30em;
        }
        .l3-branches-open .l3-b-item .l3-b-text {
          opacity: 1;
          color: hsl(var(--foreground));
        }

        .l3-nav-item {
          display: block;
          font-size: clamp(12px, 1.3vw, 15px);
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: hsl(var(--foreground));
          cursor: pointer;
          padding: 0;
          position: relative;
          transition: color 0.25s, filter 0.4s ease, opacity 0.4s ease;
          user-select: none;
        }
        .l3-nav-item:hover { color: hsl(var(--muted-foreground)); }

        .l3-hand-underline {
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 100%;
          height: 14px;
          background-size: 100% 100%;
          background-repeat: no-repeat;
          opacity: 0;
          transform: scaleX(0.6);
          transform-origin: left;
          transition: opacity 0.4s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1);
          pointer-events: none;
        }
        .l3-nav-item:hover .l3-hand-underline {
          opacity: 1;
          transform: scaleX(1);
        }

        .l3-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .l3-icon-btn svg {
          transition: stroke 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .l3-icon-btn:hover svg {
          stroke: hsl(var(--foreground)) !important;
          transform: scale(1.2);
        }
        .l3-icon-btn:focus { outline: none; }
      `}</style>

      <div
        onClick={handlePageClick}
        style={{
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          minHeight: "100vh",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 44px 0",
            flexShrink: 0,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.2s",
            zIndex: 20,
            position: "relative",
          }}
        >
          {/* NAIL SALON top left */}
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "hsl(var(--foreground))",
              fontWeight: 400,
              filter: branchesOpen ? blurLight : "none",
              opacity: branchesOpen ? blurredOpacityLight : 1,
              transition: "filter 0.4s ease, opacity 0.4s ease",
            }}
          >
            Nail Salon
          </span>

          {/* Top right: icon buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "22px",
              filter: branchesOpen ? blurAmount : "none",
              opacity: branchesOpen ? blurredOpacity : 1,
              transition: "filter 0.4s ease, opacity 0.4s ease",
            }}
          >
            {/* Aa — Font */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="l3-icon-btn">
                  <svg
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.4"
                  >
                    <path d="M3 19l5-12 5 12M5.5 14h5M14 19l3.5-7 3.5 7M15.5 16h4" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[130px] text-xs">
                <DropdownMenuLabel className="text-[10px] tracking-widest uppercase">Font</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={font} onValueChange={(v) => setFont(v as Font)}>
                  <DropdownMenuRadioItem value="inter" className="text-xs">Inter</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="raleway" className="text-xs">Raleway</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="helvetica" className="text-xs">Helvetica Neue</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sun — Theme */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="l3-icon-btn">
                  <svg
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.4"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[110px] text-xs">
                <DropdownMenuLabel className="text-[10px] tracking-widest uppercase">Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                  <DropdownMenuRadioItem value="dark" className="text-xs">
                    <span className="flex items-center gap-2"><Moon size={11} />Dark</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="light" className="text-xs">
                    <span className="flex items-center gap-2"><Sun size={11} />Light</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="sand" className="text-xs">
                    <span className="flex items-center gap-2"><Palette size={11} />Sand</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Gear — Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="l3-icon-btn">
                  <svg
                    width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.4"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px] text-xs">
                <DropdownMenuLabel className="text-[10px] tracking-widest uppercase">Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div
                  className="cursor-pointer rounded-sm hover:bg-accent flex items-center justify-between px-2 py-[6px]"
                  onClick={() => {
                    const next = !orderConfirmMode;
                    setOrderConfirmMode(next);
                    localStorage.setItem("orderConfirmation", String(next));
                  }}
                >
                  <span className="text-xs">Order Confirmation</span>
                  <div
                    style={{
                      width: "28px",
                      height: "16px",
                      borderRadius: "8px",
                      background: orderConfirmMode
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--muted-foreground))",
                      position: "relative",
                      transition: "background 0.2s",
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "hsl(var(--background))",
                        position: "absolute",
                        top: "2px",
                        left: orderConfirmMode ? "14px" : "2px",
                        transition: "left 0.2s",
                      }}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── Hero title ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 44px",
            pointerEvents: "none",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h1
            style={{
              fontSize: "clamp(60px, 10vw, 130px)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 0.88,
              margin: 0,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s, transform 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s",
              filter: branchesOpen ? blurAmount : "none",
            }}
          >
            <span style={{ color: "hsl(var(--foreground))", display: "block", transition: "filter 0.4s ease, opacity 0.4s ease" }}>
              Product
            </span>
            <span
              style={{
                color: branchesOpen ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                display: "block",
                transition: "color 0.4s ease",
              }}
            >
              Database.
            </span>
          </h1>
        </div>


                {/* ── Bottom bar ── */}
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid hsl(var(--border))",
            padding: "20px 44px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: visible ? 1 : 0,
            transform: branchesOpen ? "translateY(-40px)" : "translateY(0)",
            transition: "opacity 0.9s ease 1.0s, transform 0.5s cubic-bezier(0.16,1,0.3,1)",
            zIndex: 5,
            position: "relative",
          }}
        >
          {/* Left: BRANCHES + inline list + OFFICE */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* BRANCHES */}
            <div
              className="l3-nav-item l3-branches-nav"
              onClick={(e) => {
                e.stopPropagation();
                setBranchesOpen((prev) => !prev);
              }}
              style={{
                transform: branchesOpen ? "translateY(-2px)" : "translateY(0)",
                color: branchesOpen ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1), color 0.35s",
              }}
            >
              Branches
              <span className="l3-hand-underline" style={{ backgroundImage: BRUSH_URL }} />
            </div>

            {/* Inline branch list — slides in below BRANCHES */}
            <div
              style={{
                maxHeight: branchesOpen ? "120px" : "0px",
                overflow: "hidden",
                transition: "max-height 0.55s cubic-bezier(0.16,1,0.3,1)",
                paddingTop: branchesOpen ? "10px" : "0px",
              }}
            >
              <div className={branchesOpen ? "l3-branches-open" : ""}>
                {BRANCHES.map((b) => (
                  <div
                    key={b.name}
                    className="l3-b-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(b.route);
                    }}
                  >
                    <span className="l3-b-text">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OFFICE */}
            <div
              className="l3-nav-item"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/prices");
              }}
              style={{
                marginTop: "14px",
                filter: branchesOpen ? blurLight : "none",
                opacity: branchesOpen ? blurredOpacityLight : 1,
                pointerEvents: branchesOpen ? "none" : "auto",
                transition: "filter 0.4s ease, opacity 0.4s ease, color 0.25s",
              }}
            >
              Office
              <span className="l3-hand-underline" style={{ backgroundImage: BRUSH_URL }} />
            </div>
          </div>

          {/* Right: SELECT TO CONTINUE */}
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "hsl(var(--muted-foreground))",
              filter: branchesOpen ? blurLight : "none",
              opacity: branchesOpen ? blurredOpacityLight : 1,
              transition: "filter 0.4s ease, opacity 0.4s ease",
            }}
          >
            Select to continue
          </span>
        </div>
      </div>
    </>
  );
}
