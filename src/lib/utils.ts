import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleInputFocus() {
  if (typeof window === "undefined") return;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
  if (!isTouchDevice) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover");
  }
}

export function handleInputBlur() {
  if (typeof window === "undefined") return;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
  if (!isTouchDevice) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute("content", "width=device-width, initial-scale=1.0, viewport-fit=cover");
  }
}

