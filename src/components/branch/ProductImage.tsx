import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "PRODUCT_IMAGES";
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // reject absurd files before decoding
const MAX_DIMENSION = 1024; // longest edge after resize (px)
const JPEG_QUALITY = 0.82;

// Per-product cache busters that survive component remounts (SPA session).
// Bumped after each successful replace so the CDN/browser-cached old image
// is never shown again for that product.
const cacheBustMap = new Map<number, number>();

interface ProductImageProps {
  /** AllFileProducts.id — used as the storage filename ({id}.jpg) and the DB key. Never the product name. */
  productId: number;
  /** Current value of AllFileProducts.IMAGES (public URL), null when the product has no image yet. */
  imageUrl: string | null;
  /** Called after a successful upload + DB update so the host can refresh its state instantly. */
  onUpdated: (url: string | null) => void | Promise<void>;
  /** Thumbnail square size in px (default 64) */
  size?: number;
  /** Product name — when provided, enables the Product Note feature (info icon
   *  next to the image controls) backed by the public "Notes" table. Branch
   *  ProductCard does not pass this, so those cards are unaffected. */
  productName?: string | null;
}

/**
 * Downscale/re-encode any picked image to a compact JPEG via canvas, so large
 * phone photos don't bloat the Storage bucket (typ. 3-6 MB -> ~100-300 KB).
 */
const compressImage = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("This device cannot process images"));
          return;
        }
        // Flatten transparency (PNG) onto white so JPEG output has no black holes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the selected image"))),
          "image/jpeg",
          JPEG_QUALITY
        );
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Image processing failed"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file could not be read as an image"));
    };
    img.src = objectUrl;
  });

/**
 * Shared product image manager rendered inside both product card areas
 * (branch ProductCard + Office search result page).
 *
 * - No image  -> "Add Image" button that opens the device file picker.
 * - Has image -> thumbnail (tap to enlarge) with a Change Image button beside it.
 * Uploads a compressed JPEG to PRODUCT_IMAGES/{productId}.jpg (upsert), stores
 * the public URL in AllFileProducts.IMAGES keyed by id, and reports back via
 * onUpdated so the host updates its state without a page refresh.
 */
