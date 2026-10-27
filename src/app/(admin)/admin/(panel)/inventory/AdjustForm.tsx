"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { inputClass } from "@/components/admin/ui";
import { adjustStock } from "./actions";

export function AdjustForm({ variantId }: { variantId: string }) {
  const [reason, setReason] = useState("restock");
  return (
    <ActionForm action={adjustStock} className="grid items-end gap-3 @min-[28rem]:grid-cols-2 @min-[56rem]:grid-cols-[minmax(0,1.3fr)_minmax(0,.8fr)_minmax(0,.7fr)_minmax(0,1.5fr)_auto]">
      <input type="hidden" name="variant_id" value={variantId} />
      <div>
        <label htmlFor={`reason-${variantId}`} className="text-xs font-medium text-marine-900">Reason</label>
        <select id={`reason-${variantId}`} name="reason" value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} mt-1 h-10`}>
          <option value="restock">New stock arrived</option>
          <option value="return">Customer return</option>
          <option value="correction">Count correction</option>
        </select>
      </div>
      <div>
        <label htmlFor={`mode-${variantId}`} className="text-xs font-medium text-marine-900">Change</label>
        <select id={`mode-${variantId}`} name="mode" disabled={reason !== "correction"} className={`${inputClass} mt-1 h-10`} defaultValue="add">
          <option value="add">Add</option>
          <option value="remove">Remove</option>
        </select>
      </div>
      <div>
        <label htmlFor={`amount-${variantId}`} className="text-xs font-medium text-marine-900">How many</label>
        <input id={`amount-${variantId}`} name="amount" type="number" min={1} required className={`${inputClass} mt-1 h-10`} />
      </div>
      <div>
        <label htmlFor={`note-${variantId}`} className="text-xs font-medium text-marine-900">Note (optional)</label>
        <input id={`note-${variantId}`} name="note" maxLength={200} className={`${inputClass} mt-1 h-10`} placeholder="e.g. Supplier delivery 14 Oct" />
      </div>
      <SubmitButton variant="secondary" pendingText="Saving…">Update stock</SubmitButton>
    </ActionForm>
  );
}
