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

const actionBtnStyle = { display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "10px", fontWeight: 300, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground, 0 0% 50%))" };

// GRN PDF + Excel export button pair used by the Order panel.
export const OrderExportActions = ({ entries, grn, config, grnNotes, exportDate }: OrderExportActionsProps) => (
  <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
    <button onClick={() => generateGRNPdf(entries, grn, config, grnNotes)} style={actionBtnStyle}><FileText size={10} />GRN PDF</button>
    <button onClick={() => exportToExcel(entries, config, exportDate)} style={actionBtnStyle}><Download size={10} />Export</button>
  </div>
);