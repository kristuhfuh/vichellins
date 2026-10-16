import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { deliveryZones, policies } from "@/lib/config";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Delivery & returns", description: "Lagos delivery areas, fees and our returns process." };

export default function DeliveryReturnsPage() {
  return (
    <InfoPage title="Delivery & returns" intro="We deliver within Lagos only.">
      <section>
        <h2>Delivery areas and fees</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-marine-900">
              <tr>
                <th className="px-4 py-3 font-semibold">Area</th>
                <th className="px-4 py-3 font-semibold">Fee</th>
                <th className="px-4 py-3 font-semibold">Usual time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {deliveryZones.map((z) => (
                <tr key={z.id}>
                  <td className="px-4 py-3 text-marine-900">{z.name}</td>
                  <td className="px-4 py-3 text-muted">{formatPrice(z.fee)}</td>
                  <td className="px-4 py-3 text-muted">{z.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Delivery times start once we have confirmed your order and, for bank transfer, received payment.</p>
      </section>
      <section>
        <h2>Inspect before you pay</h2>
        <p>If you choose pay on delivery, you can check the item with the rider before paying.</p>
      </section>
      <section>
        <h2>Returns</h2>
        <p>
          You can return an item within {policies.returnDays} days of delivery if it is faulty or not as described. Contact us on WhatsApp with your order details and photos or video of the problem.
        </p>
        <ul>
          <li>Items must be returned with all accessories and packaging.</li>
          <li>Items damaged after delivery are not eligible for return.</li>
          <li>Approved refunds are paid within {policies.refundDays} working days.</li>
        </ul>
      </section>
    </InfoPage>
  );
}
