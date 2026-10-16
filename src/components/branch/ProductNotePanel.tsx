import React from "react";
import type { ProductNoteApi } from "@/hooks/useProductNote";

const notesPanelStyle: React.CSSProperties = {
  width: "100%",
  background: "hsl(var(--foreground) / 0.07)",
  border: "none",
  borderRadius: "12px",
  padding: "10px",
  marginTop: "10px",
  boxSizing: "border-box",
  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.12)",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const notesBoxStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  borderRadius: 0,
  padding: 0,
  fontSize: "13px",
  lineHeight: 1.5,
  color: "hsl(var(--foreground))",
  whiteSpace: "pre-wrap",
  fontFamily: "Raleway, inherit",
};

const noteTextareaStyle: React.CSSProperties = {
  width: "100%",
  height: "110px",
  border: "0.5px solid hsl(var(--border))",
  borderRadius: "8px",
  padding: "8px 10px",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "hsl(var(--foreground))",
  background: "hsl(var(--background))",
  outline: "none",
  resize: "none",
  boxSizing: "border-box",
  fontFamily: "Raleway, inherit",
};

const noteSaveBtnStyle: React.CSSProperties = {
  background: "hsl(var(--foreground))",
  border: "none",
  borderRadius: "6px",
  padding: "4px 12px",
  fontSize: "12px",
  fontWeight: 600,
  color: "hsl(var(--background))",
  cursor: "pointer",
  flexShrink: 0,
};

const noteCancelBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "hsl(var(--muted-foreground))",
  fontSize: "12px",
  cursor: "pointer",
  flexShrink: 0,
};

// "Edit" white pill shown on the same bottom line as × (inside the panel box)
const noteEditBtnStyle: React.CSSProperties = {
  background: "hsl(0 0% 98%)",
  border: "none",
  borderRadius: "999px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
  fontFamily: "Raleway, inherit",
  fontWeight: 600,
  cursor: "pointer",
  padding: "5px 14px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
  flexShrink: 0,
};

// Close (×) button at the bottom-right of the notes panel box
const noteCloseBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "hsl(var(--muted-foreground))",
  cursor: "pointer",
  padding: 0,
  fontSize: "16px",
  lineHeight: 1,
  flexShrink: 0,
};

interface ProductNotePanelProps {
  api: ProductNoteApi;
  /** Container style — defaults to the standard notes panel box. */
  style?: React.CSSProperties;
}

/**
 * The product note panel body (read-only note → Edit → textarea → Save/×).
 * Renders nothing about *when* it is visible — callers gate on `api.showNotes`
 * and choose the container (inline under the image controls, or a modal).
 */
export const ProductNotePanel = ({ api, style }: ProductNotePanelProps) => {
  const {
    note,
    loadingNote,
    noteText,
    setNoteText,
    savingNote,
    noteError,
    editingNote,
    setEditingNote,
    close,
    save,
  } = api;

  return (
    <div style={{ ...notesPanelStyle, ...style }}>
      {loadingNote ? (
        <>
          <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>Loading note…</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <button type="button" onClick={close} title="Close note" style={noteCloseBtnStyle}>
              &times;
            </button>
          </div>
        </>
      ) : note !== null && !editingNote ? (
        <>
          <div style={notesBoxStyle}>{note}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              type="button"
              onClick={() => {
                setEditingNote(true);
                setNoteText(note ?? "");
              }}
              style={noteEditBtnStyle}
            >
              Edit
            </button>
            <button type="button" onClick={close} title="Close note" style={noteCloseBtnStyle}>
              &times;
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Type a note for this product…"
            style={noteTextareaStyle}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  if (note !== null) {
                    setEditingNote(false);
                  } else {
                    close();
                  }
                }}
                style={noteCancelBtnStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={savingNote || !noteText.trim()}
                style={noteSaveBtnStyle}
              >
                Save
              </button>
              {savingNote && (
                <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>Saving…</span>
              )}
            </div>
            <button type="button" onClick={close} title="Close note" style={noteCloseBtnStyle}>
              &times;
            </button>
          </div>
        </>
      )}
      {noteError && (
        <div style={{ fontSize: "11px", color: "hsl(0 70% 50%)", marginTop: "6px", fontFamily: "Raleway, inherit" }}>{noteError}</div>
      )}
    </div>
  );
};