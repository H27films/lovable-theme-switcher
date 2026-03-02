import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggle, font, cycleFont } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
      {/* Top bar */}
      <div
        className="flex justify-between items-center px-8 py-6 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <span
          className="text-[11px] tracking-[0.2em] uppercase"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Boudoir
        </span>
        <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">

        {/* Title */}
        <div
          className="text-center mb-20 transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
        >
          <p
            className="text-[11px] tracking-[0.25em] uppercase mb-3"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Boudoir Product Database
          </p>
          <h1 className="text-[42px] font-light tracking-tight">Select a section</h1>
        </div>

        {/* Cards */}
        <div className="flex flex-col items-center gap-4 w-full max-w-[340px]">

          {/* STOCK */}
          <button
            onClick={() => navigate("/stock")}
            className="group w-full text-left transition-all duration-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transitionDelay: "120ms",
            }}
          >
            <div
              className="relative overflow-hidden p-8 border transition-all duration-300"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--foreground))";
                (e.currentTarget as HTMLDivElement).style.background = "hsl(var(--card))";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))";
              }}
            >
              {/* Icon */}
              <div className="mb-5">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(var(--foreground))" }}>
                  {/* Warehouse/boxes icon */}
                  <rect x="4" y="14" width="28" height="18" rx="0.5" />
                  <path d="M4 14 L18 4 L32 14" />
                  <rect x="13" y="22" width="10" height="10" />
                  <line x1="18" y1="22" x2="18" y2="32" />
                </svg>
              </div>
              <p
                className="text-[10px] tracking-[0.2em] uppercase mb-1.5"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Inventory
              </p>
              <p className="text-[22px] font-light tracking-tight">Stock</p>
              <p
                className="text-[12px] font-light mt-1"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Track usage, orders & balances
              </p>

              {/* Arrow */}
              <div
                className="absolute bottom-8 right-8 transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </div>
            </div>
          </button>

          {/* PRICES */}
          <button
            onClick={() => navigate("/prices")}
            className="group w-full text-left transition-all duration-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transitionDelay: "220ms",
            }}
          >
            <div
              className="relative overflow-hidden p-8 border transition-all duration-300"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--foreground))";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))";
              }}
            >
              {/* Icon */}
              <div className="mb-5">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "hsl(var(--foreground))" }}>
                  {/* Price tag icon */}
                  <path d="M20 4H28V12L14 26a2 2 0 01-2.83 0L5.83 20.83a2 2 0 010-2.83L20 4z" />
                  <circle cx="24" cy="10" r="1.5" fill="currentColor" stroke="none" />
                  <line x1="10" y1="26" x2="16" y2="32" strokeOpacity="0.4" />
                </svg>
              </div>
              <p
                className="text-[10px] tracking-[0.2em] uppercase mb-1.5"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Products
              </p>
              <p className="text-[22px] font-light tracking-tight">Prices</p>
              <p
                className="text-[12px] font-light mt-1"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Lookup & manage product pricing
              </p>

              {/* Arrow */}
              <div
                className="absolute bottom-8 right-8 transition-transform duration-300 group-hover:translate-x-1"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
