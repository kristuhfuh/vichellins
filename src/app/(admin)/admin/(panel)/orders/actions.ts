"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { done, fail, friendlyError, type ActionState } from "@/lib/admin/errors";
import { formString } from "@/lib/admin/util";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const STATUSES = ["confirmed", "packed", "out_for_delivery", "delivered", "cancelled", "refunded"];

export async function setOrderStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const id = formString(form, "id");
  const status = formString(form, "status");
  if (!id || !STATUSES.includes(status)) return fail("Choose a valid status.");
  const note = formString(form, "note").slice(0, 300);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: id,
    p_status: status,
    p_note: note || null,
  });
  if (error) return fail(friendlyError(error));
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
  return done(`Order marked as ${status.replace(/_/g, " ")}.`);
}

export async function setPaymentStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const id = formString(form, "id");
  const status = formString(form, "payment_status");
  // Refunds go through the order status so stock and the timeline stay consistent.
  if (!id || !["unpaid", "paid", "failed"].includes(status)) return fail("Choose a payment status.");

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ payment_status: status }).eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return done(`Payment marked as ${status}.`);
}

export async function saveInternalNotes(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  const id = formString(form, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ internal_notes: formString(form, "internal_notes").slice(0, 2000) || null })
    .eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath(`/admin/orders/${id}`);
  return done("Notes saved.");
}

const orderSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's name."),
  phone: z.string().trim(),
  email: z.string().trim().max(200),
  address: z.string().trim().min(8, "Enter the full delivery address."),
  zone_id: z.string().uuid("Choose a delivery area."),
  payment: z.enum(["transfer", "cod"]),
  notes: z.string().trim().max(500),
  code: z.string().trim().max(40),
  source: z.enum(["whatsapp", "instagram", "tiktok", "phone", "walk-in", "other"]),
  items: z
    .array(z.object({ variant_id: z.string().uuid(), qty: z.number().int().min(1).max(10) }))
    .min(1, "Add at least one item.")
    .max(50),
});

const placeOrderErrors: Record<string, string> = {
  invalid_name: "Enter the customer's name.",
  invalid_phone: "Enter a valid Nigerian phone number.",
  invalid_address: "Enter the full delivery address.",
  invalid_zone: "That delivery area isn't available.",
  invalid_items: "Add at least one item.",
  invalid_quantity: "Quantities must be between 1 and 10.",
  variant_unavailable: "One of the items is no longer on sale.",
  insufficient_stock: "There isn't enough stock for one of the items.",
  invalid_discount: "That discount code isn't valid for this order.",
  payment_method_unavailable: "That payment method isn't available.",
};

/** Records an order that arrived outside the website, such as a WhatsApp or phone order. */
export async function createManualOrder(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(COMMERCE);
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return fail("The form data was corrupted. Reload the page and try again.");
  }
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  const o = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_name: o.name,
    p_phone: o.phone,
    p_email: o.email || null,
    p_address: o.address,
    p_zone_id: o.zone_id,
    p_payment: o.payment,
    p_notes: o.notes || null,
    p_items: o.items,
    p_discount_code: o.code || null,
    p_source: o.source,
  });
  if (error) {
    const known = Object.keys(placeOrderErrors).find((k) => error.message.includes(k));
    if (known === "insufficient_stock" && error.details) return fail(`Not enough stock for ${error.details}.`);
    return fail(known ? placeOrderErrors[known] : friendlyError(error));
  }
  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect(`/admin/orders/${row.order_id}?created=1`);
}
