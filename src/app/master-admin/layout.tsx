import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Way2Go — Master admin",
  robots: "noindex, nofollow",
};

export default function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-neutral-200 antialiased selection:bg-white selection:text-black">{children}</div>
  );
}
