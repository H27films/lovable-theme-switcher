import { useNavigate } from "react-router-dom";
import { useTheme, type Theme, type Font } from "@/hooks/useTheme";
import { useEffect, useRef, useState } from "react";
import { Settings, Type, Sun, Moon, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme, font, setFont } = useTheme();
  const [visible, setVisible] = useState(false);
  const [showStockChoice, setShowStockChoice] = useState(false);
  const [orderConfirmMode, setOrderConfirmMode] = useState(
    () => localStorage.getItem("orderConfirmation") !== "false",
  );
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);


  // Subtle parallax mouse tracking
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
        });
      }
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const Card = ({
    onClick,
    delay,
    icon,
    label,
    title,
    subtitle,
  }: {
    onClick: () => void;
    delay: string;
    icon: React.ReactNode;
    label: string;
    title: string;
    subtitle: string;
  }) => (
    <button
      onClick={onClick}
      className="group w-full"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `translateY(0) scale(1)`
          : `translateY(24px) scale(0.97)`,
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: delay,
      }}
    >
      <div
        className="relative overflow-hidden flex items-center justify-between px-10 py-8 rounded-[100px] bg-card border border-border transition-[border-color,transform,box-shadow] duration-300 ease-out group-hover:border-foreground group-hover:scale-[1.03] group-hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.06)]"
      >
        {/* Left: icon + text */}
        <div className="flex items-center gap-6">
          <div style={{ color: "hsl(var(--foreground))", flexShrink: 0 }}>
            {icon}
          </div>
          <div className="text-left">
            <p
              className="text-[11px] uppercase mb-1 tracking-[0.2em]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {label}
            </p>
            <p className="text-[26px] font-light tracking-tight leading-none mb-1">
              {title}
            </p>
            <p
              className="text-[13px] font-light"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: arrow */}
        <div
          className="flex-shrink-0 ml-8 transition-all duration-300 ease-out group-hover:translate-x-2"
          style={{ color: "hsl(var(--foreground))" }}
        >
          <svg
            className="w-[44px] group-hover:w-[56px] transition-all duration-300 ease-out"
            height="20"
            viewBox="0 0 52 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="0" y1="10" x2="44" y2="10" />
            <path d="M34 2l10 8-10 8" />
          </svg>
        </div>
      </div>
    </button>
  );

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
      {/* Animated background grid dots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: visible ? 0.4 : 0,
          transition: "opacity 1.5s ease",
          transform: `translate(${mousePos.x * -3}px, ${mousePos.y * -3}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle radial glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: "800px",
          height: "800px",
          transform: `translate(-50%, -50%) translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
          background: "radial-gradient(circle, hsla(var(--foreground) / 0.02) 0%, transparent 70%)",
          pointerEvents: "none",
          transition: "transform 0.3s ease-out",
        }}
      />

      {/* Top bar */}
      <div
        className="relative z-10 flex justify-between items-center px-8 py-6 border-b"
        style={{
          borderColor: "hsl(var(--border))",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
        }}
      >
        <span
          className="text-[11px] tracking-[0.2em] uppercase"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Branches
        </span>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:opacity-80" style={{ color: "hsl(var(--muted-foreground))" }}>
                <Settings size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={orderConfirmMode}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setOrderConfirmMode(next);
                  localStorage.setItem("orderConfirmation", String(next));
                }}
              >
                Order Confirmation
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:opacity-80" style={{ color: "hsl(var(--muted-foreground))" }}>
                <Type size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Font</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={font} onValueChange={(value) => setFont(value as Font)}>
                <DropdownMenuRadioItem value="inter">Inter</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="raleway">Raleway</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:opacity-80" style={{ color: "hsl(var(--muted-foreground))" }}>
                {theme === "dark" && <Sun size={16} />}
                {theme === "light" && <Palette size={16} />}
                {theme === "sand" && <Moon size={16} />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                <DropdownMenuRadioItem value="dark">
                  <span className="flex items-center gap-2"><Moon size={13} />Dark</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">
                  <span className="flex items-center gap-2"><Sun size={13} />Light</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sand">
                  <span className="flex items-center gap-2"><Palette size={13} />Sand</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 relative z-10">

        {/* Title with staggered animation */}
        <div
          className="text-center mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <p
            className="text-[11px] tracking-[0.25em] uppercase mb-3"
            style={{
              color: "hsl(var(--muted-foreground))",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.3s",
            }}
          >
            Product Database
          </p>
          <h1
            className="text-[42px] font-light tracking-tight"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
            }}
          >
            Select a section
          </h1>
          {/* Animated underline */}
          <div
            style={{
              width: visible ? "60px" : "0px",
              height: "1px",
              background: "hsl(var(--foreground))",
              margin: "12px auto 0",
              transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
              opacity: 0.3,
            }}
          />
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4 w-full max-w-[560px]">
          <Card
            onClick={() => setShowStockChoice(prev => !prev)}
            delay="200ms"
            icon={
              <svg width="40" height="40" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="14" width="28" height="18" rx="0.5" />
                <path d="M4 14 L18 4 L32 14" />
                <rect x="13" y="22" width="10" height="10" />
                <line x1="18" y1="22" x2="18" y2="32" />
              </svg>
            }
            label="Inventory"
            title="Branch Stock"
            subtitle="Track usage, orders & balances"
          />

          {/* Stock sub-choices */}
          <div
            style={{
              maxHeight: showStockChoice ? "200px" : "0px",
              opacity: showStockChoice ? 1 : 0,
              transform: showStockChoice ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.97)",
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              overflow: "hidden",
            }}
          >
            <div className="flex gap-3 w-full">
              {[
                { name: "Boudoir", route: "/stock", delay: "0ms" },
                { name: "Chic Nailspa", route: "/stockchicnailspa", delay: "60ms" },
                { name: "Nur Yadi", route: "/stocknuryadi", delay: "120ms" },
              ].map((salon, i) => (
                <button
                  key={salon.name}
                  onClick={() => navigate(salon.route)}
                  className="flex-1 py-4 px-6 rounded-full text-center group/sub"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: showStockChoice ? `${i * 60}ms` : "0ms",
                    opacity: showStockChoice ? 1 : 0,
                    transform: showStockChoice ? "translateY(0)" : "translateY(-8px)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "hsl(var(--foreground))";
                    e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 8px 25px -8px hsla(0, 0%, 0%, 0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "hsl(var(--border))";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <p className="text-[11px] tracking-[0.15em] uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Salon</p>
                  <p className="text-[18px] font-light tracking-tight">{salon.name}</p>
                </button>
              ))}
            </div>
          </div>

          <Card
            onClick={() => navigate("/prices")}
            delay="320ms"
            icon={
              <svg width="40" height="40" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 4H28V12L14 26a2 2 0 01-2.83 0L5.83 20.83a2 2 0 010-2.83L20 4z" />
                <circle cx="24" cy="10" r="1.5" fill="currentColor" stroke="none" />
                <line x1="10" y1="26" x2="16" y2="32" strokeOpacity="0.4" />
              </svg>
            }
            label="Prices & Suppliers"
            title="Office Database"
            subtitle="Manage product pricing & suppliers"
          />
        </div>

        {/* Bottom floating label */}
        <div
          style={{
            marginTop: "48px",
            opacity: visible ? 0.3 : 0,
            transition: "opacity 1s ease 0.8s",
          }}
        >
          <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
            ▲ Select to continue
          </p>
        </div>
      </div>

    </div>
  );
}
