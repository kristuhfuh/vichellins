"use client";

import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, inputClass } from "@/components/admin/ui";
import { changePassword } from "./actions";

export function ChangePasswordForm() {
  return (
    <ActionForm action={changePassword} resetOnSuccess className="max-w-md space-y-4">
      <Field label="Current password" htmlFor="current"><input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} /></Field>
      <Field label="New password" htmlFor="next" hint="At least 10 characters."><input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} className={inputClass} /></Field>
      <Field label="Repeat the new password" htmlFor="confirm"><input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} /></Field>
      <SubmitButton pendingText="Changing…">Change password</SubmitButton>
    </ActionForm>
  );
}
