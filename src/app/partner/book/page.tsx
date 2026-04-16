import { redirect } from "next/navigation";

import { getAllPartners, isPartnerPortalConfigured } from "@/lib/partner/config";

export default function PartnerBookIndexPage() {
  if (!isPartnerPortalConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Partner portal</h1>
        <p className="mt-4 text-sm text-neutral-600">
          The B2B booking portal is not configured. Set <code className="text-xs">PARTNERS_JSON</code> or partner env
          variables on the server.
        </p>
      </main>
    );
  }

  const partners = getAllPartners();
  if (partners.length === 1) {
    redirect(`/partner/${partners[0].slug}/book/`);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-xl font-semibold tracking-tight">Partner booking</h1>
      <p className="mt-4 text-sm text-neutral-600">
        Open your dedicated link: <span className="font-medium text-black">/partner/<em>your-slug</em>/book</span>
      </p>
      <ul className="mt-8 space-y-2 text-sm">
        {partners.map((p) => (
          <li key={p.slug}>
            <a className="text-black underline underline-offset-4" href={`/partner/${p.slug}/book/`}>
              {p.displayName}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
