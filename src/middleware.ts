import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { applySupabaseSessionToResponse } from "@/lib/supabase/middleware";

const locales = ["pt", "en"] as const;
const defaultLocale = "pt";

/** App routes that live outside `app/[locale]` — strip mistaken `/{locale}/…` prefixes. */
const nonLocalizedTopSections = ["partner", "internal", "master-admin"] as const;

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  // Negotiator returns ["*"] when no Accept-Language header is sent (bots, crawlers,
  // verification services); "*" isn't a valid locale and crashes matchLocale below.
  const languages = new Negotiator({ headers: negotiatorHeaders })
    .languages()
    .filter((lang) => lang !== "*");

  if (languages.length === 0) return defaultLocale;

  try {
    return matchLocale(languages, locales, defaultLocale);
  } catch {
    return defaultLocale;
  }
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

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclui: rotas de API, assets do Next.js, favicon, service-worker
    // e qualquer ficheiro estático com extensão conhecida (imagens, fontes, etc.)
    "/((?!api|_next/static|_next/image|favicon\\.ico|service-worker\\.js)(?!.*\\.(?:png|jpg|jpeg|gif|webp|ico|svg|ttf|woff|woff2|mp4|pdf)$).*)",
  ],
};
