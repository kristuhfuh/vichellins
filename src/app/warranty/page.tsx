import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";

export const metadata: Metadata = { title: "Warranty", description: "How warranty works on products from Vichellins Nation." };

export default function WarrantyPage() {
  return (
    <InfoPage title="Warranty" intro="Every product page states its warranty length and who covers it.">
      <section>
        <h2>Types of warranty</h2>
        <ul>
          <li><strong>Manufacturer warranty:</strong> the brand covers the product. We help you make the claim.</li>
          <li><strong>Store warranty:</strong> we cover the product directly and repair or replace it.</li>
          <li><strong>No warranty:</strong> stated clearly on the product page where it applies.</li>
        </ul>
      </section>
      <section>
        <h2>What is covered</h2>
        <p>Faults that are not caused by the user, such as manufacturing defects and hardware that stops working under normal use.</p>
      </section>
      <section>
        <h2>What is not covered</h2>
        <ul>
          <li>Physical damage, cracked screens and liquid damage.</li>
          <li>Damage from unofficial repairs or modifications.</li>
          <li>Normal wear and consumables such as ear cushions and cables.</li>
        </ul>
      </section>
      <section>
        <h2>Making a claim</h2>
        <p>
          <Link href="/contact">Contact us</Link> with your order details and a description or video of the fault. Keep your receipt and original packaging where possible.
        </p>
      </section>
    </InfoPage>
  );
}
