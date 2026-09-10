"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="invoice-print-btn"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      Print / Save as PDF
    </button>
  );
}
