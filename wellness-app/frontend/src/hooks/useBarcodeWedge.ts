import { useEffect, useRef } from "react";

// USB / Bluetooth barcode scanners in "keyboard wedge" mode type the digits
// very quickly and finish with Enter. This listens for that burst anywhere on
// the page (when no input has focus) so a scan can open the barcode sheet
// without tapping first. Human typing is slower than MAX_GAP_MS, so it's ignored.
const MAX_GAP_MS = 80;
const MIN_LENGTH = 8;

export function useBarcodeWedge(onScan: (code: string) => void, enabled = true) {
  const handlerRef = useRef(onScan);
  handlerRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    let buffer = "";
    let last = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      if (e.key === "Enter") {
        if (buffer.length >= MIN_LENGTH) {
          e.preventDefault();
          handlerRef.current(buffer);
        }
        buffer = "";
        return;
      }
      if (/^\d$/.test(e.key)) {
        if (now - last > MAX_GAP_MS) buffer = "";
        buffer += e.key;
        last = now;
      } else if (e.key.length === 1) {
        buffer = ""; // any other printable key means this isn't a scan
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
