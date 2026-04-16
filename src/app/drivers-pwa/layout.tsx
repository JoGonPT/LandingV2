import type { Metadata, Viewport } from "next";

import { DriverServiceWorkerRegister } from "@/components/drivers/DriverServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Way2Go Drivers",
  description: "Chauffeur schedule and assigned jobs",
  manifest: "/drivers-pwa/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Way2Go",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function DriversPwaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white antialiased">
      <DriverServiceWorkerRegister />
      {children}
    </div>
  );
}
