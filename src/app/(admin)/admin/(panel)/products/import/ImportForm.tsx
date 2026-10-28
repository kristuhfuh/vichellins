"use client";

import { startTransition, useActionState, useRef, type FormEvent } from "react";
import { buttonStyles, Notice, Table, td, th } from "@/components/admin/ui";
import { importProducts, type ImportState } from "./actions";

const initial: ImportState = { ok: false, message: "", results: [] };

export function ImportForm() {
  const [state, dispatch, pending] = useActionState(importProducts, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4" aria-busy={pending}>
        {state.message && (
          <Notice tone={state.ok ? (state.results.some((r) => r.status === "error") ? "gold" : "green") : "red"}>
            {state.message}
          </Notice>
        )}

        <label htmlFor="file" className="block text-sm font-medium text-marine-900">
          Fill in the template, then upload it here
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="block w-full rounded-lg border border-dashed border-line bg-white px-4 py-3 text-sm text-marine-900 file:mr-4 file:rounded-full file:border-0 file:bg-marine-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-marine-800"
        />
        <p className="text-xs text-muted">
          Up to 200 products and 2,000 variants per file. Keep it under 5 MB.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="submit" disabled={pending} className={buttonStyles.primary}>
            {pending ? "Importing…" : "Import products"}
          </button>
          <a href="/admin/products/import/template" className={buttonStyles.secondary} download>
            Download template
          </a>
        </div>
      </form>

      {state.results.length > 0 && (
        <section aria-label="Import results" className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">Import log</p>
          <h2 className="mt-1 text-base font-semibold text-marine-900">Row-by-row results</h2>
          <p className="mt-1 text-sm text-muted">
            {state.results.filter((r) => r.status === "created").length} created,{" "}
            {state.results.filter((r) => r.status === "error").length} skipped.
          </p>
          <div className="mt-4">
            <Table>
              <thead className="bg-surface">
                <tr>
                  <th className={th}>Row</th>
                  <th className={th}>Product</th>
                  <th className={th}>Status</th>
                  <th className={th}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.results
                  .slice()
                  .sort((a, b) => a.rowIndex - b.rowIndex)
                  .map((r, i) => (
                    <tr key={`${r.rowIndex}-${r.slug}-${i}`}>
                      <td className={`${td} tabular-nums text-muted`}>{r.rowIndex}</td>
                      <td className={td}>
                        <span className="font-medium">{r.name}</span>
                        <span className="block text-xs text-muted">{r.slug}</span>
                      </td>
                      <td className={td}>
                        {r.status === "created" ? (
                          <span className="font-medium text-success-700">Created</span>
                        ) : (
                          <span className="font-medium text-danger-700">Skipped</span>
                        )}
                      </td>
                      <td className={`${td} text-sm text-muted`}>{r.message ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        </section>
      )}
    </>
  );
}
