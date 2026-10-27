import Link from "next/link";
import { store } from "@/lib/config";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-marine-700" />
      <path d="M8 9l8 15 8-15" fill="none" stroke="#f5c800" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 sm:gap-2.5" aria-label={`${store.name} home`}>
      <LogoMark />
      <span className={`whitespace-nowrap text-base font-semibold tracking-tight sm:text-lg ${inverted ? "text-white" : "text-marine-900"}`}>
        Vichellins<span className={inverted ? "text-gold-400" : "text-gold-600"}> Nation</span>
      </span>
    </Link>
  );
}
