"use client";

import { useEffect, useMemo, useState } from "react";

export default function TransferCrmWidget() {
  const [scriptFailed, setScriptFailed] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  const widgetScriptSrc =
    process.env.NEXT_PUBLIC_TRANSFERCRM_WIDGET_SCRIPT_URL?.trim() ||
    "https://transfercrm.com/widget/booking.js";
  const widgetTenant =
    process.env.NEXT_PUBLIC_TRANSFERCRM_WIDGET_TENANT?.trim() || "way2go";
  const widgetLang =
    process.env.NEXT_PUBLIC_TRANSFERCRM_WIDGET_LANG?.trim() || "pt-PT";
  const widgetColor =
    process.env.NEXT_PUBLIC_TRANSFERCRM_WIDGET_COLOR?.trim() || "indigo-500";

  const fallbackHref = useMemo(() => {
    const tenant = encodeURIComponent(widgetTenant);
    const lang = encodeURIComponent(widgetLang);
    return `https://transfercrm.com/?tenant=${tenant}&lang=${lang}`;
  }, [widgetTenant, widgetLang]);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${widgetScriptSrc}"]`,
    );

    const markLoaded = () => {
      setScriptReady(true);
      setScriptFailed(false);
    };
    const markFailed = () => {
      setScriptReady(false);
      setScriptFailed(true);
    };

    if (existing) {
      if (existing.dataset.loaded === "true") {
        markLoaded();
      } else {
        existing.addEventListener("load", markLoaded);
        existing.addEventListener("error", markFailed);
      }
    } else {
      const script = document.createElement("script");
      script.src = widgetScriptSrc;
      script.dataset.tenant = widgetTenant;
      script.dataset.lang = widgetLang;
      script.dataset.color = widgetColor;
      script.async = true;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        markLoaded();
      });
      script.addEventListener("error", markFailed);
      document.body.appendChild(script);
    }

    const timeoutId = window.setTimeout(() => {
      if (!scriptReady) {
        markFailed();
      }
    }, 7000);

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      existing?.removeEventListener("load", markLoaded);
      existing?.removeEventListener("error", markFailed);
    };
  }, [scriptReady, widgetColor, widgetLang, widgetScriptSrc, widgetTenant]);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-700">
        Checklist de 60 segundos para confirmar:
      </div>
      <div className="p-4">
        <div id="transfercrm-booking" />
        {scriptFailed ? (
          <div
            className="mt-3 rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            role="alert"
          >
            Nao foi possivel carregar o formulario automaticamente. Pode continuar em{" "}
            <a
              href={fallbackHref}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              transfercrm.com
            </a>
            .
          </div>
        ) : null}
      </div>
    </div>
  );
}

