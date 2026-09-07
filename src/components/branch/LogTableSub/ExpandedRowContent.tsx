import React from "react";
import { therapistPillStyle } from "@/lib/branchSimpleUtils";
import { type LogRow } from "@/lib/branchSimple";

interface ExpandedRowContentProps {
  row: LogRow;
  gridCols: string;
  selectedProduct: any;
  dateStr: string;
  showDate: boolean;
  fmtDayName: (d: string) => string;
  withinCutoff: boolean;
  isDeleting: boolean;
  pillTherapist: string | null;
  canCycleTherapist: boolean;
  therapistCycleList: string[];
  branchTherapists: string[];
  onUpdate?: unknown;
  onCollapse: () => void;
  onEditClick: () => void;
  onDeleteClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCycleTherapist: () => void;
}

export const ExpandedRowContent = ({
  row,
  gridCols,
  selectedProduct,
  dateStr,
  showDate,
  fmtDayName,
  withinCutoff,
  isDeleting,
  pillTherapist,
  canCycleTherapist,
  therapistCycleList,
  branchTherapists,
  onUpdate,
  onCollapse,
  onEditClick,
  onDeleteClick,
  onCycleTherapist,
}: ExpandedRowContentProps) => {
    return (
      <div
        style={{
            margin: "0",
            padding: "4px 0 8px 0",
      }}
    >
      

      {/* Bottom half: day name, actions, therapist pill */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: "4px",
          padding: "5px 0 0 0",
          borderTop: "0.5px solid hsl(var(--border) / 0.2)",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
  {showDate ? fmtDayName(row.DATE) : ""}
</div>

       {/* Edit + Delete buttons */}
<div style={{ gridColumn: selectedProduct ? "2 / 5" : "2 / 6", display: "flex", gap: "10px", alignItems: "center" }}>
  {onUpdate && withinCutoff && (
    <button
      onClick={(e) => { e.stopPropagation(); onEditClick(); }}
      style={{
        background: "hsl(var(--secondary))",
        color: "hsl(var(--secondary-foreground))",
        border: "none",
        cursor: "pointer",
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "Raleway, inherit",
        textTransform: "uppercase",
        lineHeight: 1,
      }}
    >
      Edit
    </button>
  )}
  {withinCutoff && (
    <button
      onClick={onDeleteClick}
      disabled={isDeleting}
      style={{
        background: "hsl(var(--destructive) / 0.1)",
        color: "hsl(var(--destructive))",
        border: "none",
        cursor: isDeleting ? "default" : "pointer",
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "Raleway, inherit",
        textTransform: "uppercase",
        lineHeight: 1,
        opacity: isDeleting ? 0.5 : 1,
      }}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  )}
  {/* Therapist pill inline after delete — same pill geometry as Edit/Delete
      so it lines up with them. Rendered as a single button/span (no nested
      wrapper) with identical padding, radius, font and line-height. */}
  {canCycleTherapist && therapistCycleList.length > 0 ? (
    <button
      onClick={(e) => { e.stopPropagation(); onCycleTherapist(); }}
      style={{
        ...(pillTherapist
          ? therapistPillStyle(pillTherapist, therapistCycleList)
          : { background: "none", color: "hsl(var(--muted-foreground))" }),
        border: pillTherapist ? "none" : "0.5px dashed hsl(var(--border))",
        cursor: "pointer",
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "Raleway, inherit",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {pillTherapist ?? "NONE"}
    </button>
  ) : pillTherapist ? (
    <span
      style={{
        ...therapistPillStyle(pillTherapist, branchTherapists),
        padding: "6px 12px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "Raleway, inherit",
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {pillTherapist}
    </span>
  ) : null}
</div>

       
    </div>
    </div>
  );
};