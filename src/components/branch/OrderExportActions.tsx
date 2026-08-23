import { Download, FileText } from "lucide-react";
import { generateGRNPdf, exportToExcel, type GrnEntry } from "@/lib/grn";
import { type BranchConfig } from "@/lib/branchSimple";

interface OrderExportActionsProps {
  entries: GrnEntry[];
  /** GRN number printed on the PDF */
  grn: string;
  config: BranchConfig;
  grnNotes: string;
  /** Date (YYYY-MM-DD) written to the DATE column of the Excel export */
  exportDate: string;
}

// Export action: plain text label preceded by a small solid circular icon
// badge (icon centred inside a round dark disc).
const actionBtnStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))" };
const iconCircleStyle: React.CSSProperties = { width: "20px", height: "20px", borderRadius: "50%", background: "hsl(var(--background, 0 0% 0%))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

// GRN PDF + Excel export button pair used by the Order panel.
export const OrderExportActions = ({ entries, grn, config, grnNotes, exportDate }: OrderExportActionsProps) => (
  <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
    <button onClick={() => generateGRNPdf(entries, grn, config, grnNotes)} style={actionBtnStyle}>
      <span style={iconCircleStyle}><FileText size={11} color="hsl(var(--foreground, 0 0% 100%))" /></span>
      GRN PDF
    </button>
    <button onClick={() => exportToExcel(entries, config, exportDate)} style={actionBtnStyle}>
      <span style={iconCircleStyle}><Download size={11} color="hsl(var(--foreground, 0 0% 100%))" /></span>
      Export
    </button>
  </div>
);