# Way2Go Engine-Agnostic Architecture (Hexagonal)

## 1) Objetivo

Migrar o motor de reservas Way2Go de um modelo **CRM-Dependent** (TransferCRM como núcleo) para um modelo **Engine-Agnostic** usando **Arquitetura Hexagonal (Ports & Adapters)**, garantindo que:

- `Next.js` (B2C/B2B) continua a falar apenas com a API Way2Go.
- `Drivers` (PWA/API) continuam a operar sobre o mesmo contrato de booking/status.
- O motor subjacente (TransferCRM ou Native) é detalhe interno do backend.

---

## 2) Princípios de Arquitetura

### 2.1 Portas e Adaptadores

- **Core (Domínio de Booking)**: regras de negócio, validações, status lifecycle, idempotência.
- **Porta de saída (`IBookingProvider`)**: contrato universal para qualquer engine de reserva.
- **Adaptadores**:
  - `TransferCrmProvider` (adapter externo).
  - `Way2GoNativeProvider` (adapter interno Supabase).
- **Orquestrador (`BookingEngineService`, NestJS)**: seleciona provider primário, aplica failover, uniformiza erros.

### 2.2 Contrato Único para os clientes

`Next.js` e `Drivers` recebem sempre o mesmo payload público (`BookingResponseDTO`, `QuoteResponseDTO`, etc.).  
Nunca recebem classes/objetos específicos de `TransferCRM` ou `Way2GoNative`.

### 2.3 Idempotência e rastreabilidade

Todas as operações críticas devem suportar:

- `idempotencyKey` (ex.: PaymentIntent, internalOrderId, partner reference).
- `requestId` para tracing end-to-end.
- `providerBookingId` + `providerName` para auditoria interna.

---

## 3) Interface Universal: `IBookingProvider`

## 3.1 Contrato recomendado (TypeScript/NestJS)

```ts
export type ProviderName = "TRANSFER_CRM" | "WAY2GO_NATIVE";

export type BookingUnifiedStatus =
  | "PENDING_QUOTE"
  | "QUOTED"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "ASSIGNED"
  | "DRIVER_EN_ROUTE"
  | "PASSENGER_ON_BOARD"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "PENDING_INTERNAL_PROCESSING";

export interface QuoteRequestDTO {
  pickup: string;
  dropoff: string;
  pickupAtIso: string;
  passengers?: number;
  luggage?: number;
  vehicleType?: string;
  distanceKm?: number;
  locale: "pt" | "en";
  partnerContext?: {
    partnerSlug?: string;
    partnerDisplayName?: string;
    settlementMode?: "account" | "stripe";
  };
}

export interface QuoteResponseDTO {
  quoteId: string;
  totalAmount: number;
  currency: string;
  validUntil?: string;
  vehicleOptions?: Array<{
    vehicleType: string;
    seatsAvailable: number;
    estimatedPrice: number;
    currency: string;
  }>;
  provider: ProviderName;
  providerQuoteRef?: string;
}

export interface CreateBookingDTO {
  idempotencyKey: string;
  locale: "pt" | "en";
  route: {
    pickup: string;
    dropoff: string;
    pickupAtIso: string;
    flightNumber?: string;
    childSeat?: boolean;
  };
  pax: { passengers: number; luggage: number };
  contact: { fullName: string; email?: string; phone?: string };
  vehicleType?: string;
  quotedPrice?: { amount: number; currency: string };
  notes?: string;
  gdprAccepted: boolean;
  partnerContext?: {
    partnerSlug?: string;
    partnerDisplayName?: string;
    internalReference?: string;
    settlementMode?: "account" | "stripe";
  };
}

export interface CreateBookingResultDTO {
  bookingId: string; // ID canónico Way2Go
  providerBookingId?: string; // ID no provider
  status: BookingUnifiedStatus;
  provider: ProviderName;
  trackingUrl?: string;
  orderReference?: string;
}

export interface CancelBookingDTO {
  bookingId: string;
  reason: string;
  requestedBy: "passenger" | "partner" | "admin" | "system";
}

export interface CancelBookingResultDTO {
  bookingId: string;
  status: "CANCELLED" | "PENDING_INTERNAL_PROCESSING";
  provider: ProviderName;
  providerCancellationRef?: string;
}

export interface UpdateTravelStatusDTO {
  bookingId: string;
  travelStatus:
    | "DRIVER_ASSIGNED"
    | "EN_ROUTE_PICKUP"
    | "ARRIVED_PICKUP"
    | "PASSENGER_ON_BOARD"
    | "COMPLETED"
    | "NO_SHOW";
  occurredAtIso: string;
  actor: "driver" | "dispatcher" | "system";
}

export interface UpdateTravelStatusResultDTO {
  bookingId: string;
  status: BookingUnifiedStatus;
  provider: ProviderName;
}

export interface IBookingProvider {
  readonly name: ProviderName;

  quote(input: QuoteRequestDTO): Promise<QuoteResponseDTO>;
  create(input: CreateBookingDTO): Promise<CreateBookingResultDTO>;
  cancel(input: CancelBookingDTO): Promise<CancelBookingResultDTO>;
  updateStatus(input: UpdateTravelStatusDTO): Promise<UpdateTravelStatusResultDTO>;

  getById(bookingId: string): Promise<CreateBookingResultDTO | null>;
  healthcheck(): Promise<{ ok: boolean; latencyMs?: number; reason?: string }>;
}
```

