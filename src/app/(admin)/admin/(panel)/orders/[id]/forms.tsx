"use client";

import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { inputClass } from "@/components/admin/ui";
import { saveInternalNotes, setOrderStatus, setPaymentStatus } from "../actions";

export function StatusActions({
  id,
  next,
  canCancel,
  isDelivered,
}: {
  id: string;
  next: { status: string; label: string }[];
  canCancel: boolean;
  isDelivered: boolean;
}) {
  if (next.length === 0 && !canCancel) {
    return <p className="text-sm text-muted">This order is closed. No further status changes are possible.</p>;
  }
  return (
    <ActionForm action={setOrderStatus} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="status-note" className="text-sm font-medium text-marine-900">
          Note <span className="font-normal text-muted">(optional, shows in the timeline)</span>
        </label>
        <input id="status-note" name="note" maxLength={300} className={inputClass} placeholder="e.g. Called customer, rider Tunde assigned" />
      </div>
      <div className="flex flex-wrap gap-2">
        {next.map((n) => (
          <SubmitButton
            key={n.status}
            name="status"
            value={n.status}
            pendingText="Updating…"
            variant={n.status === "refunded" ? "danger" : "primary"}
            confirm={n.status === "refunded" ? "Refund this order? The payment will be marked refunded. Stock is not added back automatically; adjust it in Inventory if the item is returned in good condition." : undefined}
          >
            {n.label}
          </SubmitButton>
        ))}
        {canCancel && (
          <SubmitButton
            name="status"
            value="cancelled"
            pendingText="Cancelling…"
            variant="danger"
            confirm="Cancel this order? The reserved stock goes back on sale."
          >
            Cancel order
          </SubmitButton>
        )}
      </div>
      {isDelivered && <p className="text-xs text-muted">Refunding does not add the item back to stock.</p>}
    </ActionForm>
  );
}

export function PaymentForm({ id, status, locked }: { id: string; status: string; locked: boolean }) {
  if (locked) return <p className="text-sm text-muted">Payment status is locked because the order was {status}.</p>;
  return (
    <ActionForm action={setPaymentStatus} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="min-w-[160px] flex-1">
        <label htmlFor="payment_status" className="text-sm font-medium text-marine-900">Payment status</label>
        <select id="payment_status" name="payment_status" defaultValue={status === "refunded" ? "paid" : status} className={inputClass}>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <SubmitButton variant="secondary">Update</SubmitButton>
    </ActionForm>
  );
}

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  return (
    <ActionForm action={saveInternalNotes} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="internal_notes" className="sr-only">Internal notes</label>
      <textarea id="internal_notes" name="internal_notes" defaultValue={notes} rows={3} maxLength={2000} placeholder="Only staff see these notes. e.g. rider name, gate code, customer asked for evening delivery." className={`${inputClass} h-auto py-2.5`} />
      <SubmitButton variant="secondary">Save notes</SubmitButton>
    </ActionForm>
  );
}
