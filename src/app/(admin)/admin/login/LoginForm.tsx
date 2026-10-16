"use client";

import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, inputClass } from "@/components/admin/ui";
import { signIn } from "./actions";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={signIn} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <div className="pt-1">
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </div>
    </ActionForm>
  );
}
