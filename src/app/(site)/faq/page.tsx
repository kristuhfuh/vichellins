import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { deliveryZones, policies } from "@/lib/config";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "FAQ", description: "Answers on delivery, payment, warranty and returns." };

const faqs = [
  {
    q: "Are your products genuine?",
    a: "Yes. Every product is checked before it is listed, and each product page shows its authenticity status and notes, for example whether the box is sealed.",
  },
  {
    q: "Where do you deliver?",
    a: `Within Lagos only. Delivery costs ${formatPrice(Math.min(...deliveryZones.map((z) => z.fee)))} to ${formatPrice(Math.max(...deliveryZones.map((z) => z.fee)))} depending on your area.`,
  },
  {
    q: "How do I pay?",
    a: "Choose bank transfer or pay on delivery at checkout. Your order goes to us on WhatsApp and we confirm stock before you pay.",
  },
  {
    q: "Can I pay on delivery?",
    a: "Yes. You can inspect the item when the rider arrives and pay once you are satisfied.",
  },
  {
    q: "Do products come with a warranty?",
    a: "Yes. The warranty length and who covers it, the manufacturer or us, is stated on every product page.",
  },
  {
    q: "What is a refurbished product?",
    a: "A used device that has been tested, cleaned and repaired where needed. Refurbished listings say what was replaced and carry their own warranty.",
  },
  {
    q: "Can I return an item?",
    a: `Yes, within ${policies.returnDays} days if it is faulty or not as described. See the delivery and returns page for details.`,
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <InfoPage title="Frequently asked questions" intro="Quick answers before you order.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="divide-y divide-line rounded-3xl border border-line">
        {faqs.map((f) => (
          <details key={f.q} className="group px-6 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-marine-900 [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden="true" className="text-xl text-gold-600 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3">{f.a}</p>
          </details>
        ))}
      </div>
      <p>
        Still stuck? <Link href="/contact">Message us on WhatsApp</Link>.
      </p>
    </InfoPage>
  );
}
