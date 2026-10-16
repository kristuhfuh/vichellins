import type { ReactNode } from "react";

export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="bg-marine-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          {intro && <p className="mt-4 max-w-2xl text-lg text-marine-200">{intro}</p>}
        </div>
      </section>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 [&_a]:text-marine-700 [&_a]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-marine-900 [&_li]:text-muted [&_p]:leading-relaxed [&_p]:text-muted [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_section>*+*]:mt-3">
        {children}
      </div>
    </>
  );
}
