# Way2Go — Pricing & TransferCRM Integration

**Status:** authoritative reference. Last updated 25 August 2026.
**Scope:** how our tariff is constructed, how it maps onto TransferCRM, which
defects are known and who owns each one.

Read this before touching anything that computes, transforms, displays or
persists a price. If you change a number here, change it in the CRM too — this
document and the CRM config must never disagree.

---

## 1. The pricing model

```
price = max(minimum_fare[class], base_fee + rate_per_km × km) × class_multiplier
```

One base tariff. Everything else is that base scaled by a class multiplier.

| Class | code | Multiplier | Min fare | Effective €/km | Seats |
|---|---|---|---|---|---|
| Economy | `economy` | 1.00 | €36 | 1.30 | 3 |
| Comfort | `comfort` | 1.08 | €40 | 1.40 | 4 ⚠️ |
| Executive (E-Class) | `executive` | 1.20 | €45 | 1.56 | 3 |
| Van Standard | `standard-van` | 1.25 | €52 | 1.63 | 7 |
| Van Executive (V-Class) | `van_executive` | 1.55 | €68 | 2.02 | 7 |
| First (S-Class) | `first` | 1.70 | €75 | 2.21 | 3 |
| Minibus 12 | `minibus-12` | 2.30 | €95 | 2.99 | 12 |
| Minibus 16 | `minibus-16` | 2.50 | €105 | 3.25 | 16 |

⚠️ **Comfort seats disagree with the CRM.** This table says 4; `GET /v2/vehicle-classes`
returns `seats: 3`. One of the two is wrong, and it is the number the customer sees.

⚠️ **Economy does not exist in the CRM.** The class that defines the entire base tariff
is absent from the catalogue — see §5, CRM-2. Everything in this table is expressed
relative to a class the pricing engine has never heard of.

Base rule (Economy): `base_fee` €12.00, `rate_per_km` €1.30, `per_min_rate` 0.

**Round trip:** total × 2, less 15%.

**Hourly / as-directed:** `rate_per_km × 40` per hour, 40 km included per hour,
minimum 3 hours. Excess kilometres at the class `rate_per_km`.

### Why there is a base fee

The fixed component is the cost of mobilising the vehicle — identical whether
the job is 40 km or 300 km. Without it our prices sagged ~9% below market in
the 40–80 km band, because the minimum fare stops binding around 25 km but the
per-km rate doesn't catch up until ~120 km. Our main competitor charges €13.71
fixed; we use €12.00.

### Minimum fares are NOT proportional to multipliers

They were set against observed market floors, not derived from the rates.
Minibus 16 is €105 against Economy's €36 — a ratio of 2.92 — while its rate
multiplier is 2.50. **Never compute a class minimum by scaling €36.** This is
also why a single rule-level minimum cannot work (see §5, CRM-1).

---

## 2. Pricing is LINEAR — do not reintroduce tiers

We previously asked TransferCRM for degressive per-km tiers
(1.44 / 1.45 / 1.12 / 1.02) so that long trips wouldn't come out unaffordable.
That request was withdrawn. If you see tiers reappear in config or code,
it's a regression.

**Evidence.** We regressed the published tariffs of three competitors across
176 routes with known distances:

| Operator | Marginal rate | Fixed | Fit |
|---|---|---|---|
| VM Transfers (sedan) | €1.19/km | ~0 | R² 0.996, n=53 |
| VM Transfers (van) | €1.48/km | ~0 | R² 0.997, n=53 |
| Top Travel (saloon) | €1.74/km | ~0 | R² 0.985, n=120 |
| Transfeero (Economy) | €1.288/km | €17.43 | R² 0.9995, n=3 |
| Transfeero (Std Van) | €1.644/km | €13.71 | R² 0.9995, n=3 |

Adding an exponential decay term improved R² by nothing. The apparent per-km
discount on long trips is entirely the minimum fare being diluted on short
ones. There is no curve.

**The economics run the opposite way to intuition.** Porto → Paris (~1,290 km):

```
Our linear price, Van Standard      €2,111
Actual cost to run it               €1,938
  2,580 km including empty return
  tolls PT + ES + FR
  3 days driver time, 2 nights hotel
Margin                              €174  (8%)
Less 15–20 local jobs not done      −€510
Net                                 −€336
```

