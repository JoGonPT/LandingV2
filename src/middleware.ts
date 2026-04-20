import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { applySupabaseSessionToResponse } from "@/lib/supabase/middleware";

const locales = ["pt", "en"] as const;
const defaultLocale = "pt";

/** App routes that live outside `app/[locale]` — strip mistaken `/{locale}/…` prefixes. */
const nonLocalizedTopSections = ["partner", "internal", "master-admin"] as const;

function getLocale(request: NextRequest): string | undefined {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

  return matchLocale(languages, locales, defaultLocale);
}

function isDriversHost(request: NextRequest): boolean {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  return host.startsWith("drivers.");
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/drivers-pwa") ||
    pathname.startsWith("/partner") ||
    pathname.startsWith("/internal") ||
    pathname.startsWith("/master-admin")
  ) {
    if (pathname.startsWith("/drivers-pwa")) {
      return applySupabaseSessionToResponse(request);
    }
    return NextResponse.next();
  }

  if (isDriversHost(request)) {
    const sessionResponse = await applySupabaseSessionToResponse(request);
    const suffix = pathname === "/" ? "/" : pathname;
    const url = request.nextUrl.clone();
    url.pathname = `/drivers-pwa${suffix === "/" ? "/" : suffix}`;
    const rewrite = NextResponse.rewrite(url);
    copyCookies(sessionResponse, rewrite);
    return rewrite;
  }

  for (const loc of locales) {
    const locPrefix = `/${loc}`;
    if (!pathname.startsWith(`${locPrefix}/`) && pathname !== locPrefix) continue;
    const afterLocale = pathname === locPrefix ? "/" : pathname.slice(locPrefix.length);
    for (const section of nonLocalizedTopSections) {
      if (afterLocale === `/${section}` || afterLocale.startsWith(`/${section}/`)) {
        const url = request.nextUrl.clone();
        url.pathname = afterLocale;
        return NextResponse.redirect(url, 308);
      }
    }
  }

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname === "/" ? "" : pathname}`,
        request.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