## 3.2 Métodos universais obrigatórios

- `quote`: simulação/cálculo de preço e viaturas.
- `create`: criação de reserva.
- `cancel`: cancelamento explícito.
- `updateStatus`: progressão operacional (sobretudo para Drivers/PWA).
- `getById`: leitura para detalhe e sincronização.
- `healthcheck`: usado pelo orquestrador para failover e circuit breaker.

---

## 4) Implementação do `TransferCrmProvider`

## 4.1 Mapeamento de métodos da interface para APIs existentes

| `IBookingProvider` | TransferCRM atual | Notas |
|---|---|---|
| `quote` | `GET /availability` e/ou `POST /quote` | Já existe em `TransferCrmApiClient.getAvailabilityForBooking` + `postQuoteForBooking`. |
| `create` | `POST /book` | Já existe em `postBookForPayload` e `postBookForPaidCheckout`. |
| `cancel` | `PATCH /bookings/{id}` (status/cancel flag) | Se tenant não suportar cancel real, marcar `cancel_requested` + reconciliação interna. |
| `updateStatus` | `PATCH /bookings/{id}` com `travel_status` | Alinhado com endpoint de drivers já existente. |
| `getById` | `GET /bookings/{id}` | Já existe em `getBooking`. |
| `healthcheck` | chamada leve (`GET /bookings` limitado ou endpoint health) | Timeout curto + circuito. |

## 4.2 Normalização de dados (adapter)

O `TransferCrmProvider` converte DTOs canónicos para tipos atuais:

- `CreateBookingDTO` -> `BookingPayload` -> `BookingRequest`.
- `QuoteRequestDTO` -> `BookingPayload` -> `QuoteRequest`.
- `UpdateTravelStatusDTO` -> `PATCH /bookings/{id}`.

Mapeamentos críticos:

- `idempotencyKey` -> `external_reference`.
- `partnerContext` -> `notes` + convenção `B2B-REF-*`.
- `status`/`travel_status` do CRM -> `BookingUnifiedStatus`.

## 4.3 Erros e retries no adapter

Reutilizar o comportamento já implementado:

- Retry para `429` (rate limit) e falhas transitórias.
- Erros públicos padronizados (`CRM_TIMEOUT`, `CRM_UNAVAILABLE`, `AUTH_FAILED`).
- Nunca propagar payload cru do CRM para o frontend.

