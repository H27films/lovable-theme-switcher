import { useState, useRef } from "react";
import { X } from "lucide-react";

interface FullListPanelProps {
  open: boolean;
  onClose: () => void;
  headers: string[];
  data: string[][];
  onImport: (file: File) => void;
}

export default function FullListPanel({ open, onClose, headers, data, onImport }: FullListPanelProps) {
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? data.filter(row => row[0]?.toLowerCase().includes(search.toLowerCase()))
    : data;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 panel-overlay z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[900px] panel-bg z-[201] flex flex-col">
        <div className="flex justify-between items-center px-10 py-8 border-b border-border flex-shrink-0">
          <h2 className="text-sm font-light tracking-[0.15em] uppercase text-dim">Full Product List</h2>
          <div className="flex items-center gap-4">
            <input type="text" className="minimal-input text-[13px] font-light py-1.5 w-[200px]" placeholder="Filter products..." value={search} onChange={e => setSearch(e.target.value)} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
          </div>
        </div>
        <div className="px-10 py-5 border-b border-border flex-shrink-0 flex items-center gap-4">
          <label className="minimal-btn cursor-pointer">
            Import Excel
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && onImport(e.target.files[0])} />
          </label>
          <span className="text-[11px] text-muted-foreground">{data.length ? `${data.length} products` : "No file loaded"}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-10 pb-10 scrollbar-thin">
          {!filtered.length && !headers.length ? (
            <div className="text-center text-muted-foreground text-[13px] py-16 tracking-wider">Import an Excel file to view the full product list</div>
          ) : (
            <table className="w-full border-collapse mt-6">
              <thead>
                <tr className="border-b border-border-active">
                  {headers.map((h, i) => (
                    <th key={i} className={`label-uppercase font-normal pb-3 pt-4 ${i > 0 ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, ri) => (
                  <tr key={ri} className="border-b border-border">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`text-xs font-light text-dim py-3 ${ci > 0 ? "text-center" : ""}`}>{cell || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
