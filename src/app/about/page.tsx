import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { store } from "@/lib/config";

export const metadata: Metadata = { title: "About us", description: `About ${store.name}, a Lagos gadget store.` };

export default function AboutPage() {
  return (
    <InfoPage title="About us" intro={`${store.name} sells genuine gadgets and delivers them across Lagos.`}>
      <section>
        <h2>What we do</h2>
        <p>
          We sell phones, laptops, audio, smart home devices, wearables and accessories. Every product is checked before it is listed, and each listing states its condition, warranty and authenticity so you know what you are buying.
        </p>
      </section>
      <section>
        <h2>How we work</h2>
        <ul>
          <li>Products are verified genuine before they are listed.</li>
          <li>Warranty is stated on every product page, including who covers it.</li>
          <li>We deliver within Lagos and you can choose to pay on delivery.</li>
          <li>You can reach us directly on WhatsApp before and after you buy.</li>
        </ul>
      </section>
      <section>
        <h2>Get in touch</h2>
        <p>
          Questions about a product or an order? <Link href="/contact">Contact us</Link>.
        </p>
      </section>
    </InfoPage>
  );
}
