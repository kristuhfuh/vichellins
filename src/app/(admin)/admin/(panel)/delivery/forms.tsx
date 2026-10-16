"use client";

import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, inputClass } from "@/components/admin/ui";
import { createZone, deleteZone, updateZone } from "./actions";

type Zone = { id: string; name: string; fee: number; eta: string; is_active: boolean; sort_order: number };

function Fields({ zone, prefix }: { zone?: Zone; prefix: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Area name" htmlFor={`${prefix}-name`}>
        <input id={`${prefix}-name`} name="name" defaultValue={zone?.name} required className={inputClass} placeholder="e.g. Lekki and Ajah" />
      </Field>
      <Field label="Delivery fee (₦)" htmlFor={`${prefix}-fee`} hint="Use 0 for free delivery.">
        <input id={`${prefix}-fee`} name="fee" inputMode="numeric" defaultValue={zone?.fee} required className={inputClass} />
      </Field>
      <Field label="Usual delivery time" htmlFor={`${prefix}-eta`} hint="Shown to shoppers, e.g. Same day to 24 hours.">
        <input id={`${prefix}-eta`} name="eta" defaultValue={zone?.eta} className={inputClass} />
      </Field>
      <Field label="Order" htmlFor={`${prefix}-order`} hint="Lower numbers come first.">
        <input id={`${prefix}-order`} name="sort_order" type="number" defaultValue={zone?.sort_order ?? 0} className={inputClass} />
      </Field>
    </div>
  );
}

export function AddZoneForm() {
  return (
    <ActionForm action={createZone} resetOnSuccess className="space-y-4">
      <Fields prefix="new-zone" />
      <SubmitButton pendingText="Adding…">Add area</SubmitButton>
    </ActionForm>
  );
}

export function ZoneRow({ zone }: { zone: Zone }) {
  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <ActionForm action={updateZone} className="space-y-4">
        <input type="hidden" name="id" value={zone.id} />
        <Fields zone={zone} prefix={`zone-${zone.id}`} />
        <label className="flex items-center gap-2.5 text-sm text-marine-900">
          <input type="checkbox" name="is_active" defaultChecked={zone.is_active} className="h-4 w-4 accent-marine-700" />
          Available at checkout
        </label>
        <SubmitButton variant="secondary">Save</SubmitButton>
      </ActionForm>
      <div className="mt-3 border-t border-line pt-3">
        <ActionForm action={deleteZone}>
          <input type="hidden" name="id" value={zone.id} />
          <SubmitButton variant="danger" pendingText="Deleting…" confirm={`Delete ${zone.name}? Past orders keep their delivery details.`}>
            Delete area
          </SubmitButton>
        </ActionForm>
      </div>
    </li>
  );
}
