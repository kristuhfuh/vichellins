import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { store } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy policy", description: `How ${store.name} handles your personal information.` };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy policy" intro="What we collect, why, and how to ask us to delete it.">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your name, phone number, delivery address and, optionally, email when you place an order.</li>
          <li>Messages you send us on WhatsApp.</li>
          <li>Basic site usage data, such as pages viewed, to improve the shop.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>To process and deliver your order, answer your questions, and understand which products people look at. We do not sell your information.</p>
      </section>
      <section>
        <h2>Sharing</h2>
        <p>We share your name, phone number and address with our delivery rider so your order can reach you, and with payment providers when you pay online.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>You can ask us to correct or delete your information by emailing <a href={`mailto:${store.email}`}>{store.email}</a>.</p>
      </section>
    </InfoPage>
  );
}