---

## 5) Blueprint do `Way2GoNativeProvider` (Supabase)

## 5.1 Responsabilidade

Provider interno que implementa o mesmo `IBookingProvider`, suportando operação completa sem terceiro:

- pricing,
- disponibilidade,
- despacho,
- updates de viagem,
- cancelamentos.

## 5.2 Estrutura de módulos (NestJS)

```text
src/modules/booking-engine/
  booking-engine.service.ts         // orquestrador + failover
  ports/booking-provider.port.ts    // IBookingProvider
  providers/transfer-crm.provider.ts
  providers/way2go-native.provider.ts
  mappers/unified-status.mapper.ts
  repositories/
    bookings.repo.ts
    fleet.repo.ts
    availability.repo.ts
  workers/
    internal-processing.worker.ts    // retry/reprocesso
```

## 5.3 Regras base do Native Provider

- `quote`: calcula preço via `rate_cards` + contexto temporal + tipo viatura.
- `create`: cria booking com lock transacional de disponibilidade.
- `cancel`: liberta capacidade alocada e regista auditoria.
- `updateStatus`: atualiza lifecycle operacional e timeline de eventos.
- `getById`: retorna estado canónico.

---

## 6) Lógica de Failover (NestJS Orchestrator)

## 6.1 Estratégia alvo

**Primary provider**: `TransferCrmProvider`  
**Fallback provider**: `Way2GoNativeProvider` (ou persistência mínima para processamento interno)

## 6.2 Fluxo para `create` (booking)

1. Validar payload no domínio.
2. Tentar `transferCrmProvider.create(...)` com timeout e retries.
3. Se sucesso: persistir espelho local (`provider=TRANSFER_CRM`, `provider_booking_id`, status normalizado).
4. Se erro transitório (`timeout`, `5xx`, `429`, `network`, `circuit_open`):
   - gravar em Supabase com:
     - `status = PENDING_INTERNAL_PROCESSING`
     - `provider = WAY2GO_NATIVE` (ou `TRANSFER_CRM` + `failover=true`, conforme política)
     - `failover_reason`
     - `next_retry_at`
   - publicar evento para worker interno.
   - responder com booking canónico Way2Go em estado pendente.
5. Se erro funcional (ex.: validação inválida): devolver erro de negócio sem failover automático.

## 6.3 Fluxo para `quote`

- Se CRM indisponível:
  - tentar `Way2GoNativeProvider.quote` (preferível),
  - ou retornar quote degradado com flag `isEstimated=true`.

## 6.4 Política de retry/reprocessamento

- Backoff exponencial (ex.: 1m, 3m, 10m, 30m).
- Limite de tentativas + dead-letter lógico.
- Worker altera:
  - `PENDING_INTERNAL_PROCESSING` -> `CONFIRMED` quando reserva concretiza,
  - `PENDING_INTERNAL_PROCESSING` -> `FAILED` quando esgota tentativas.

---

## 7) Esquema Supabase (extensão para frota e disponibilidade)

## 7.1 Tabelas novas recomendadas

### A) Core de booking engine

- `booking_orders`
  - `id` (uuid, PK)
  - `public_reference` (texto único, visível para cliente)
  - `provider` (`TRANSFER_CRM`/`WAY2GO_NATIVE`)
  - `provider_booking_id` (nullable)
  - `status` (`BookingUnifiedStatus`)
  - `idempotency_key` (único)
  - `failover_reason` (nullable)
  - `request_payload` (jsonb)
  - `created_at`, `updated_at`

- `booking_status_events`
  - `id`, `booking_id` (FK)
  - `from_status`, `to_status`
  - `travel_status` (nullable)
  - `actor`, `occurred_at`, `meta` (jsonb)

