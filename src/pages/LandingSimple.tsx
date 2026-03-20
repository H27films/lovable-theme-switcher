import { useNavigate } from "react-router-dom";
import { useTheme, type Theme } from "@/hooks/useTheme";
import { useTabletMode } from "@/hooks/useTabletMode";
import React, { useState, useEffect } from "react";

export default function LandingSimple() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { tablet, toggle: toggleTablet } = useTabletMode();
  const [visible, setVisible] = useState(false);

  // Default to light mode if currently on dark
  useEffect(() => {
    if (theme === "dark") setTheme("light");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const isSand = theme === "sand";
  const toggleTheme = () => setTheme(isSand ? "light" : "sand");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100;0,200;0,300;0,400;0,500;1,200;1,300&display=swap');

        .ls-root,
        .ls-root * {
          font-family: 'Raleway', sans-serif !important;
          -webkit-text-size-adjust: 100%;
        }

        @keyframes lsFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ls-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
        }
        .ls-icon-btn svg {
          transition: stroke 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .ls-icon-btn:hover svg {
          stroke: hsl(var(--foreground)) !important;
          transform: scale(1.2);
        }
        .ls-icon-btn:focus { outline: none; }

        .ls-enter-btn {
          cursor: pointer;
          transition: letter-spacing 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease, gap 0.35s cubic-bezier(0.16,1,0.3,1);
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .ls-enter-btn:hover {
          letter-spacing: 0.22em;
          gap: 18px;
        }
        .ls-enter-btn:active {
          opacity: 0.5;
        }

        .ls-title-line {
          display: block;
          transition: letter-spacing 0.6s cubic-bezier(0.16,1,0.3,1);
        }

        @media (max-width: 480px) {
          .ls-topbar  { padding: 22px 28px 0 !important; }
          .ls-hero    { padding: 0 28px !important; }
          .ls-bottom  { padding: 22px 28px !important; }
        }
      `}</style>

      <div
        className="ls-root"
        style={{
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          minHeight: "100dvh",
          height: "100dvh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Top bar ── */}
        <div
          className="ls-topbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 44px 0",
            flexShrink: 0,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.2s",
          }}
        >
          <span
            style={{
              fontSize: "clamp(13px, 2.5vw, 16px)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "hsl(var(--foreground))",
              fontWeight: 400,
            }}
          >
            Nail Salon
          </span>

          {/* Light ↔ Sand toggle */}
          <button
            className="ls-icon-btn"
            onClick={toggleTheme}
            title={isSand ? "Switch to Light" : "Switch to Sand"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--dim))" strokeWidth="1.4">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </button>
        </div>

        {/* ── Hero title ── */}
        <div
          className="ls-hero"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 44px",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(56px, 14vw, 88px)",
              fontWeight: 200,
              letterSpacing: "-0.02em",
              lineHeight: 0.9,
              margin: 0,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(24px)",
              transition:
                "opacity 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s, transform 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s",
              userSelect: "none",
            }}
          >
            <span
              className="ls-title-line"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Product
            </span>
            <span
              className="ls-title-line"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Database.
            </span>
          </h1>
        </div>

        {/* ── Bottom bar ── */}
        <div
          className="ls-bottom"
          style={{
            flexShrink: 0,
            borderTop: "1px solid hsl(var(--border))",
            padding: "22px 44px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.9s ease 1.0s",
          }}
        >
          {/* Enter Here button */}
          <div
            className="ls-enter-btn"
            onClick={() => navigate("/simple/office")}
            style={{
              fontSize: "clamp(14px, 3.5vw, 32px)",
              fontWeight: 300,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "hsl(var(--foreground))",
            }}
          >
            Enter Here
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>

          {/* Phone / Tablet toggle */}
          <button
            className="ls-icon-btn"
            onClick={toggleTablet}
            title={tablet ? "Switch to Phone view" : "Switch to Tablet view"}
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.9s ease 1.2s" }}
          >
            {tablet ? (
              /* Tablet icon (active) */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <circle cx="12" cy="18" r="0.8" fill="hsl(var(--foreground))" stroke="none" />
              </svg>
            ) : (
              /* Phone icon (inactive / muted) */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <circle cx="12" cy="18" r="0.8" fill="hsl(var(--muted-foreground))" stroke="none" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
