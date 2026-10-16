import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { policies, store, whatsappLink } from "@/lib/config";

export const metadata: Metadata = { title: "Contact us", description: `Contact ${store.name} on WhatsApp, phone or email.` };

export default function ContactPage() {
  return (
    <InfoPage title="Contact us" intro="The fastest way to reach us is WhatsApp.">
      <section className="grid gap-4 sm:grid-cols-2">
        <a
          href={whatsappLink("Hello Vichellins Nation, I have a question.")}
          target="_blank"
          rel="noopener noreferrer"
          className="!no-underline rounded-3xl bg-marine-900 p-6 text-white hover:bg-marine-800"
        >
          <h2 className="!text-white">WhatsApp</h2>
          <p className="!text-marine-200">Stock checks, orders and advice. Tap to start a chat.</p>
        </a>
        <div className="rounded-3xl bg-surface p-6">
          <h2>Phone and email</h2>
          <p>{store.phoneDisplay}</p>
          <p>
            <a href={`mailto:${store.email}`}>{store.email}</a>
          </p>
        </div>
      </section>
      <section>
        <h2>Where we are</h2>
        <p>{store.location}. We deliver within Lagos only.</p>
      </section>
      <section>
        <h2>Business hours</h2>
        <p>{policies.businessHours}. Messages sent outside these hours are answered the next working day.</p>
      </section>
    </InfoPage>
  );
}
