"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import type { ActionState } from "@/lib/admin/errors";
import { buttonStyles, Notice } from "./ui";

const PendingContext = createContext(false);

type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Runs a server action from a form WITHOUT React's automatic form reset.
 *
 * With `<form action={fn}>`, React 19 resets every field to its default value
 * after the action finishes, even when it failed. Controlled inputs keep their
 * state but the screen shows the default, so a user can end up submitting
 * something different from what they see. Dispatching manually avoids that.
 */
export function useServerAction(action: ServerAction) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter ?? undefined;
    const data = new FormData(event.currentTarget, submitter as HTMLElement | undefined);
    startTransition(() => dispatch(data));
  };
  return { state, onSubmit, pending };
}

export function PendingProvider({ pending, children }: { pending: boolean; children: ReactNode }) {
  return <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>;
}

export function SubmitButton({
  children,
  pendingText = "Saving…",
  variant = "primary",
  confirm,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: keyof typeof buttonStyles;
  /** Asks the user to confirm before submitting, for destructive actions. */
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={buttonStyles[variant]}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * A form wired to a server action, showing its success or error message.
 * Fields keep what the user typed after an error. Set `resetOnSuccess` on
 * "add" forms so they clear once the item has been created.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const { state, onSubmit, pending } = useServerAction(action);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      ref.current?.dispatchEvent(new Event("action-success"));
    }
  }, [state, resetOnSuccess]);

  return (
    <PendingProvider pending={pending}>
      <form ref={ref} onSubmit={onSubmit} className={className} aria-busy={pending}>
        {state?.message && <div className="col-span-full"><Notice tone={state.ok ? "green" : "red"}>{state.message}</Notice></div>}
        <fieldset disabled={pending} className="contents">{children}</fieldset>
      </form>
    </PendingProvider>
  );
}
