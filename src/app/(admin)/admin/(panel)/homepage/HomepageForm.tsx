"use client";

import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Card, Field, inputClass } from "@/components/admin/ui";
import type { HomepageContent } from "@/lib/admin/queries";
import { saveHomepageContent } from "./actions";

export function HomepageForm({ content }: { content: HomepageContent }) {
  return (
    <ActionForm action={saveHomepageContent} className="space-y-6">
      <Card title="Hero section" description="The large banner at the top of the homepage.">
        <div className="space-y-4">
          <Field label="Headline" htmlFor="hero_headline" hint="The main bold text before the accent.">
            <input
              id="hero_headline"
              name="hero_headline"
              required
              defaultValue={content.hero_headline}
              className={inputClass}
              placeholder="e.g. Phones, laptops, audio and more —"
            />
          </Field>
          <Field label="Accent text" htmlFor="hero_accent" hint="Shown in gold after the headline.">
            <input
              id="hero_accent"
              name="hero_accent"
              defaultValue={content.hero_accent}
              className={inputClass}
              placeholder="e.g. all genuine, delivered fast."
            />
          </Field>
          <Field label="Subtext" htmlFor="hero_sub" hint="A short description below the headline.">
            <textarea
              id="hero_sub"
              name="hero_sub"
              required
              rows={3}
              defaultValue={content.hero_sub}
              className={`${inputClass} h-auto py-3`}
            />
          </Field>
        </div>
      </Card>

      <Card title="Trust items" description="Four short reassurances shown directly below the hero.">
        <div className="space-y-5">
          {content.trust.map((item, i) => (
            <div key={i} className="grid gap-4 sm:grid-cols-2">
              <Field label={`Item ${i + 1} — title`} htmlFor={`trust_${i}_title`}>
                <input
                  id={`trust_${i}_title`}
                  name={`trust_${i}_title`}
                  required
                  defaultValue={item.title}
                  className={inputClass}
                />
              </Field>
              <Field label="Body" htmlFor={`trust_${i}_body`}>
                <input
                  id={`trust_${i}_body`}
                  name={`trust_${i}_body`}
                  required
                  defaultValue={item.body}
                  className={inputClass}
                />
              </Field>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save homepage</SubmitButton>
      </div>
    </ActionForm>
  );
}
