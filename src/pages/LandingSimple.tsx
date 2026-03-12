import { useNavigate } from "react-router-dom";
import { useTheme, type Theme } from "@/hooks/useTheme";
import React, { useState, useEffect } from "react";
import { Sun, Palette } from "lucide-react";

export default function LandingSimple() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
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

        .ls-theme-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--muted-foreground));
          border-radius: 4px;
          transition: color 0.2s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1);
          -webkit-tap-highlight-color: transparent;
        }
        .ls-theme-toggle:hover,
        .ls-theme-toggle:active {
          color: hsl(var(--foreground));
          transform: scale(1.15);
        }
        .ls-theme-toggle:focus { outline: none; }

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
              fontSize: "clamp(9px, 2vw, 11px)",
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
            className="ls-theme-toggle"
            onClick={toggleTheme}
            title={isSand ? "Switch to Light" : "Switch to Sand"}
          >
            {isSand ? <Sun size={17} strokeWidth={1.4} /> : <Palette size={17} strokeWidth={1.4} />}
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
            justifyContent: "flex-end",
            alignItems: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.9s ease 1.0s",
          }}
        >
          <div
            className="ls-enter-btn"
            onClick={() => navigate("/simple/office")}
            style={{
              fontSize: "clamp(20px, 5vw, 32px)",
              fontWeight: 300,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              color: "hsl(var(--foreground))",
            }}
          >
            Enter Here
            <svg
              width="28"
              height="28"
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
        </div>
      </div>
    </>
  );
}
