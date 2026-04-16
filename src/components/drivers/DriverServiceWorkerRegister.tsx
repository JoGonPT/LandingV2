"use client";

import { useEffect } from "react";

export function DriverServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/driver-sw.js").catch(() => {
      /* optional PWA layer */
    });
  }, []);
  return null;
}
