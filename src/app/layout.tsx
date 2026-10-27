import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { store } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(store.siteUrl),
  title: {
    default: `${store.name} | ${store.tagline}`,
    template: `%s | ${store.name}`,
  },
  description: store.description,
  openGraph: {
    type: "website",
    siteName: store.name,
    title: `${store.name} | ${store.tagline}`,
    description: store.description,
    locale: "en_NG",
  },
};

export const viewport: Viewport = {
  // Matches --color-marine-900 so the mobile browser chrome blends with the hero.
  themeColor: "#090970",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
