import { useState } from "react";

// ── Mini Calendar ────────────────────────────────────────────
const CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_DAYS   = ["M","T","W","T","F","S","S"];
// Short names for the compact date display inside the field, e.g. "Thu 28 Aug".
const SHORT_DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const MiniCalendar = ({ value, onChange, placeholder = "Select date" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => {
  const today   = new Date();
  const parsed  = value ? new Date(value + "T00:00:00") : null;
  const [open, setOpen]           = useState(false);
  const [viewYear, setViewYear]   = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth()    : today.getMonth());

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay    = (y: number, m: number) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };

  const handleSelect = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const displayStr = parsed
    ? `${SHORT_DAYS[parsed.getDay()]} ${parsed.getDate()} ${SHORT_MONTHS[parsed.getMonth()]}`
    : placeholder;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const totalDays   = daysInMonth(viewYear, viewMonth);
  const startOffset = firstDay(viewYear, viewMonth);
  const cells: (number|null)[] = [...Array(startOffset).fill(null), ...Array.from({length: totalDays}, (_, i) => i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const selDay   = parsed && parsed.getFullYear()===viewYear && parsed.getMonth()===viewMonth ? parsed.getDate() : null;
  const todayDay = today.getFullYear()===viewYear && today.getMonth()===viewMonth ? today.getDate() : null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: parsed ? "hsl(var(--card))" : "none",
          border: parsed ? "none" : "0.5px solid hsl(var(--border))",
          borderRadius: "6px", padding: "9px 12px", cursor: "pointer", textAlign: "left",
          fontSize: "13px", fontFamily: "Raleway, inherit",
          color: parsed ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          letterSpacing: "0.04em",
        }}
      >
        <span>{displayStr}</span>
        <span style={{ fontSize: "9px", opacity: 0.4 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 300,
          background: "hsl(var(--background))", border: "0.5px solid hsl(var(--border))",
          borderRadius: "10px", padding: "14px 12px", minWidth: "248px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontSize: "18px", padding: "0 6px", lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", letterSpacing: "0.08em" }}>
              {CAL_MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontSize: "18px", padding: "0 6px", lineHeight: 1 }}>›</button>
          </div>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: "4px" }}>
            {CAL_DAYS.map((d,i) => (
              <div key={i} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "hsl(var(--muted-foreground))", padding: "2px 0", fontFamily: "Raleway, inherit" }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
            {cells.map((day, i) => (
              <button
                key={i}
                disabled={!day}
                onClick={() => day && handleSelect(day)}
                style={{
                  background: day !== null && day === selDay ? "hsl(var(--foreground))" : "none",
                  border: day === todayDay && day !== selDay ? "0.5px solid hsl(var(--border))" : "none",
                  borderRadius: "4px",
                  padding: "6px 2px",
                  cursor: day ? "pointer" : "default",
                  fontSize: "12px",
                  fontFamily: "Raleway, inherit",
                  color: day !== null && day === selDay
                    ? "hsl(var(--background))"
                    : day !== null && day === todayDay
                      ? "hsl(var(--foreground))"
                      : day ? "hsl(var(--muted-foreground))" : "transparent",
                  fontWeight: day === todayDay ? 700 : 400,
                  textAlign: "center",
                }}
              >{day ?? ""}</button>
            ))}
          </div>
          {/* Clear */}
          {parsed && (
            <div style={{ marginTop: "10px", borderTop: "0.5px solid #d8d0c8", paddingTop: "8px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { onChange(""); setOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", letterSpacing: "0.04em" }}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MiniCalendar;
