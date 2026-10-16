import Link from "next/link";
import type { ReactNode } from "react";

export const inputClass =
  "mt-1.5 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-marine-900 placeholder:text-muted/70 focus:border-marine-700 focus:outline-none disabled:bg-surface disabled:text-muted";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-marine-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      {(title || description) && (
        <header className="mb-4">
          {title && <h2 className="text-base font-semibold text-marine-900">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-marine-900">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

type Tone = "neutral" | "blue" | "gold" | "green" | "red";
const tones: Record<Tone, string> = {
  neutral: "bg-surface text-marine-900",
  blue: "bg-marine-50 text-marine-800",
  gold: "bg-gold-100 text-gold-700",
  green: "bg-emerald-50 text-emerald-800",
  red: "bg-red-50 text-red-800",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

const orderTone: Record<string, Tone> = {
  pending: "gold",
  confirmed: "blue",
  packed: "blue",
  out_for_delivery: "blue",
  delivered: "green",
  cancelled: "red",
  refunded: "red",
  unpaid: "gold",
  paid: "green",
  failed: "red",
  draft: "neutral",
  published: "green",
  archived: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={orderTone[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}

const buttonBase =
  "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
export const buttonStyles = {
  primary: `${buttonBase} bg-marine-700 text-white hover:bg-marine-800`,
  secondary: `${buttonBase} border border-line bg-white text-marine-900 hover:border-marine-700`,
  danger: `${buttonBase} border border-red-200 bg-white text-red-700 hover:bg-red-50`,
};

export function LinkButton({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
}) {
  return (
    <Link href={href} className={buttonStyles[variant]}>
      {children}
    </Link>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
      <h2 className="text-base font-semibold text-marine-900">{title}</h2>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "blue", children }: { tone?: "blue" | "red" | "green" | "gold"; children: ReactNode }) {
  const styles = {
    blue: "border-marine-200 bg-marine-50 text-marine-900",
    red: "border-red-200 bg-red-50 text-red-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    gold: "border-gold-200 bg-gold-100 text-marine-900",
  };
  return (
    <div role={tone === "red" ? "alert" : "status"} className={`mb-5 rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted";
export const td = "px-4 py-3 align-middle text-marine-900";
