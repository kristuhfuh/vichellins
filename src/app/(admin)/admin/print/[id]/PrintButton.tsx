"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="h-10 rounded-full bg-marine-700 px-5 text-sm font-semibold text-white hover:bg-marine-800">
      Print
    </button>
  );
}