With degressive tiers the same trip prices at €1,379 instead of €1,689 on
Economy — discounting hardest exactly where we already lose money. Below
~100 km the empty return leg is 15 km; at 1,290 km it is 1,290 km, plus
overnight stays and regulated driving hours. **Past roughly 400 km the
economics get worse per kilometre, not better.**

**Policy:** above 400 km the widget should stop auto-quoting and route to a
manual enquiry. Those jobs are priced as a day rate plus kilometres, not as a
transfer. Requested from the CRM; not yet available.

---

## 3. Surcharges and ancillary config

| Setting | Value | Confidence |
|---|---|---|
| Airport surcharge | €2.50, auto-detect from location text | not firing — see CRM-3 |
| Meet & greet fee | €0.00 (priced into the tariff) | — |
| Waiting, street/hotel | 15 min free, €0.75/min after | = €45/h, matches our quotations |
| Waiting, airport | 60 min free, €0.75/min after | industry standard grace |
| Last-minute booking | < 4 h before pickup, ×1.25 | — |
| Night surcharge | 23:00–05:00, ×1.30 | **UNVALIDATED** |
| Weekend surcharge | Sat + Sun, ×1.20 | **UNVALIDATED — recommend 1.05 or off** |
| Extra bag | €1.50 above class threshold | — |
| Extra pax | €0.00 (price is per vehicle) | — |
| Minimum hours, hourly | 3 | — |
| Price includes tolls | yes | matches customer-facing quotations |

Every competitor quote we collected was for a **Monday**. We have no weekend
data at all. Saturday and Sunday are peak volume for airport transfers, so a
+20% weekend surcharge risks looking expensive precisely when demand is
highest. Three Saturday quotes from Transfeero would settle it.

---

## 4. VAT — UNRESOLVED, TREAT AS A LIVE RISK

There is **no VAT logic anywhere**: not in our code, not in the CRM response,
not in the breakdown. A search of `src/` for `vat`, `iva`, `1.06`, `0.06`,
`taxRate`, `gross`, `net_price` returns only the NIF/VAT form label and the
partner commission enum.

€36.90 is simply the configured tariff, unmarked as gross or net.

Portuguese passenger transport is **6%**. If the configured `base_fee` and
`rate_per_km` are net, then 6% is missing across the whole platform —
including what Stripe charges the customer — and that is an invoicing problem,
not just a pricing one.

**Pending answer from the CRM developer.** Do not add VAT handling on the site
side until we know whether the CRM applies it, or we will double-count.

---

## 5. Known defects

### CRM side — awaiting the CRM developer

> **Update, 25 August 2026 — the money path had TWO independent faults, not one.**
> The one below is real and still open on the CRM side. A second one, entirely ours,
> was found and fixed the same day: `validateBookingPayload` rebuilt the payload field
> by field and silently dropped `vehicle_class_code`, so **the site never sent the class
> at all**. Measured in production on a 325 km route, where the minimum does not bind:
> all three classes returned €434.75, which is `12 + 1.30 × 325.19` with no multiplier.
> After the fix: comfort €469.53, standard-van €543.43, van_executive €673.86 — the
> configured multipliers, exactly. See SITE-5.

