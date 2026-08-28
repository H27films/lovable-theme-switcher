import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
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
  /** Thumbnail square size in px (default 48) */
  size?: number;
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
 * - Has image -> thumbnail with a change affordance (camera badge).
 * Uploads a compressed JPEG to PRODUCT_IMAGES/{productId}.jpg (upsert), stores
 * the public URL in AllFileProducts.IMAGES keyed by id, and reports back via
 * onUpdated so the host updates its state without a page refresh.
 */
export const ProductImage = ({ productId, imageUrl, onUpdated, size = 48 }: ProductImageProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bust, setBust] = useState(() => cacheBustMap.get(productId) ?? 0);

  // Reset the broken-image fallback when a different product/image arrives
  useEffect(() => {
    setLoadFailed(false);
    setBust(cacheBustMap.get(productId) ?? 0);
  }, [productId, imageUrl]);

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
      if (uploadError) throw new Error(uploadError.message || "Upload to storage failed");

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
    borderRadius: "8px",
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
    position: "relative",
  };

  return (
    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {uploading ? (
        <div style={{ ...thumbStyle, cursor: "wait" }}>
          <Loader2 size={Math.max(14, Math.round(size * 0.35))} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
        </div>
      ) : displayUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Change image"
          style={thumbStyle}
        >
          <img
            src={displayUrl}
            alt=""
            onError={() => setLoadFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <span style={{ position: "absolute", right: "3px", bottom: "3px", width: `${Math.max(16, Math.round(size * 0.34))}px`, height: `${Math.max(16, Math.round(size * 0.34))}px`, borderRadius: "50%", background: "hsl(var(--foreground))", color: "hsl(var(--background))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={10} />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Add image"
          style={thumbStyle}
        >
          <ImagePlus size={Math.max(13, Math.round(size * 0.3))} style={{ color: "hsl(var(--muted-foreground))" }} />
          <span style={{ fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.06em", color: "hsl(var(--muted-foreground))", fontFamily: "Raleway, inherit" }}>ADD IMAGE</span>
        </button>
      )}

      {error && (
        <div style={{ maxWidth: "150px", fontSize: "10px", lineHeight: 1.35, color: "hsl(0 70% 50%)", textAlign: "center", fontFamily: "Raleway, inherit" }}>
          {error}
        </div>
      )}
    </div>
  );
};