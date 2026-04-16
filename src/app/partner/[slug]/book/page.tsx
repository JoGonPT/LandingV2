import { notFound, redirect } from "next/navigation";

import { PartnerBookingClient } from "@/components/partner/PartnerBookingClient";
import { getPartnerBySlug, isPartnerPortalConfigured } from "@/lib/partner/config";

export default async function PartnerBookPage({ params }: { params: Promise<{ slug: string }> }) {
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">{partner.displayName}</h1>
        <p className="mt-2 text-sm text-neutral-600">Partner booking — monthly account or card payment.</p>
        <p className="mt-4 text-sm">
          <a className="text-black underline underline-offset-4" href={`/partner/${partner.slug}/dashboard/`}>
            Account &amp; booking history
          </a>
        </p>
      </header>
      <PartnerBookingClient slug={partner.slug} displayName={partner.displayName} />
    </main>
  );
}
