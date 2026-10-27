import Link from "next/link";
import type { ReactNode } from "react";

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 break-words text-[clamp(1.5rem,3cqi,1.875rem)] font-semibold tracking-tight tabular-nums text-marine-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export type BarItem = { label: string; value: number; display: string; sub?: string };

/**
 * Horizontal bars for comparing magnitude. One colour, value at the tip of
 * each bar, label in text ink. Bars are 12px thick with a rounded end.
 */
export function BarList({ items, empty }: { items: BarItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-marine-900">{i.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-marine-900">{i.display}</span>
          </div>
          <div className="mt-1.5 h-3 rounded-r-[4px] bg-transparent" role="img" aria-label={`${i.label}: ${i.display}`}>
            <div className="h-3 rounded-r-[4px] bg-marine-700" style={{ width: `${Math.max((i.value / max) * 100, i.value > 0 ? 2 : 0)}%` }} />
          </div>
          {i.sub && <p className="mt-1 text-xs text-muted">{i.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

export function RangeTabs({ base, days, options = [7, 30, 90] }: { base: string; days: number; options?: number[] }) {
  return (
    <nav aria-label="Date range" className="mb-6 flex flex-wrap gap-2">
      {options.map((d) => (
        <Link
          key={d}
          href={`${base}?days=${d}`}
          aria-current={d === days ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${d === days ? "bg-marine-700 text-white" : "bg-white text-marine-900 ring-1 ring-line hover:ring-marine-700"}`}
        >
          Last {d} days
        </Link>
      ))}
    </nav>
  );
}
