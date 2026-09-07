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
        margin: "2px -6px 0 -6px",
        padding: "8px 6px 12px 6px",
        background: "hsl(var(--muted) / 0.35)",
        borderRadius: "12px",
      }}
    >
      {/* Top half: row data (tap to collapse) */}
      <div
        onClick={onCollapse}
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: "4px",
          padding: "0 0 8px 0",
          alignItems: "start",
          cursor: "pointer",
        }}
      >
        {selectedProduct ? (
          <>
            <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>
              {showDate ? dateStr : ""}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : row.QTY > 0 ? "hsl(142 65% 38%)" : "hsl(var(--foreground))", textAlign: "center" }}>
              {row.QTY > 0 ? "+" : ""}{row.QTY}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
              {row["ENDING BALANCE"] ?? "—"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>
              {row.TYPE || "—"}
            </div>
            <div />
          </>
        ) : (
          <>
            <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>
              {showDate ? dateStr : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>
                {row["PRODUCT NAME"] || "—"}
              </div>
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : row.QTY > 0 ? "hsl(142 65% 38%)" : "hsl(var(--foreground))", textAlign: "center" }}>
              {row.QTY > 0 ? "+" : ""}{row.QTY}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
              {row["ENDING BALANCE"] ?? "—"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>
              {row.TYPE || "—"}
            </div>
          </>
        )}
      </div>

      {/* Bottom half: day name, actions, therapist pill */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: "4px",
          padding: "8px 0 0 0",
          borderTop: "0.5px solid hsl(var(--border) / 0.2)",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
          {fmtDayName(row.DATE)}
        </div>

        {/* Edit + Delete buttons */}
        <div style={{ gridColumn: selectedProduct ? "2 / 4" : "2 / 5", display: "flex", gap: "10px", alignItems: "center" }}>
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
                opacity: isDeleting ? 0.5 : 1,
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>

        {/* Therapist pill */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          {canCycleTherapist && therapistCycleList.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); onCycleTherapist(); }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <span
                style={{
                  ...(pillTherapist
                    ? therapistPillStyle(pillTherapist, therapistCycleList)
                    : { background: "none", color: "hsl(var(--muted-foreground))", border: "0.5px dashed hsl(var(--border))" }),
                  padding: "3px 8px",
                  borderRadius: "999px",
                  fontSize: "8px",
                  fontWeight: 600,
                  fontFamily: "Raleway, inherit",
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                {pillTherapist ?? "NONE"}
              </span>
            </button>
          ) : pillTherapist ? (
            <span
              style={{
                ...therapistPillStyle(pillTherapist, branchTherapists),
                padding: "3px 8px",
                borderRadius: "999px",
                fontSize: "8px",
                fontWeight: 600,
                fontFamily: "Raleway, inherit",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {pillTherapist}
            </span>
          ) : (
            <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }} />
          )}
        </div>
      </div>
    </div>
  );
};