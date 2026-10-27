import type { Metadata } from "next";
import { Card, LinkButton, PageHeader } from "@/components/admin/ui";
import { COMMERCE, requireStaff } from "@/lib/admin/auth";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = { title: "Bulk import" };

export default async function ImportPage() {
  await requireStaff(COMMERCE);

  return (
    <>
      <PageHeader
        title="Bulk import products"
        description="Download the template, fill it in, and upload it here. One Products row per product, one Variants row per variant. Images are added later from each product's page."
        actions={<LinkButton href="/admin/products">Back to products</LinkButton>}
      />

      <Card>
        <ImportForm />
      </Card>

      <section className="mt-8 grid gap-5 @min-[34rem]:grid-cols-2 @min-[54rem]:grid-cols-3">
        <HowTo
          step="1"
          title="Download the template"
          body="A fresh .xlsx with Products, Variants and Reference sheets. The Reference sheet lists the exact brand and category names you can use."
        />
        <HowTo
          step="2"
          title="Fill it in offline"
          body="One row per product in Products, one row per variant in Variants. Use the product's slug to link variants to their product."
        />
        <HowTo
          step="3"
          title="Upload and review"
          body="Every row is validated before anything is saved. Rows with errors are skipped and listed below — fix them and upload again."
        />
      </section>
    </>
  );
}

function HowTo({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Step {step}</p>
      <h3 className="mt-2 text-base font-semibold text-marine-900">{title}</h3>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
