export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function specKey(label: string): string {
  const key = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return /^[a-z]/.test(key) ? key : `f_${key}`;
}

/** Whole naira from a form field. Returns null for blank or invalid input. */
export function parseNaira(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").replace(/[₦,\s]/g, "");
  if (text === "") return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export const dateTime = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const dateOnly = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
});

/** Option names like "Screen size" line up with spec keys like "screen_size". */
export function optionKey(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "_");
}

/** Nigerian numbers as wa.me expects them: 08012345678 becomes 2348012345678. */
export function toWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

export const STATUS_FLOW: Record<string, { next: { status: string; label: string }[]; cancel: boolean }> = {
  pending: { next: [{ status: "confirmed", label: "Confirm order" }], cancel: true },
  confirmed: { next: [{ status: "packed", label: "Mark as packed" }], cancel: true },
  packed: { next: [{ status: "out_for_delivery", label: "Out for delivery" }], cancel: true },
  out_for_delivery: { next: [{ status: "delivered", label: "Mark as delivered" }], cancel: true },
  delivered: { next: [{ status: "refunded", label: "Refund order" }], cancel: false },
  cancelled: { next: [], cancel: false },
  refunded: { next: [], cancel: false },
};
