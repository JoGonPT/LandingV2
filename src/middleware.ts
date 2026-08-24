import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { applySupabaseSessionToResponse } from "@/lib/supabase/middleware";
import {
  isComingSoonEnabled,
  PREVIEW_SESSION_COOKIE,
  getPreviewSessionSecret,
  verifyPreviewSession,
} from "@/lib/preview/session";
import { LOCALE_HEADER } from "@/lib/site";

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

/**
 * Portão "Em breve": esconde o site público até haver sessão de pré-visualização.
 *
 * Só tranca o site público. As áreas internas — parceiros, motoristas, admin —
 * já têm autenticação própria e ficam de fora: trancá-las duas vezes só serviria
 * para impedir quem tem de lá entrar.
 *
 * Falha fechada: se o segredo não estiver configurado, ninguém passa. O
 * contrário deixaria o site aberto por um erro de configuração.
 */
async function shouldGate(request: NextRequest): Promise<boolean> {
  if (!(await isComingSoonEnabled())) return false;

  try {
    const secret = getPreviewSessionSecret();
    return !(await verifyPreviewSession(secret, request.cookies.get(PREVIEW_SESSION_COOKIE)?.value));
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // O ecrã de "Em breve" é servido tal e qual: não leva prefixo de idioma nem
  // passa pelo portão. Sem isto, a lógica de locale reescrevia-o para
  // `/pt/em-breve`, que voltava a ser trancado — um ciclo.
  if (pathname === "/em-breve" || pathname.startsWith("/em-breve/")) {
    return NextResponse.next();
  }

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

  if (await shouldGate(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/em-breve/";
    url.search = "";
    // Reescrita, não redirecionamento: o visitante mantém o URL que pediu, e
    // quando o portão for desligado o mesmo endereço passa a servir o site.
    return NextResponse.rewrite(url);
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
      return NextResponse.rewrite(url, withLocaleHeader(request, locale));
    }

    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // O caminho já traz o locale — propagá-lo para o layout raiz poder emitir
  // o `lang` correto no HTML servido.
  const localeFromPath = locales.find(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`),
  );

  return NextResponse.next(
    localeFromPath ? withLocaleHeader(request, localeFromPath) : undefined,
  );
}

/**
 * Cabeçalho `LOCALE_HEADER` no **pedido**, para o layout raiz o poder ler.
 *
 * O layout raiz é único para todas as rotas e não recebe `params`, pelo que não
 * tem outra forma de saber o locale. Antes, o `<html lang>` era sempre `pt` e um
 * componente de cliente corrigia-o depois da hidratação — tarde demais para os
 * motores de busca e para os leitores de ecrã, que leem o HTML inicial.
 */
function withLocaleHeader(request: NextRequest, locale: string) {
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  return { request: { headers } };
}

export const config = {
  matcher: [
    // Exclui: rotas de API, internos do Next, rotas de metadata (robots,
    // sitemap, ícones, imagens OG), o service worker dos motoristas, e
    // qualquer ficheiro estático com extensão conhecida.
    //
    // Três armadilhas já apanhadas aqui — ver `middleware-matcher.test.ts`,
    // que valida este padrão contra uma tabela de caminhos:
    //
    //  1. `api` sem delimitador excluía tudo o que *começasse* por "api":
    //     `/apitest`, `/apifoo`, `/api-docs` saltavam o middleware por
    //     completo — landing servida em URLs arbitrários (conteúdo duplicado)
    //     e sem refresh de sessão Supabase. Daí o `(?:/|$)`.
    //  2. Faltavam `robots.txt`, `sitemap.xml`, `icon` e `opengraph-image`:
    //     eram redirecionados para `/pt/...` e devolviam 404, o que tornava
    //     todo o SEO inoperante.
    //  3. A exclusão dizia `service-worker.js`, mas o ficheiro real é
    //     `driver-sw.js` — o service worker da PWA de motoristas nunca era
    //     alcançável (307 → 404), e o `.catch()` no registo escondia a falha.
    "/((?!api(?:/|$)|_next/|favicon\\.ico|driver-sw\\.js|robots\\.txt|sitemap\\.xml|icon(?:/|$)|apple-icon(?:/|$)|manifest\\.webmanifest)(?!.*/(?:opengraph-image|twitter-image)(?:/|$))(?!.*\\.(?:png|jpg|jpeg|gif|webp|avif|ico|svg|ttf|woff|woff2|mp4|pdf|txt|xml)$).*)",
  ],
};