export const ProductImage = ({ productId, imageUrl, onUpdated, size = 64, productName }: ProductImageProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bust, setBust] = useState(() => cacheBustMap.get(productId) ?? 0);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Product note state (Notes table, keyed by PRODUCT NAME)
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState<string | null>(null); // null = not fetched yet
  const [loadingNote, setLoadingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);

  const fetchNote = async () => {
    const resolvedName = productName?.trim();
    if (!resolvedName) {
      console.log("[ProductImage] fetchNote: no productName, skipping");
      setNote(null);
      setLoadingNote(false);
      return;
    }
    setLoadingNote(true);
    setNoteError(null);
    try {
      console.log("[ProductImage] fetchNote: looking up note for", JSON.stringify(resolvedName));
      // Use case-insensitive match so "Ocean 88 Aqua Cream (2.2kg)" finds
      // rows stored with any capitalisation of the product name.
      const { data, error: dbError } = await (supabase as any)
        .from("Notes")
        .select("NOTES")
        .ilike("PRODUCT NAME", resolvedName)
        .order("created_at", { ascending: false })
        .limit(1);
      if (dbError) throw dbError;
      console.log("[ProductImage] fetchNote: raw data ->", data);
      setNote(data?.[0]?.NOTES ?? null);
    } catch (err) {
      console.error("[ProductImage] fetchNote error:", err);
      setNote(null);
    } finally {
      setLoadingNote(false);
    }
  };

  const saveNote = async () => {
    if (!productName) return;
    setSavingNote(true);
    setNoteError(null);
    try {
      if (note !== null) {
        const { error: dbError } = await (supabase as any)
          .from("Notes")
          .update({ "NOTES": noteText })
          .ilike("PRODUCT NAME", productName?.trim() ?? productName);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await (supabase as any)
          .from("Notes")
          .insert({ "PRODUCT NAME": productName, "NOTES": noteText });
        if (dbError) throw dbError;
      }
      setNote(noteText);
      setNoteText("");
      setEditingNote(false);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Could not save the product note");
    } finally {
      setSavingNote(false);
    }
  };

  const openNotes = () => {
    if (showNotes) {
      closeNotes();
      return;
    }
    setNoteError(null);
    setEditingNote(false);
    setNoteText("");
    setShowNotes(true);
    fetchNote();
  };

  const closeNotes = () => {
    setShowNotes(false);
    setEditingNote(false);
    setNote(null);
    setNoteText("");
    setNoteError(null);
  };

  // Reset the broken-image fallback when a different product/image arrives
  useEffect(() => {
    setLoadFailed(false);
    setBust(cacheBustMap.get(productId) ?? 0);
  }, [productId, imageUrl]);

  // Close the enlarged view with Escape (desktop nicety)
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen]);

  const hasImage = !!imageUrl && !loadFailed;

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);

    // Validate before doing anything
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Please choose a JPG or PNG.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("Image is too large. Please choose a file under 15 MB.");
      return;
    }

    setUploading(true);
    try {
      const blob = await compressImage(file);
      const path = `${productId}.jpg`; // deterministic filename from the product id

      // upsert: replacing an image overwrites the same object, no orphaned files
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (uploadError) {
        console.error("ProductImage upload failed:", path, uploadError);
        throw new Error(`Storage upload failed for "${path}" — ${uploadError.message || "unknown error"}`);
      }

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Could not get the image URL");

      // Store only the URL in AllFileProducts — the binary lives in Storage
      const { error: dbError } = await (supabase as any)
        .from("AllFileProducts")
        .update({ IMAGES: publicUrl })
        .eq("id", productId);
      if (dbError) throw new Error(dbError.message || "Could not save the image to the product");

      // Bust caches so the replaced image appears immediately, then inform the host
      const nextBust = (cacheBustMap.get(productId) ?? 0) + 1;
      cacheBustMap.set(productId, nextBust);
      setBust(nextBust);
      setLoadFailed(false);
      await onUpdated(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while uploading");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file
    }
  };

  const displayUrl = hasImage && imageUrl
    ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${bust}`
    : null;

  const thumbStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "10px",
    border: "0.5px solid hsl(var(--border))",
    background: "hsl(var(--muted) / 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "3px",
    cursor: "pointer",
    padding: 0,
    overflow: "hidden",
    flexShrink: 0,
  };

  // Small round "Change Image" button that sits beside the thumbnail
  const changeBtnStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "0.5px solid hsl(var(--border))",
    background: "hsl(var(--muted) / 0.35)",
    color: "hsl(var(--muted-foreground))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  };

  // Small black circle with a white "+" (shown while the product has no image yet)
  const addPlusCircleStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "#000000",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    fontSize: "18px",
    fontWeight: 300,
    lineHeight: 1,
    color: "#ffffff",
    fontFamily: "Raleway, inherit",
  };

  // Round circle with an italic lowercase "i" — opens the product note.
  const infoBtnStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "hsl(0 0% 98%)",
    border: "0.5px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
    fontSize: "13px",
    fontWeight: 600,
    fontStyle: "italic",
    lineHeight: 1,
    fontFamily: "Raleway, inherit",
  };

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

  // "Edit" link shown below an existing note (inside the panel box)
  const noteEditBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
    cursor: "pointer",
    padding: 0,
    fontFamily: "Raleway, inherit",
    textDecoration: "underline",
    alignSelf: "flex-start",
  };

  // Close (×) button that sits inside the top-right of the notes panel box
  const noteCloseBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "hsl(var(--muted-foreground))",
    cursor: "pointer",
    padding: 0,
    fontSize: "16px",
    lineHeight: 1,
    alignSelf: "flex-end",
  };

  return (
    <div style={{ position: "relative", flexShrink: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {uploading && !displayUrl ? (
        <div style={{ ...addPlusCircleStyle, cursor: "wait" }}>
          <Loader2 size={14} className="animate-spin" style={{ color: "#ffffff" }} />
        </div>
      ) : uploading ? (
        <div style={{ ...thumbStyle, cursor: "wait" }}>
          <Loader2 size={Math.max(14, Math.round(size * 0.35))} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
        </div>
      ) : displayUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            title="View image"
            style={thumbStyle}
          >
            <img
              src={displayUrl}
              alt=""
              onError={() => setLoadFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Change image"
            style={changeBtnStyle}
          >
            <Camera size={15} />
          </button>
          {productName && (
            <button
              type="button"
              onClick={openNotes}
              title="Product note"
              style={infoBtnStyle}
            >
              i
            </button>
          )}
          {showNotes && (
            <button
              type="button"
              onClick={closeNotes}
              title="Close note"
              style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0, fontSize: "16px", lineHeight: 1 }}
            >
              &times;
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Add image"
            style={addPlusCircleStyle}
          >
            +
          </button>
          {productName && (
            <button
              type="button"
              onClick={openNotes}
              title="Product note"
              style={infoBtnStyle}
            >
              i
            </button>
          )}
          {showNotes && (
            <button
              type="button"
              onClick={closeNotes}
              title="Close note"
              style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 0, fontSize: "16px", lineHeight: 1 }}
            >
              &times;
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ maxWidth: "150px", fontSize: "10px", lineHeight: 1.35, color: "hsl(0 70% 50%)", textAlign: "center", fontFamily: "Raleway, inherit" }}>
          {error}
        </div>
      )}

      {showNotes && productName && (
        <div style={notesPanelStyle}>
          {loadingNote ? (
            <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>Loading note…</div>
          ) : note !== null ? (
            <div style={notesBoxStyle}>{note}</div>
          ) : (
            <>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Type a note for this product…"
                style={noteTextareaStyle}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={closeNotes}
                  style={noteCancelBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={savingNote || !noteText.trim()}
                  style={noteSaveBtnStyle}
                >
                  Save
                </button>
                {savingNote && (
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>Saving…</span>
                )}
              </div>
            </>
          )}
          {noteError && (
            <div style={{ fontSize: "11px", color: "hsl(0 70% 50%)", marginTop: "6px", fontFamily: "Raleway, inherit" }}>{noteError}</div>
          )}
        </div>
      )}

      {/* Enlarged view — tap anywhere (or Escape) to close */}
      {zoomOpen && displayUrl && createPortal(
        <div
          onClick={() => setZoomOpen(false)}
          title="Tap anywhere to close"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
            touchAction: "none",
            overscrollBehavior: "contain",
            padding: "16px",
          }}
        >
          <img
            src={displayUrl}
            alt=""
            style={{
              maxWidth: "92vw",
              maxHeight: "86vh",
              objectFit: "contain",
              borderRadius: "12px",
              background: "hsl(var(--background))",
              boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4)",
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};