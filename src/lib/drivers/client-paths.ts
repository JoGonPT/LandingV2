/** Browser paths differ: `drivers.*` uses `/`, local dev often uses `/drivers-pwa/`. */

export function driverHomeHref(): string {
  if (typeof window === "undefined") return "/drivers-pwa/";
  return window.location.pathname.startsWith("/drivers-pwa") ? "/drivers-pwa/" : "/";
}

export function driverLoginHref(): string {
  if (typeof window === "undefined") return "/drivers-pwa/login/";
  return window.location.pathname.startsWith("/drivers-pwa") ? "/drivers-pwa/login/" : "/login/";
}

export function driverBookingHref(id: string): string {
  if (typeof window === "undefined") return `/drivers-pwa/booking/${id}/`;
  return window.location.pathname.startsWith("/drivers-pwa")
    ? `/drivers-pwa/booking/${id}/`
    : `/booking/${id}/`;
}
