import { generateAndShareFullOrderPDF, WhatsAppIcon, type OrderLine, type OrderOtherRow } from "@/components/office/OrderSummaryOffice";

interface OrderListProps {
  orderLines: OrderLine[];
  /** Product ids ticked as URGENT — printed as a dark-red "URGENT" in the PDF's URGENT column. */
  urgentIds: Set<number>;
  onToggleUrgent: (productId: number) => void;
  /** OTHER write-in rows (Product + Notes) — printed row-by-row at the bottom of the PDF. */
  otherRows: OrderOtherRow[];
  onOtherRowsChange: (rows: OrderOtherRow[]) => void;
  onClose: () => void;
}

// "Order List" overlay panel for the Office Order page. Opened by the Order Summary draft
// footer's "Send Order List to Ailing" button (which no longer shares the PDF directly).
// Shows every ordered product A–Z with a round tick circle on the LEFT: ticking a product
// marks it URGENT, which prints a dark-red "URGENT" in the PDF's URGENT column (before the
// OFFICE BALANCE column). The OTHER section at the bottom takes row-by-row write-in items
// (Product + Notes) that are appended to the bottom of the PDF. The footer's "Send Order
// List to Ailing" button generates and shares the full order PDF with those additions.
export default function OrderList({ orderLines, urgentIds, onToggleUrgent, otherRows, onOtherRowsChange, onClose }: OrderListProps) {
  const fg = "hsl(var(--foreground))";
  const muted = "hsl(var(--muted-foreground))";
  const border = "0.5px solid hsl(var(--border))";
  // Dark red for the URGENT flag — same colour the PDF prints it in (rgb(139, 0, 0)).
  const urgentRed = "hsl(0 100% 27%)";

  // Products A–Z, matching the A–Z ordering used inside each PDF supplier group.
  const sortedLines = [...orderLines].sort((a, b) =>
    a.product["PRODUCT NAME"].localeCompare(b.product["PRODUCT NAME"])
  );

  // Supplier groups built exactly like the Order Summary sheet, so the PDF generated
  // from this panel matches the one the summary used to produce.
  const supplierMap = new Map<string, { supplier: string; lines: OrderLine[] }>();
  orderLines.forEach(line => {
    const supplier = line.supplierChoice ?? line.product["SUPPLIER"] ?? "Unknown";
    if (!supplierMap.has(supplier)) supplierMap.set(supplier, { supplier, lines: [] });
    supplierMap.get(supplier)!.lines.push(line);
  });
  const supplierGroups = [...supplierMap.values()];

  const handleSend = () => {
    generateAndShareFullOrderPDF(
      supplierGroups.map(group => ({
        supplier: group.supplier,
        lines: group.lines.map(line => ({
          productName: line.product["PRODUCT NAME"],
          officeBalance: line.product["OFFICE BALANCE"],
          boudoirBalance: line.product["BOUDOIR BALANCE"],
          chicBalance: line.product["CHIC NAILSPA BALANCE"],
          nurYadiBalance: line.product["NUR YADI BALANCE"],
          urgent: urgentIds.has(line.product.id),
        })),
      })),
      { otherRows }
    );
  };

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "hsl(var(--background))",
      display: "flex", flexDirection: "column",
      zIndex: 100, // above the Order Summary sheet (60) — same level as BELOW PAR
    }}>
      {/* Panel header — same pattern as BELOW PAR: clickable title + back arrow */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 16px 16px", flexShrink: 0,
      }}>
        <div>
          <div
            onClick={onClose}
            style={{ fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 300, letterSpacing: "0.08em", color: fg, cursor: "pointer", fontFamily: "Raleway, inherit" }}
          >
            ORDER LIST
          </div>
          <div style={{ fontSize: "11px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, marginTop: "2px" }}>
            {orderLines.length} {orderLines.length === 1 ? "Product" : "Products"} · A–Z · tick to mark URGENT
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Back"
          title="Back"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: fg, display: "flex", alignItems: "center", touchAction: "manipulation" }}
        >
          {/* Same left-arrow style as the Search page header / BELOW PAR overlay */}
          <svg width="36" height="16" viewBox="0 0 36 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="30" y1="8" x2="1" y2="8" />
            <polyline points="9,1 1,8 9,15" />
          </svg>
        </button>
      </div>

      {/* Scrollable list — products A–Z, then the OTHER write-in section */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px" }}>
        {sortedLines.length === 0 ? (
          <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: muted, padding: "24px 0" }}>
            No products in the order.
          </div>
        ) : (
          sortedLines.map((line, idx) => {
            const urgent = urgentIds.has(line.product.id);
            return (
              <div
                key={`${line.product.id}-${idx}`}
                onClick={() => onToggleUrgent(line.product.id)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderBottom: border, cursor: "pointer" }}
              >
                {/* Round-circle tick box — left side; filled black with a white tick when urgent */}
                <div style={{
                  width: "20px", height: "20px",
                  border: `1.5px solid ${urgent ? fg : "hsl(var(--border))"}`,
                  borderRadius: "50%",
                  background: urgent ? fg : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {urgent && (
                    <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Product name + supplier */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: fg, lineHeight: 1.3 }}>
                    {line.product["PRODUCT NAME"]}
                  </div>
                  <div style={{ fontSize: "10px", fontFamily: "Raleway, inherit", color: muted, marginTop: "1px" }}>
                    {line.supplierChoice ?? line.product["SUPPLIER"] ?? "Unknown"}
                  </div>
                </div>

                {/* URGENT flag — dark red, mirrors what will print in the PDF column */}
                {urgent && (
                  <div style={{ fontSize: "10px", fontWeight: 700, fontFamily: "Raleway, inherit", color: urgentRed, letterSpacing: "0.08em", flexShrink: 0 }}>
                    URGENT
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* OTHER — row-by-row write-ins: Product + Notes. The note prints in the PDF's
            URGENT column and wraps right across the balance columns for that row. */}
        <div style={{ padding: "16px 0 8px" }}>
          <div style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", letterSpacing: "0.08em", color: fg, marginBottom: "8px" }}>
            OTHER
          </div>
          {otherRows.map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <input
                value={row.product}
                onChange={e => onOtherRowsChange(otherRows.map((r, j) => j === i ? { ...r, product: e.target.value } : r))}
                placeholder="Product"
                style={{
                  flex: 1, minWidth: 0, boxSizing: "border-box",
                  background: "hsl(var(--card))", border: border, borderRadius: "8px",
                  padding: "10px 12px", fontSize: "13px", fontWeight: 300,
                  fontFamily: "Raleway, inherit", color: fg, outline: "none",
                }}
              />
              <input
                value={row.notes}
                onChange={e => onOtherRowsChange(otherRows.map((r, j) => j === i ? { ...r, notes: e.target.value } : r))}
                placeholder="Notes"
                style={{
                  flex: 1, minWidth: 0, boxSizing: "border-box",
                  background: "hsl(var(--card))", border: border, borderRadius: "8px",
                  padding: "10px 12px", fontSize: "13px", fontWeight: 300,
                  fontFamily: "Raleway, inherit", color: fg, outline: "none",
                }}
              />
              {otherRows.length > 1 && (
                <button
                  onClick={() => onOtherRowsChange(otherRows.filter((_, j) => j !== i))}
                  aria-label={`Remove row ${i + 1}`}
                  title="Remove row"
                  style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    border: "0.5px solid " + muted, background: "none", color: muted,
                    cursor: "pointer", flexShrink: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "12px", lineHeight: 1, padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {/* + ROW — appends another empty Product + Notes row */}
          <button
            onClick={() => onOtherRowsChange([...otherRows, { product: "", notes: "" }])}
            style={{
              width: "100%", padding: "10px",
              fontSize: "11px", fontWeight: 400, fontFamily: "Raleway, inherit",
              letterSpacing: "0.08em", textTransform: "uppercase",
              border: "0.5px solid " + muted, background: "none",
              color: muted, borderRadius: "6px", cursor: "pointer",
            }}
          >
            + Row
          </button>
          <div style={{ paddingBottom: "24px" }} />
        </div>
      </div>

      {/* Footer: Send Order List to Ailing — generates + shares the PDF */}
      <div style={{ padding: "12px 16px", paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)", borderTop: border, flexShrink: 0 }}>
        <button
          onClick={handleSend}
          disabled={orderLines.length === 0}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px", width: "100%", padding: "12px",
            fontSize: "12px", fontWeight: 600, fontFamily: "Raleway, inherit",
            letterSpacing: "0.12em", textTransform: "uppercase",
            border: "0.5px solid hsl(var(--foreground))",
            background: "hsl(var(--foreground))",
            color: "hsl(var(--background))",
            borderRadius: "999px",
            cursor: orderLines.length === 0 ? "default" : "pointer",
            opacity: orderLines.length === 0 ? 0.5 : 1,
          }}
        >
          <WhatsAppIcon />
          Send Order List to Ailing
        </button>
      </div>
    </div>
  );
}
