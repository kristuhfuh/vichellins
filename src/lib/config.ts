import type { DeliveryZone } from "./types";

/**
 * Store-level settings. Contact details and delivery fees are placeholders
 * until the client confirms them; they will move into the admin settings.
 */
export const store = {
  name: "Vichellins Nation",
  tagline: "Genuine gadgets, delivered across Lagos",
  description:
    "Phones, laptops, audio, smart home and more. Genuine products with warranty, delivered anywhere in Lagos.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "2340000000000",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@vichellinsnation.com",
  phoneDisplay: process.env.NEXT_PUBLIC_PHONE_DISPLAY ?? "+234 000 000 0000",
  location: "Lagos, Nigeria",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL,
    x: process.env.NEXT_PUBLIC_X_URL,
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL,
  },
} as const;

export const deliveryZones: DeliveryZone[] = [
  { id: "mainland", name: "Lagos Mainland", fee: 2500, eta: "Same day to 24 hours" },
  { id: "island", name: "Lagos Island", fee: 3000, eta: "Same day to 24 hours" },
  {
    id: "outskirts",
    name: "Lagos Outskirts (Ikorodu, Epe, Badagry)",
    fee: 5000,
    eta: "1 to 2 days",
  },
];

/** Draft policy values. The client must confirm these before launch. */
export const policies = {
  returnDays: 7,
  refundDays: 5,
  businessHours: "Monday to Saturday, 9am to 6pm",
} as const;

export const paymentMethods = [
  {
    id: "transfer",
    label: "Bank transfer",
    hint: "We send account details on WhatsApp once your order is confirmed.",
  },
  {
    id: "cod",
    label: "Pay on delivery",
    hint: "Pay the rider when you have inspected your item.",
  },
] as const;

export function whatsappLink(message: string) {
  return `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`;
}
