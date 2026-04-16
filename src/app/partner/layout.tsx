import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Way2Go Partner Booking",
  description: "B2B booking portal for hotels and travel partners",
  robots: "noindex, nofollow",
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-neutral-900 antialiased">{children}</div>;
}
