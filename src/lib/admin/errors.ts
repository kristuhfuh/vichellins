const messages: Record<string, string> = {
  forbidden: "You don't have permission to do that.",
  slug_taken: "Another product already uses that web address. Change the address and save again.",
  sku_taken: "That SKU is already used by another variant. SKUs must be unique.",
  duplicate_variant: "Two variants have the same combination of options.",
  invalid_variants: "A variant doesn't match the product's options, or a SKU is empty or repeated.",
  invalid_options: "Options need unique names and at least one unique value each (max 3 options).",
  invalid_price: "Prices can't be negative, and the compare-at price can't be lower than the price.",
  invalid_stock: "Stock can't be negative.",
  invalid_slug: "The web address can only use lowercase letters, numbers and hyphens.",
  name_required: "Enter a name.",
  category_required: "Choose a category.",
  publish_needs_active_variant: "Add at least one active variant before publishing.",
  product_not_found: "That product no longer exists.",
  variant_not_found: "A variant on this form no longer exists. Reload the page and try again.",
  invalid_transition: "That status change isn't allowed from the order's current status.",
  order_not_found: "That order no longer exists.",
  invalid_reason: "Choose a valid reason for the stock change.",
  invalid_delta: "Enter a quantity other than zero.",
  variant_not_found_stock: "That variant no longer exists.",
};

type DbError = { code?: string; message?: string } | null | undefined;

/** Turns a Supabase/Postgres error into something a shop owner can act on. */
export function friendlyError(error: DbError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const message = error.message ?? "";
  if (messages[message]) return messages[message];
  const known = Object.keys(messages).find((k) => message.includes(k));
  if (known) return messages[known];
  switch (error.code) {
    case "23505":
      return "That already exists. Use a different name or address.";
    case "23503":
      return "That can't be removed because something else still uses it.";
    case "23514":
      return "One of the values isn't allowed. Check the numbers and try again.";
    case "42501":
      return "You don't have permission to do that.";
    default:
      return fallback;
  }
}

export type ActionState = {
  ok?: boolean;
  message?: string;
} | null;

export const fail = (message: string): ActionState => ({ ok: false, message });
export const done = (message: string): ActionState => ({ ok: true, message });
