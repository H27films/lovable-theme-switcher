import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { type BranchConfig } from "./branchSimple";

export interface GrnEntry {
  productName: string;
  starting: number;
  qty: number;
  ending: number;
}

export const generateGRNPdf = (entries: GrnEntry[], grn: string, config: BranchConfig, grnNotes: string) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = 595;
  const margin = 50;
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(26, 26, 26);
  doc.text(config.pdfHeader, margin, 58);
  doc.text("GOODS RECEIVED NOTE", W - margin, 58, { align: "right" });
  doc.setDrawColor(26, 26, 26);
  doc.setLineWidth(0.8);
  doc.line(margin, 64, W - margin, 64);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ADDRESS", margin, 78);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  doc.text("+60123333128  /  soongailing@gmail.com", margin, 90);
  doc.text("2F-11, Bangsar Village 2, No 2, Jalan Telawi 1, Bangsar Baru, Kuala Lumpur, 59100, Malaysia", margin, 101);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  doc.text("DATE", margin, 130);
  doc.text("GRN NUMBER", margin + 120, 130);
  doc.setFontSize(9);
  doc.text(dateStr, margin, 143);
  doc.text(grn, margin + 120, 143);
  const notesY = 160;
  const notesH = 56;
  doc.setFillColor(247, 247, 247);
  doc.rect(margin, notesY, W - 2 * margin, notesH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(26, 26, 26);
  doc.text("NOTES", margin, notesY + 12);
  if (grnNotes.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(grnNotes, margin + 6, notesY + 26, { maxWidth: W - 2 * margin - 12 });
  }
  const numX  = margin;
  const nameX = margin + 30;
  const oldCX = margin + 285;
  const qtyCX = margin + 355;
  const endCX = margin + 427;
  const tableTop = 250;
  const headerH = 28;
  doc.setFillColor(242, 242, 242);
  doc.rect(margin, tableTop - headerH + 12, W - 2 * margin, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(26, 26, 26);
  doc.text("NO", numX + 10, tableTop - 2, { align: "center" });
  doc.text("PRODUCT NAME", nameX, tableTop - 2);
  doc.text("START", oldCX, tableTop + 5, { align: "center" });
  doc.text("BALANCE", oldCX, tableTop - 5, { align: "center" });
  doc.text("ORDER", qtyCX, tableTop + 5, { align: "center" });
  doc.text("QTY", qtyCX, tableTop - 5, { align: "center" });
  doc.text("ENDING", endCX, tableTop + 5, { align: "center" });
  doc.text("BALANCE", endCX, tableTop - 5, { align: "center" });
  const sorted = [...entries].sort((a, b) => a.productName.localeCompare(b.productName));
  const rowH = 26;
  let y = tableTop + 16;
  let totalQty = 0;
  sorted.forEach((row, idx) => {
    totalQty += row.qty;
    if (idx % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 2, W - 2 * margin, rowH, "F");
    }
    doc.setDrawColor(224, 224, 224);
    doc.setLineWidth(0.4);
    doc.line(margin, y + rowH - 2, W - margin, y + rowH - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(String(idx + 1), numX + 10, y + 14, { align: "center" });
    doc.setFontSize(9.5);
    doc.setTextColor(38, 38, 38);
    doc.text(row.productName, nameX, y + 14);
    doc.text(String(row.starting), oldCX, y + 14, { align: "center" });
    doc.text(String(row.qty), qtyCX, y + 14, { align: "center" });
    doc.text(String(row.ending), endCX, y + 14, { align: "center" });
    y += rowH;
  });
  doc.setDrawColor(77, 77, 77);
  doc.setLineWidth(0.6);
  doc.line(margin, y - 2, W - margin, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(26, 26, 26);
  doc.text("TOTAL ORDER QTY", nameX, y + 14);
  doc.text(String(totalQty), qtyCX, y + 14, { align: "center" });
  y += rowH;
  const pageH = 842;
  const sigY = Math.max(y + 70, pageH - 110);
  const sigW = 180;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(128, 128, 128);
  doc.text("RECEIVED BY", margin, sigY - 14);
  doc.setDrawColor(77, 77, 77);
  doc.setLineWidth(0.5);
  doc.line(margin, sigY, margin + sigW, sigY);
  const rightSigX = W - margin - sigW;
  doc.text("ORDER PROCESSED BY", rightSigX, sigY - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(38, 38, 38);
  doc.text("Hamza Riazuddin", rightSigX, sigY - 4);
  doc.line(rightSigX, sigY, rightSigX + sigW, sigY);
  doc.save(`${grn} - GRN.pdf`);
};

// Exports a branch order as an Excel file following the same format as the
// "Order Forms" export on the Office page (PRODUCT NAME / DATE / BRANCH / TYPE / QTY).
// Branch-specific: every row carries this branch's name, and the file is
// always named after the branch (e.g. BoudoirOrder.xlsx).
export const exportToExcel = (entries: GrnEntry[], config: BranchConfig, dateStr: string) => {
  const toExcelDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return Math.floor((d.getTime() - epoch.getTime()) / 86400000);
  };

  const transformedData = entries.map((e) => ({
    "PRODUCT NAME": e.productName,
    "DATE": toExcelDate(dateStr),
    "BRANCH": config.displayName,
    "TYPE": "ORDER",
    "QTY": e.qty,
  }));

  const ws = XLSX.utils.json_to_sheet(transformedData, {
    header: ["PRODUCT NAME", "DATE", "BRANCH", "TYPE", "QTY"],
  });
  // Format DATE column as dd/mm/yyyy
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const cell = ws[XLSX.utils.encode_cell({ r: R, c: 1 })];
    if (cell && typeof cell.v === "number") {
      cell.t = "n"; cell.z = "dd/mm/yyyy";
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, `${config.orderExportFilename}.xlsx`);
};
