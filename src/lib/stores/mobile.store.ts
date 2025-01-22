import { readable } from "svelte/store";

export const isMobile = readable(false, (set) => {
  const m = window.matchMedia("(max-width: 768px)");
  set(m.matches);
  const el = (e: MediaQueryListEvent) => set(e.matches);
  m.addEventListener("change", el);
  return () => m.removeEventListener("change", el);
});