- `booking_retry_queue`
  - `id`, `booking_id` (FK)
  - `attempt`
  - `next_retry_at`
  - `last_error_code`, `last_error_message`
  - `state` (`PENDING`, `PROCESSING`, `DONE`, `FAILED`)

### B) Frota e operação

- `fleet_vehicle_classes`
  - `id`, `code` (`BUSINESS`, `FIRST`, `VAN`)
  - `display_name`, `max_passengers`, `max_luggage`

- `fleet_vehicles`
  - `id`
  - `class_id` (FK)
  - `plate`, `brand`, `model`, `year`
  - `active`, `ownership_type` (`OWNED`,`PARTNER`)

- `drivers`
  - `id`
  - `full_name`, `phone`, `email`
  - `active`
  - `default_vehicle_id` (FK nullable)

- `driver_vehicle_assignments`
  - `id`, `driver_id` (FK), `vehicle_id` (FK)
  - `starts_at`, `ends_at`

- `driver_shifts`
  - `id`, `driver_id` (FK)
  - `shift_start`, `shift_end`
  - `service_area_id` (FK)

### C) Disponibilidade e pricing

- `service_areas`
  - `id`, `name`, `timezone`
  - `geo_fence` (geography/jsonb)

- `availability_slots`
  - `id`
  - `vehicle_id` (FK)
  - `starts_at`, `ends_at`
  - `state` (`AVAILABLE`, `HELD`, `BOOKED`, `BLOCKED`)
  - `booking_id` (FK nullable)

- `rate_cards`
  - `id`
  - `service_area_id` (FK)
  - `vehicle_class_id` (FK)
  - `base_fee`, `per_km_rate`, `per_min_rate`
  - `minimum_fare`, `currency`
  - `valid_from`, `valid_to`

- `booking_route_estimates`
  - `id`, `booking_id` (FK)
  - `distance_km`, `duration_min`
  - `source` (`GOOGLE`, `OSM`, `MANUAL`)

## 7.2 Índices e constraints essenciais

- `UNIQUE(idempotency_key)` em `booking_orders`.
- Índice composto `availability_slots(vehicle_id, starts_at, ends_at, state)`.
- Índice por `status` + `updated_at` para filas operacionais.
- FK obrigatórias entre `bookings`, `events`, `queue`.

---

## 8) Garantia de isolamento para Next.js e Drivers

## 8.1 Contrato público estável

As rotas atuais (`/api/booking/*`, `/api/partner/*`, `/api/drivers/*`) continuam iguais; somente a camada interna muda para:

- `BookingApplicationService` -> `BookingEngineService` -> `IBookingProvider`.

## 8.2 Proibição de leakage de provider

- Sem campos TransferCRM-specific no payload público.
- Sem IDs externos como referência principal para UI.
- `bookingId` público sempre gerado e controlado por Way2Go.

## 8.3 Observabilidade transversal

- Logs estruturados com:
  - `requestId`
  - `bookingId`
  - `provider`
  - `providerBookingId`
  - `failoverApplied`

Isso permite trocar provider sem impactar clients.

---

## 9) Plano de execução recomendado (incremental)

1. **Fase 1**: Introduzir `IBookingProvider` + `TransferCrmProvider` (sem mudar comportamento).
2. **Fase 2**: Criar tabelas Supabase (`booking_orders`, `status_events`, `retry_queue`) e persistência espelho.
3. **Fase 3**: Implementar failover para `PENDING_INTERNAL_PROCESSING`.
4. **Fase 4**: Entregar `Way2GoNativeProvider.quote/create` para rotas prioritárias.
5. **Fase 5**: Expandir Native para despacho completo (frota + disponibilidade + lifecycle).

---

## 10) Critério de sucesso

Way2Go passa a operar com **motor plugável**, onde:

- `TransferCRM` é apenas um adapter.
- `Way2GoNative` pode assumir parcial ou totalmente.
- `Next.js` e `Drivers` permanecem independentes do motor real de processamento.
