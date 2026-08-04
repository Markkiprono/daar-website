"use client";

/**
 * Opens the browser's print dialog, which on every platform offers "Save as
 * PDF" — a real file the guest keeps, rather than a cache that expires at the
 * worst moment. Hidden from the printed page itself.
 */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      Download / print this menu
    </button>
  );
}
