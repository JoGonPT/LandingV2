import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Way2Go Internal",
  robots: "noindex, nofollow",
};

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased selection:bg-white selection:text-black">{children}</div>
  );
}
