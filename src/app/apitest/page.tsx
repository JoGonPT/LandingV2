"use client";

import { useMemo, useState } from "react";

type HttpMethod = "GET" | "POST" | "PUT";

type EndpointConfig = {
  key: string;
  method: HttpMethod;
  path: string;
  title: string;
  defaultBody?: string;
};

type EndpointResult = {
  loading: boolean;
  status?: number;
  ok?: boolean;
  responseText?: string;
  error?: string;
};

const ENDPOINTS: EndpointConfig[] = [
  { key: "orders-list", method: "GET", path: "/api/v1/orders", title: "List orders (paginated, filterable)" },
  {
    key: "orders-create",
    method: "POST",
    path: "/api/v1/orders",
    title: "Create order",
    defaultBody: JSON.stringify(
      {
        client_id: 1,
        pickup: "Aeroporto do Porto",
        dropoff: "Aveiro",
        datetime: "2026-05-10T10:00:00Z",
      },
      null,
      2,
    ),
  },
  { key: "orders-detail", method: "GET", path: "/api/v1/orders/{id}", title: "Get order detail" },
  {
    key: "orders-update",
    method: "PUT",
    path: "/api/v1/orders/{id}",
    title: "Update order",
    defaultBody: JSON.stringify(
      {
        notes: "Updated from API test page",
      },
      null,
      2,
    ),
  },
  {
    key: "orders-status",
    method: "POST",
    path: "/api/v1/orders/{id}/status",
    title: "Change order status",
    defaultBody: JSON.stringify(
      {
        status: "confirmed",
      },
      null,
      2,
    ),
  },
  {
    key: "orders-assign-driver",
    method: "POST",
    path: "/api/v1/orders/{id}/assign-driver",
    title: "Assign driver",
    defaultBody: JSON.stringify(
      {
        driver_id: 1,
      },
      null,
      2,
    ),
  },
  { key: "clients-list", method: "GET", path: "/api/v1/clients", title: "List clients" },
  {
    key: "clients-create",
    method: "POST",
    path: "/api/v1/clients",
    title: "Create client",
    defaultBody: JSON.stringify(
      {
        name: "Cliente Teste",
        email: "cliente.teste@example.com",
        phone: "+351910000000",
      },
      null,
      2,
    ),
  },
  { key: "drivers-list", method: "GET", path: "/api/v1/drivers", title: "List drivers" },
  { key: "vehicles-list", method: "GET", path: "/api/v1/vehicles", title: "List vehicles" },
  { key: "reports", method: "GET", path: "/api/v1/reports", title: "Get reports data" },
  { key: "export-orders", method: "GET", path: "/api/v1/export/orders", title: "Export orders CSV" },
  { key: "export-clients", method: "GET", path: "/api/v1/export/clients", title: "Export clients CSV" },
  { key: "flights-lookup", method: "GET", path: "/api/v1/flights/lookup", title: "Flight status lookup" },
  {
    key: "orders-suggest-driver",
    method: "GET",
    path: "/api/v1/orders/{id}/suggest-driver",
    title: "Smart dispatch suggestions",
  },
];

function prettyText(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default function ApiTestPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [resourceId, setResourceId] = useState("1");
  const [flightQuery, setFlightQuery] = useState("tp1923");
  const [bodies, setBodies] = useState<Record<string, string>>(() =>
    ENDPOINTS.reduce<Record<string, string>>((acc, endpoint) => {
      if (endpoint.defaultBody) acc[endpoint.key] = endpoint.defaultBody;
      return acc;
    }, {}),
  );
  const [results, setResults] = useState<Record<string, EndpointResult>>({});

  const normalizedBaseUrl = useMemo(() => {
    const trimmed = baseUrl.trim();
    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  }, [baseUrl]);

  function resolvePath(path: string) {
    let resolved = path.replaceAll("{id}", resourceId.trim() || "1");
    if (resolved === "/api/v1/flights/lookup") {
      const q = encodeURIComponent(flightQuery.trim() || "tp1923");
      resolved = `${resolved}?q=${q}`;
    }
    return resolved;
  }

  async function runEndpoint(endpoint: EndpointConfig) {
    const path = resolvePath(endpoint.path);
    const url = `${normalizedBaseUrl}${path}`;
    const hasJsonBody = endpoint.method === "POST" || endpoint.method === "PUT";

    setResults((prev) => ({
      ...prev,
      [endpoint.key]: { loading: true },
    }));

    try {
      const response = await fetch(url, {
        method: endpoint.method,
        headers: hasJsonBody
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
        body: hasJsonBody ? (bodies[endpoint.key] || "{}") : undefined,
      });

      const responseText = await response.text();
      setResults((prev) => ({
        ...prev,
        [endpoint.key]: {
          loading: false,
          status: response.status,
          ok: response.ok,
          responseText: prettyText(responseText),
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown request error";
      setResults((prev) => ({
        ...prev,
        [endpoint.key]: {
          loading: false,
          error: message,
        },
      }));
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">API Test</h1>
        <p className="text-sm text-neutral-600">
          Execute API endpoints visually and inspect status and response payloads.
        </p>
      </div>

      <section className="mt-6 grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Base URL</span>
          <input
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="https://www.way2go.pt"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Order / Resource ID</span>
          <input
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">Flight Query</span>
          <input
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            value={flightQuery}
            onChange={(e) => setFlightQuery(e.target.value)}
          />
        </label>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {ENDPOINTS.map((endpoint) => {
          const result = results[endpoint.key];
          const hasBody = endpoint.method === "POST" || endpoint.method === "PUT";
          const resolvedPath = resolvePath(endpoint.path);
          const fullUrl = `${normalizedBaseUrl}${resolvedPath}`;

          return (
            <article key={endpoint.key} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-neutral-900">{endpoint.title}</h2>
                <span className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-semibold text-white">{endpoint.method}</span>
              </div>

              <p className="mt-2 break-all rounded-md bg-neutral-50 px-2 py-1 font-mono text-xs text-neutral-700">
                {fullUrl || resolvedPath}
              </p>

              {hasBody ? (
                <div className="mt-3 space-y-1">
                  <label className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">JSON Body</label>
                  <textarea
                    className="h-32 w-full rounded-lg border border-neutral-300 p-2 font-mono text-xs"
                    value={bodies[endpoint.key] || ""}
                    onChange={(e) =>
                      setBodies((prev) => ({
                        ...prev,
                        [endpoint.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void runEndpoint(endpoint)}
                disabled={result?.loading}
                className="mt-3 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {result?.loading ? "Running..." : "Run endpoint"}
              </button>

              <div className="mt-3 space-y-2">
                {typeof result?.status === "number" ? (
                  <p className={`text-sm font-semibold ${result.ok ? "text-green-700" : "text-red-700"}`}>
                    Status: {result.status}
                  </p>
                ) : null}
                {result?.error ? <p className="text-sm font-semibold text-red-700">Error: {result.error}</p> : null}
                {result?.responseText ? (
                  <pre className="max-h-64 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">
                    {result.responseText}
                  </pre>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
