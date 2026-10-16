import { useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Product note state + fetch/save logic for the public "Notes" table (keyed by
 * AllFileProducts.PRODUCT NAME, matched case-insensitively).
 *
 * Shared by the ProductImage info button (Office search result + branch product
 * card) and the branch search dropdown chips (ProductNoteChip) so every surface
 * reads/writes the exact same row.
 */
export interface ProductNoteApi {
  /** True while the note panel should be visible. */
  showNotes: boolean;
  /** Saved note text — null until fetched, and null when the product has none. */
  note: string | null;
  loadingNote: boolean;
  /** Text currently in the editor. */
  noteText: string;
  setNoteText: Dispatch<SetStateAction<string>>;
  savingNote: boolean;
  noteError: string | null;
  /** True while the textarea replaces the read-only note. */
  editingNote: boolean;
  setEditingNote: Dispatch<SetStateAction<boolean>>;
  /** Opens the panel (fetching the note), or closes it when already open. */
  toggle: () => void;
  /** Closes the panel and clears all transient note state. */
  close: () => void;
  /** Persists the editor text — update when a note exists, insert otherwise. */
  save: () => Promise<void>;
}

export const useProductNote = (productName?: string | null): ProductNoteApi => {
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
      console.log("[useProductNote] fetchNote: no productName, skipping");
      setNote(null);
      setLoadingNote(false);
      return;
    }
    setLoadingNote(true);
    setNoteError(null);
    try {
      console.log("[useProductNote] fetchNote: looking up note for", JSON.stringify(resolvedName));
      // Use case-insensitive match so "Ocean 88 Aqua Cream (2.2kg)" finds
      // rows stored with any capitalisation of the product name.
      const { data, error: dbError } = await (supabase as any)
        .from("Notes")
        .select("NOTES")
        .ilike("PRODUCT NAME", resolvedName)
        .order("created_at", { ascending: false })
        .limit(1);
      if (dbError) throw dbError;
      console.log("[useProductNote] fetchNote: raw data ->", data);
      setNote(data?.[0]?.NOTES ?? null);
    } catch (err) {
      console.error("[useProductNote] fetchNote error:", err);
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

  const close = () => {
    setShowNotes(false);
    setEditingNote(false);
    setNote(null);
    setNoteText("");
    setNoteError(null);
  };

  const toggle = () => {
    if (showNotes) {
      close();
      return;
    }
    setNoteError(null);
    setEditingNote(false);
    setNoteText("");
    setShowNotes(true);
    fetchNote();
  };

  return {
    showNotes,
    note,
    loadingNote,
    noteText,
    setNoteText,
    savingNote,
    noteError,
    editingNote,
    setEditingNote,
    toggle,
    close,
    save: saveNote,
  };
};