const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number) {
  return naira.format(amount);
}

export const swatches: Record<string, string> = {
  Midnight: "#1b2433",
  Black: "#1a1a1a",
  Graphite: "#4a4f57",
  Silver: "#cfd3d9",
  White: "#e9ecf0",
  Gold: "#d9b66a",
  Blue: "#3b6fc4",
  Green: "#2f6b57",
};

export function warrantyLabel(months: number, type: string) {
  if (type === "none" || months === 0) return "No warranty";
  const length = months % 12 === 0 ? `${months / 12} year${months === 12 ? "" : "s"}` : `${months} months`;
  return `${length} ${type === "manufacturer" ? "manufacturer" : "store"} warranty`;
}
