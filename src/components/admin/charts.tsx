"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

export type DayPoint = { date: string; orders: number; revenue: number };

/**
 * Round the top of an axis up to 1, 2, 4, 8 or 10 times a power of ten, so that
 * the four gridline intervals are always round numbers (no 62.5K or 187.5K).
 */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 4, 8, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

export function compactNaira(n: number): string {
  if (n === 0) return "₦0";
  if (n >= 1_000_000) return `₦${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${+(n / 1_000).toFixed(1)}K`;
  return `₦${n}`;
}

const day = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
// Dates come from the database as plain calendar days, so format them in UTC to avoid a timezone shift.
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Daily revenue as columns: one series, one colour, so no legend. Bars are at
 * most 24px wide with a 4px rounded top and square base. Hover or focus a column
 * for its values; the table view below carries the same numbers.
 */
export function RevenueChart({ data, title }: { data: DayPoint[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const top = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => top * f);
  const hasSales = data.some((d) => d.revenue > 0);
  const labelEvery = data.length <= 10 ? 1 : data.length <= 31 ? 7 : 14;
  const point = active === null ? null : data[active];

  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="flex gap-3 pt-4">
        <div aria-hidden="true" className="relative h-52 w-12 shrink-0 text-right text-[11px] text-muted">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
              {compactNaira(t)}
            </span>
          ))}
        </div>
        <div className="relative mr-5 min-w-0 flex-1">
          <div className="relative h-52">
            {ticks.map((t) => (
              <div key={t} aria-hidden="true" className="absolute inset-x-0 border-t border-line" style={{ bottom: `${(t / top) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end justify-between">
              {data.map((d, i) => {
                const fromEnd = data.length - 1 - i;
                // Skip a label that would crowd the final one.
                const showLabel = i === data.length - 1 || (i % labelEvery === 0 && fromEnd >= Math.ceil(labelEvery / 2));
                return (
                  <div key={d.date} className="relative flex h-full max-w-[28px] flex-1 justify-center">
                    <button
                      type="button"
                      aria-label={`${dayLong.format(asDate(d.date))}: ${formatPrice(d.revenue)} from ${d.orders} order${d.orders === 1 ? "" : "s"}`}
                      onPointerEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                      onBlur={() => setActive((a) => (a === i ? null : a))}
                      className="group flex h-full w-full items-end justify-center focus:outline-none"
                    >
                      <span
                        className={`block w-full max-w-[24px] rounded-t-[4px] border-x border-white transition-colors ${active === i ? "bg-marine-500" : "bg-marine-700"} group-focus-visible:ring-2 group-focus-visible:ring-gold-500`}
                        style={{ height: `${d.revenue === 0 ? 0 : Math.max((d.revenue / top) * 100, 1.5)}%` }}
                      />
                    </button>
                    {showLabel && (
                      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted">
                        {day.format(asDate(d.date))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {point && active !== null && (
              <div
                role="status"
                className="pointer-events-none absolute z-10 w-44 -translate-x-1/2 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${Math.min(Math.max(((active + 0.5) / data.length) * 100, 14), 86)}%`,
                  bottom: `calc(${Math.min((point.revenue / top) * 100, 80)}% + 12px)`,
                }}
              >
                <p className="text-muted">{dayLong.format(asDate(point.date))}</p>
                <p className="mt-0.5 text-base font-semibold text-marine-900">{formatPrice(point.revenue)}</p>
                <p className="text-muted">
                  {point.orders} order{point.orders === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>
          <div aria-hidden="true" className="h-7" />
        </div>
      </div>
      {!hasSales && <p className="mt-3 text-sm text-muted">No sales in this period yet.</p>}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-marine-700">View as table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Day</th>
                <th className="px-3 py-2 text-right font-semibold">Orders</th>
                <th className="px-3 py-2 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-1.5">{dayLong.format(asDate(d.date))}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.orders}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
