import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Theme is permanently locked to light mode — no toggling, no OS detection.
// Clean up any legacy classes / saved keys left over from the old light/sand
// toggle so every device renders identically from first paint.
document.documentElement.classList.remove("dark", "sand");
try {
  localStorage.removeItem("theme");
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
