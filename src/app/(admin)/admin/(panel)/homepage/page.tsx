import type { Metadata } from "next";
import { CONTENT, requireStaff } from "@/lib/admin/auth";
import { loadHomepageContent } from "@/lib/admin/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { HomepageForm } from "./HomepageForm";

export const metadata: Metadata = { title: "Homepage content" };

export default async function HomepagePage() {
  await requireStaff(CONTENT);
  const supabase = await createClient();
  const content = await loadHomepageContent(supabase);
  return (
    <>
      <PageHeader
        title="Homepage content"
        description="Edit the hero section and trust items shown to every visitor."
      />
      <HomepageForm content={content} />
    </>
  );
}
