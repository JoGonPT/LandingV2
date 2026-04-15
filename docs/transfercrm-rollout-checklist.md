# TransferCRM Rollout Checklist

## Environment
- Set `TRANSFERCRM_BASE_URL` to `https://{slug}.transfercrm.com` (integration calls `{BASE}/api/v2/book`).
- B2B API authentication (Definições → Chaves API):
  - Recommended: `TRANSFERCRM_AUTH_MODE=x_api_key` + `TRANSFERCRM_API_KEY`
  - Or: `TRANSFERCRM_AUTH_MODE=bearer` + `TRANSFERCRM_BEARER_TOKEN` (same `tcrm_...` key)
- Optional: `TRANSFERCRM_TIMEOUT_MS`.
- Rate limit: 60 req/min per key (HTTP 429).

## Functional validation
- Submit booking in PT locale and confirm client + order creation in CRM.
- Submit booking in EN locale and confirm locale metadata in CRM.
- Confirm duplicate submit sends same idempotency key metadata.
- If initial status is enabled, verify order status update succeeded.

## Error handling
- Simulate wrong token and confirm user-friendly frontend message.
- Simulate CRM timeout/unavailability and validate graceful failure.
- Confirm backend logs include `requestId` and no sensitive token/PII dump.

## Production readiness
- Run `npm run lint`.
- Run `npm run test`.
- Validate API endpoint works in non-static deployment mode.
