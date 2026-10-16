import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { store } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of service", description: `Terms for buying from ${store.name}.` };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of service" intro={`The terms for buying from ${store.name}.`}>
      <section>
        <h2>Orders</h2>
        <p>An order is accepted when we confirm it with you. We may cancel an order if an item is out of stock or a price was listed in error, and we will refund any payment made.</p>
      </section>
      <section>
        <h2>Prices and payment</h2>
        <p>Prices are in Nigerian naira and include no delivery fee unless stated. Delivery is charged by area at checkout.</p>
      </section>
      <section>
        <h2>Delivery</h2>
        <p>We deliver within Lagos only. Delivery times are estimates and not guarantees.</p>
      </section>
      <section>
        <h2>Returns and warranty</h2>
        <p>See the delivery and returns page and the warranty page for how returns and warranty claims work.</p>
      </section>
      <section>
        <h2>Product information</h2>
        <p>Product images on the site may be illustrations. Specifications are provided as accurately as we can; the product page states condition, warranty and authenticity for each item.</p>
      </section>
    </InfoPage>
  );
}
