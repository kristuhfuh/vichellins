import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-28 text-center sm:px-6">
      <p className="text-sm font-semibold text-gold-700">404</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-marine-900">Page not found</h1>
      <p className="mt-3 text-muted">The page you are looking for has moved or does not exist.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="inline-flex h-12 items-center rounded-full bg-marine-700 px-7 text-sm font-semibold text-white hover:bg-marine-800">Go home</Link>
        <Link href="/shop" className="inline-flex h-12 items-center rounded-full border border-line px-7 text-sm font-semibold text-marine-900 hover:border-marine-700">Browse the shop</Link>
      </div>
    </div>
  );
}
