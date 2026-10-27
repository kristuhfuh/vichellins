"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function MobileMenu({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return <details ref={menu} className="group relative lg:hidden" onClick={(event) => {
    if ((event.target as Element).closest("a") && menu.current) menu.current.open = false;
  }} onKeyDown={(event) => {
    if (event.key === "Escape" && menu.current) {
      menu.current.open = false;
      menu.current.querySelector("summary")?.focus();
    }
  }}>{children}</details>;
}
