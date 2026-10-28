import Image from "next/image";
import Link from "next/link";
import { store } from "@/lib/config";

/**
 * Full brand lockup. The source PNG already includes the V icon, the globe
 * accent and the "Vichellins Nation" wordmark on a marine badge, so this
 * component just renders the asset at the right height for each surface.
 *
 * The `inverted` prop is kept for API compatibility with existing callers
 * (admin sidebar + login) but no longer changes rendering — the badge works
 * on both light and dark backgrounds since it carries its own marine field.
 */
export function Logo({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inverted = false,
  className = "h-10 w-auto",
}: {
  inverted?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className="inline-flex min-h-11 shrink-0 items-center" aria-label={`${store.name} home`}>
      <Image
        src="/vichellins-logo.png"
        alt={store.name}
        width={1080}
        height={369}
        priority
        className={className}
      />
    </Link>
  );
}
