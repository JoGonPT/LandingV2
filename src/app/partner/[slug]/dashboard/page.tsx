import { notFound, redirect } from "next/navigation";

import { PartnerDashboardClient } from "@/components/partner/PartnerDashboardClient";
import { getPartnerBySlug, isPartnerPortalConfigured } from "@/lib/partner/config";

export default async function PartnerDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isPartnerPortalConfigured()) {
    redirect("/partner/book/");
  }
  const { slug } = await params;
  const partner = getPartnerBySlug(slug);
  if (!partner) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      <header className="mb-10 border-b border-neutral-200 pb-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Way2Go B2B</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">Partner dashboard</h1>
      </header>
      <PartnerDashboardClient slug={partner.slug} displayName={partner.displayName} />
    </main>
  );
}
