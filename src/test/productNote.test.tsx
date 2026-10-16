import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Shared chainable Supabase stub for the "Notes" table. `state.result` is
// mutable so each test can serve fetch results (insert vs update paths).
const { noteMock } = vi.hoisted(() => {
  const state: { result: { data: unknown[]; error: unknown } } = {
    result: { data: [], error: null },
  };
  const q: any = {};
  for (const m of ["select", "ilike", "order", "limit", "update", "insert"]) {
    q[m] = vi.fn((..._args: unknown[]) => q);
  }
  // Thenable chain: `await ...limit(1)` / `await ...ilike(...)` resolves with
  // whatever the current fetch result is.
  q.then = (onFulfilled: any, onRejected: any) => Promise.resolve(state.result).then(onFulfilled, onRejected);
  return { noteMock: { q, state } };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => noteMock.q) },
}));

import { useProductNote } from "@/hooks/useProductNote";
import { ProductNoteChip } from "@/components/branch/ProductNoteChip";
import { ProductList } from "@/components/branch/ProductList";

const PRODUCT = "Ocean 88 Aqua Cream (2.2kg)";

const rowProduct = {
  id: 7,
  "PRODUCT NAME": PRODUCT,
  "UNITS/ORDER": null,
  "BOUDOIR BALANCE": 4,
  "Colour": null,
};

/** Flush all pending microtasks (the chainable thenable) inside act. */
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

beforeEach(() => {
  vi.clearAllMocks();
  noteMock.state.result = { data: [], error: null };
});

describe("useProductNote", () => {
  it("fetches the note (case-insensitive ilike) when opened", async () => {
    noteMock.state.result = { data: [{ NOTES: "Handle with care" }], error: null };
    const { result } = renderHook(() => useProductNote(PRODUCT));

    expect(result.current.showNotes).toBe(false);
    await act(async () => { result.current.toggle(); });
    await flush();

    expect(result.current.showNotes).toBe(true);
    expect(result.current.loadingNote).toBe(false);
    expect(result.current.note).toBe("Handle with care");
    expect(noteMock.q.select).toHaveBeenCalledWith("NOTES");
    expect(noteMock.q.ilike).toHaveBeenCalledWith("PRODUCT NAME", PRODUCT);
  });

  it("leaves note null when the product has no Notes row", async () => {
    const { result } = renderHook(() => useProductNote(PRODUCT));
    await act(async () => { result.current.toggle(); });
    await flush();

    expect(result.current.note).toBeNull();
    expect(result.current.loadingNote).toBe(false);
  });

  it("clears note state when toggled closed", async () => {
    noteMock.state.result = { data: [{ NOTES: "Handle with care" }], error: null };
    const { result } = renderHook(() => useProductNote(PRODUCT));
    await act(async () => { result.current.toggle(); });
    await flush();
    expect(result.current.note).toBe("Handle with care");

    await act(async () => { result.current.toggle(); });
    expect(result.current.showNotes).toBe(false);
    expect(result.current.note).toBeNull();
  });

  it("inserts a Notes row when saving a product that has none", async () => {
    const { result } = renderHook(() => useProductNote(PRODUCT));
    await act(async () => { result.current.toggle(); });
    await flush();

    await act(async () => { result.current.setNoteText("New note"); });
    await act(async () => { await result.current.save(); });

    expect(noteMock.q.insert).toHaveBeenCalledWith({ "PRODUCT NAME": PRODUCT, "NOTES": "New note" });
    expect(noteMock.q.update).not.toHaveBeenCalled();
    expect(result.current.note).toBe("New note");
    expect(result.current.editingNote).toBe(false);
  });

  it("updates the existing Notes row when a note already exists", async () => {
    noteMock.state.result = { data: [{ NOTES: "Old note" }], error: null };
    const { result } = renderHook(() => useProductNote(PRODUCT));
    await act(async () => { result.current.toggle(); });
    await flush();

    await act(async () => { result.current.setNoteText("Updated note"); });
    await act(async () => { await result.current.save(); });

    expect(noteMock.q.update).toHaveBeenCalledWith({ NOTES: "Updated note" });
    expect(noteMock.q.insert).not.toHaveBeenCalled();
    expect(result.current.note).toBe("Updated note");
  });
});

describe("ProductNoteChip", () => {
  it("opens the note modal on click without bubbling to the row", async () => {
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick}>
        <ProductNoteChip productName={PRODUCT} />
      </div>
    );

    fireEvent.click(screen.getByTitle("Product note"));
    expect(rowClick).not.toHaveBeenCalled();

    // Modal shows the product name header; with no saved note (default mock
    // result) the editor opens directly once the fetch settles.
    expect(await screen.findByText(PRODUCT)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type a note for this product…")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Close note"));
    await waitFor(() => expect(screen.queryByText(PRODUCT)).not.toBeInTheDocument());
  });

  it("shows the saved note in the modal once fetched", async () => {
    noteMock.state.result = { data: [{ NOTES: "Patch test required" }], error: null };
    render(<ProductNoteChip productName={PRODUCT} />);

    fireEvent.click(screen.getByTitle("Product note"));
    expect(await screen.findByText("Patch test required")).toBeInTheDocument();

    // Backdrop tap closes the modal.
    fireEvent.click(screen.getByTitle("Tap anywhere to close"));
    await waitFor(() => expect(screen.queryByText("Patch test required")).not.toBeInTheDocument());
  });
});

describe("ProductList rows", () => {
  it("renders the note chip and keeps row selection on the row itself", async () => {
    noteMock.state.result = { data: [{ NOTES: "Handle with care" }], error: null };
    const onSelect = vi.fn();
    render(
      <ProductList
        products={[rowProduct]}
        isFav={() => false}
        balanceKey="BOUDOIR BALANCE"
        favouritesLabel="Favourites"
        search=""
        showDropdown
        onSelect={onSelect}
      />
    );

    // Selecting the row still works.
    fireEvent.click(screen.getByText(PRODUCT));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(rowProduct);

    // The chip opens the note instead of selecting the row.
    fireEvent.click(screen.getByTitle("Product note"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Handle with care")).toBeInTheDocument();
    // Balance still renders next to the chip.
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