**CRM-1 — per-class minimum fares never reach the pricing engine.** *Highest
priority.* The engine applies €36 (Economy's) to every class. Proven by
forcing `distance_km` to 1 so the floor has to bind:

| class | multiplier | (base+dist)×mult | price returned | `minimum_fare` in breakdown |
|---|---|---|---|---|
| comfort | 1.08 | 14.36 | **36.00** | 36 |
| standard-van | 1.25 | 16.62 | **36.00** | 36 |
| van_executive | 1.55 | 20.62 | **36.00** | 36 |

The floor logic works and is correctly applied **after** the multiplier. There
is simply only one value. On a real quote it never bites:

```
OPO → Hilton Porto Gaia, 27-08-2026 08:56, 3 pax, 2 bags, distance 17.054 km

comfort        (12 + 22.17) × 1.08 = 36.90    should be max(40, 36.90) = 40.00
standard-van   (12 + 22.17) × 1.25 = 42.71    should be max(52, 42.71) = 52.00
van_executive  (12 + 22.17) × 1.55 = 52.96    should be max(68, 52.96) = 68.00
```

Arithmetic matches to the cent on all three, so the rest of the engine is
sound. We are 8–28% under intended prices on short trips, which are the bulk
of our volume.

**CRM-2 — only 3 of 8 vehicle classes are returned.** `GET /v2/availability`
returns exactly `comfort`, `standard-van`, `van_executive`. Missing: Economy,
Executive, First, Minibus 12, Minibus 16. Verified not to be our filtering —
with 1, 2, 3 or 4 passengers the returned list is identical, and our only
filter discards classes without a `code`. Economy should be the first and
cheapest option on a 3-pax booking and customers never see it.

*Diagnostic run, 24 August 2026 — the premise was wrong.* `GET /v2/vehicle-classes`
returns **6**, not 8. This splits into two unrelated causes:

| code | seats | `vehicles_available` | in `/availability`? |
|---|---|---|---|
| comfort | 3 | 2 | **yes** |
| standard-van | 7 | 2 | **yes** |
| van_executive | 7 | 1 | **yes** |
| executive | 3 | **0** | no |
| minibus-12 | 12 | **0** | no |
| minibus-16 | 16 | **0** | no |
| economy | — | **absent from the catalogue** | no |
| first | — | **absent from the catalogue** | no |

The correlation is exact: `/availability` returns precisely the classes with fleet
assigned. **That is defensible behaviour** for an endpoint documented as an
availability check — there is no point offering a class that cannot be dispatched.

So: **do not ask the CRM developer to change the availability filter.** Ask instead
for (a) `economy` and `first` to be created or reactivated, and (b) confirmation that
filtering on `vehicles_available > 0` is intentional. If it is, `executive` and the two
minibuses are an **operations** problem — assign vehicles in the CRM — and no code
change fixes it.

Corollary worth stating plainly: **the base class of the whole tariff does not exist in
the CRM.** Every multiplier in §1 is relative to something the engine cannot quote.

**CRM-3 — airport surcharge does not fire.** Two independent proofs. The
arithmetic leaves no room: `(12 + 22.17) × 1.08 = 36.90` exactly; with €2.50 it
would be 39.60 or 39.40. And the same quote with pickup
`"Rua de Cedofeita 100, Porto"` versus `"Aeroporto Francisco Sá Carneiro (OPO)"`
returns an identical price and an identical nine-field breakdown. There is no
surcharge field in the response at all.

### Site side — ours to fix

**SITE-1 — seats precedence inverted.** ✅ *Fixed 22 Aug, PR #13.* `QuickQuoteForm.tsx:1172`

```ts
const lugares = c.seatsAvailable ?? c.seats;   // wrong
```

`seats_available` is fleet availability, not capacity — confirmed by varying
passengers 1→4 with no change in the value. Both CRM fields are correct. This
displayed "Standard Van — até 2 lugares" for a 7-seater. Same line has a plural
bug: "1 lugares".

Corroborated independently by the CRM-2 diagnostic: `seats_available` in
`/availability` (2 / 2 / 1) is **exactly** `vehicles_available` in
`/vehicle-classes` (2 / 2 / 1). The field counts vehicles, not seats — the name
is what misleads.

**SITE-2 — hardcoded airport pickup coordinate.** ✅ *Fixed 22 Aug, PR #13 — but it changes nothing in production.*
`estimate-route-distance-km.ts:63` pins OPO to `41.2421, -8.6781`. Any pickup
string containing "OPO" or "Sá Carneiro" is never geocoded. Likely cause of
17.054 km instead of the ~20 km road distance. Verified: it was **not** the kerbside. Reverse geocoding puts `41.2421, -8.6781`
at *"Apron S"*, `aeroway=apron` — the aircraft parking apron, airside, with no
road access. Corrected to `41.2365, -8.67154`, the passenger terminal
(`aeroway=terminal`, via Overpass). It was hardcoded in **two** places; the first
attempt caught only one.

**But the distance did not move.** Measured after deploy: still 17.054 km. The
production Google Directions key works, and Directions geocodes the *text*
`"Aeroporto Francisco Sá Carneiro (OPO)"` — it never reaches our coordinate table.
The fix only matters when Google fails and the cascade falls through to OSRM,
which is exactly the scenario SITE-3 describes. So the ~20 km discrepancy is
**still unexplained**, and SITE-3 is now the prime suspect.

LIS and FAO have the same defect and were left alone, being out of scope:
`38.7742, -9.1342` is a **navigation aid**, `37.0144, -7.9659` a **runway holding
position**. Neither is a terminal.

**SITE-3 — Google Directions key returns INVALID_REQUEST.** The distance
cascade is Google Directions → Nominatim + OSRM → haversine × 1.25
(`ensure-distance-km.ts:26`). If the production key fails the same way, we fall
back silently to the **public OSRM demo server** — no SLA — in the price path.
Confirm the production key works and add an alert if the cascade falls through.

**SITE-4 — we discard the breakdown.** `quote-public.ts:126` re-exports only
price, currency, distance and duration. The type already exists at
`openapi.types.ts:82-88`. CRM-1 sat invisible for months because of this.
Persist the breakdown on quotes so pricing regressions are detectable.

**SITE-5 — the validator silently dropped the class code.** ✅ *Fixed 25 Aug, PR #15.*
*This was the actual site-side cause of the whole pricing problem.*

`validateBookingPayload` (`src/lib/transfercrm/validation.ts`) rebuilds the payload
field by field. `vehicleClassCode` was not in the list, so it was deleted in silence.
The validator sits **between** the code that builds the payload and the code that maps
it to the CRM, on both the quote path and the booking path.

The consequence: **PR #5 and PR #11 were both correct at the ends, and the field died
in the middle.** Two fixes, months of diagnosis, and the defect was one missing line in
a third file neither PR had looked at.

Both PRs' tests passed because they wired the payload builder straight to the mapper,
skipping the validator that the real request path goes through. The regression test now
walks the full seam — build → validate → map — on both paths, and was confirmed to fail
without the fix and pass with it (`src/lib/booking/class-code-end-to-end.test.ts`).

**The lesson, for anyone touching the money path:** a test that skips a layer proves
nothing about the layer it skipped. Any test that claims to protect pricing must start
at the parsed DTO and end at the outbound CRM request, with nothing stubbed in between.

---

## 6. The availability vs quote architecture decision

This is a design question, not a bug, and it needs a decision.

- `GET /v2/availability` — documented as *"availability and **starting
  prices**"*. Returns `estimated_price` per class, **no breakdown**. This is
  what currently feeds the vehicle picker the customer chooses from.
- `POST /v2/quote` — documented as *"detailed price quote with **full
  breakdown**"*. Applies the €36 floor.

They disagree in the same response: we re-quote the coarse vehicle categories
one at a time via `/v2/quote` (`vehicles/route.ts:43`) and get €36.00, while
the classes from `/availability` come back at €36.90.

**The customer is choosing from prices the API itself labels as indicative.**
Either the site quotes each class via `/v2/quote`, or `/availability` must
apply identical rules. Preference: quote each class properly, and treat
`/availability` purely as an availability check.

Breakdown for the current path:

```json
"breakdown": {
  "base_fee": 12, "per_km_rate": 1.3, "per_min_rate": 0,
  "distance_cost": 22.17, "distance_pricing": "flat",
  "distance_tiers": [], "vehicle_multiplier": 1.08,
  "time_surcharge": 1, "minimum_fare": 36
}
```

`time_surcharge: 1` is multiplicative, not additive. There is no tolls field,
no VAT field, no airport surcharge field.

---

## 7. TransferCRM v2 API surface

**Tenant:** `way2go.transfercrm.com` — **confirmed 22 Aug**. Every endpoint called
during the diagnosis answered 200 from that host, and the bearer token in the app
config carries the same tenant ref. The `go.transfercrm.com` mentioned earlier was a
transcription slip; there is no second tenant.

### Catalogue & pricing
| | | |
|---|---|---|
| `GET` | `/v2/vehicle-classes` | Active vehicle classes. Call once at startup; pass the stable `code` to `/v2/book` and `/v2/quote` as `vehicle_class_code`. |
| `GET` | `/v2/availability` | Availability and starting prices for a route and date. |
| `POST` | `/v2/quote` | Detailed quote with full breakdown. Requires `distance_km` — returns 422 without it. The CRM does **not** compute distance. |
| `GET` | `/v2/vehicles` | Read-only fleet. Resolves `vehicle_id` from bookings/webhooks to plate, class, capacity. `/{id}` for one. |
| `GET` | `/v2/clients` | Cursor-paginated; searchable by name, email, phone, VAT number. |
| `POST` | `/v2/clients` | Push a client. Duplicate email/tax id → 409 with candidates; retry `force: true`. Fires `client.created`. |
| `PATCH` | `/v2/clients/{id}` | Fires `client.updated`. No DELETE by design. |
| `GET` | `/v2/invoices` | Read-only, for accounting sync. `/{id}` adds `order_ids`, `line_items`, `billing_details`; `/pdf` renders. |

### Bookings
| | | |
|---|---|---|
| `POST` | `/v2/book` | Idempotent on `external_reference`. |
| `GET` | `/v2/bookings` | Cursor-paginated, for daily reconciliation. |
| `GET` | `/v2/bookings/{id}` | Status, driver/vehicle assignment, flight status. |
| `PATCH` | `/v2/bookings/{id}` | Emits `order.updated`. `driver_id` assigns (fires `order.driver_assigned`); `null` unassigns, requires `unassign_reason` on active bookings. |
| `GET` | `/v2/bookings/{id}/position` | Driver GPS, 120s TTL. `data: null` — never 404 — when no driver, inactive, or stale. |
| `POST` | `/v2/bookings/{id}/cancel` | 422 if completed or cancelled. `cancel_linked: true` cancels both legs. |

### Partners
`GET /v2/partners` · `POST /v2/partners` (409 with `existing_partner_id`) ·
`GET /v2/partners/{id}` (+ stats: drivers, orders, revenue vs partner cost) ·
`PATCH /v2/partners/{id}` (one webhook per save: `partner.deactivated` /
`partner.activated` / `partner.updated`; no DELETE)

### Drivers
`GET /v2/drivers` · `POST /v2/drivers` (409 with `existing_driver_id`) ·
`GET /v2/drivers/{id}` (+ completion rate) · `PATCH /v2/drivers/{id}` ·
`GET /v2/drivers/{id}/earnings` (per currency and month, `driver_payout` split
from `trip_cost`)

---

## 8. Validation

Van Standard against Transfeero (list price, ex-VAT, quoted 17 Aug 2026):

| km | Way2Go | Transfeero | Δ |
|---|---|---|---|
| 15 | €52.00 | €53.83 | −3.4% |
| 44 | €86.50 | €86.04 | +0.5% |
| 80 | €145.00 | €145.22 | −0.2% |
| 128 | €223.00 | €224.13 | −0.5% |
| 200 | €340.00 | €342.51 | −0.7% |
| 324 | €541.50 | €547.99 | −1.2% |

Under 1.5% across the range, consistently below. **Any pricing change must be
re-checked against this table.** If a change moves us more than ±5% from these
figures, it is wrong until proven otherwise.

Competitor reference rates (ex-VAT, marginal €/km): Uber X 0.70 · Uber Comfort
0.95 · Uber XL 1.25 · VM sedan 1.19 · VM van 1.48 · Transfeero Economy 1.29 ·
Transfeero Van 1.64 · Top Travel saloon 1.74 · Top Travel van 1.82.

The Van/Economy ratio of **1.25** is confirmed in four independent data sets
with 5% dispersion on routes over 120 km. Treat it as a market constant.

The executive-van premium is **not** settled: Top Travel charges +2% over the
standard van, Transfeero +69% (their First Class Van is a 6-seater, likely a
different product). Our 1.55 is a deliberate midpoint. Do not move it without
new data.

---

## 9. Rules for changing anything here

1. **Never add price arithmetic to the site.** The CRM is the pricing
   authority. Today the site is verbatim end to end — `vehicles/route.ts:92`,
   `TransferCrmApiClient.ts:61-72`, `QuickQuoteForm.tsx:1198-1201` — and it
   must stay that way. The only local price model is `MARKUP` / `NET_PRICE` in
   `pricing.service.ts quoteForPartnerPortal`, exclusive to the partner portal;
   the B2C widget must never touch it.
2. **Change prices in the CRM, then update §1 here.** Not the other way round.
3. **Re-run §8 after any change.**
4. **Do not scale minimum fares from the Economy value.** See §1.
5. **Do not reintroduce degressive tiers.** See §2.
6. **Do not add VAT handling until §4 is resolved.**
7. When a price looks wrong, get the raw `/v2/quote` breakdown first. The
   arithmetic identifies which layer failed — see §5, CRM-1 for the method.
8. **Test the whole seam, never a hop.** Any test protecting the money path starts at
   the parsed DTO and ends at the outbound CRM request, with nothing stubbed between.
   Two correct fixes shipped without effect because their tests skipped the validator
   sitting in the middle — see §5, SITE-5.
9. **Prove it in production, on a route where the minimum does not bind.** Below about
   25 km the floor swallows every multiplier, so three classes returning the same price
   proves nothing. Use a long route: OPO → Lisboa at 325 km separates them cleanly.
