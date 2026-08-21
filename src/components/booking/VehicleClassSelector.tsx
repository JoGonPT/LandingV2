import type { BookingLocale } from "@/lib/transfercrm/types";
import type { TransferCrmVehicleClass, TransferCrmVehicleOption } from "@/lib/transfercrm/types";
import { formatMoneyAmount } from "@/lib/checkout/format-money";
import { inferVehicleBrandLane } from "@/lib/booking/vehicle-brand";
import { VehicleClassVisual } from "@/components/booking/VehicleClassVisual";

export interface VehicleClassSelectorLabels {
  businessClass: string;
  firstClass: string;
  businessVan: string;
  businessHint: string;
  firstHint: string;
  vanHint: string;
  seats: string;
}

function humanizeVehicleType(raw: string): string {
  return raw
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function brandHint(lane: ReturnType<typeof inferVehicleBrandLane>, L: VehicleClassSelectorLabels): string {
  if (lane === "van") return L.vanHint;
  if (lane === "first") return L.firstHint;
  return L.businessHint;
}

/**
 * Seleção de veículo.
 *
 * Quando o CRM devolve o catálogo (`classes`), é esse que manda: nome,
 * descrição, lugares e preço vêm de lá, e o valor selecionado é o `code` — que
 * é o único campo que faz o CRM cotar o nível de serviço certo.
 *
 * `options` fica como alternativa para quando não há catálogo (motor nativo).
 * Nesse caso o rótulo é derivado do tipo, como antes.
 */
export function VehicleClassSelector({
  options,
  classes,
  selected,
  onSelect,
  locale,
  labels,
}: {
  options: TransferCrmVehicleOption[];
  classes?: TransferCrmVehicleClass[];
  selected: string;
  onSelect: (value: string) => void;
  locale: BookingLocale;
  labels: VehicleClassSelectorLabels;
}) {
  if (classes && classes.length > 0) {
    return (
      <ul className="grid grid-cols-1 gap-4">
        {classes.map((c) => {
          const active = selected === c.code;
          const price = c.guestRetailPrice ?? c.estimatedPrice;
          const seats = c.seatsAvailable ?? c.seats;
          return (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => onSelect(c.code)}
                className={`group flex w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-colors ${
                  active ? "border-black ring-1 ring-black" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL externa do CRM, host desconhecido em build
                  <img
                    src={c.photoUrl}
                    alt=""
                    className="h-16 w-24 flex-none rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-black">{c.name}</span>
                  {c.description ? (
                    <span className="mt-0.5 block truncate text-sm text-neutral-500">{c.description}</span>
                  ) : null}
                  {seats ? (
                    <span className="mt-1 block text-xs text-neutral-500">
                      {labels.seats.replace(/\{n\}/g, String(seats))}
                    </span>
                  ) : null}
                </span>
                {price !== undefined ? (
                  <span className="flex-none text-right text-lg font-light tabular-nums text-black">
                    {formatMoneyAmount(price, c.currency ?? "EUR", locale)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-1">
      {options.map((v) => {
        const lane = inferVehicleBrandLane(v.vehicleType);
        const title = humanizeVehicleType(v.vehicleType);
        const hint = brandHint(lane, labels);
        const active = selected === v.vehicleType;
        const seatLabel = v.seatsAvailable
          ? labels.seats.replace(/\{n\}/g, String(v.seatsAvailable))
          : null;
        return (
          <li key={v.vehicleType}>
            <button
              type="button"
              onClick={() => onSelect(v.vehicleType)}
              className={`group w-full overflow-hidden rounded-2xl border text-left transition-colors ${
                active ? "border-black ring-1 ring-black" : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              <VehicleClassVisual lane={lane} />
              <div className="space-y-2 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-black">{title}</p>
                    <p className="text-xs text-neutral-500">{hint}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-light tabular-nums text-black">
                      {formatMoneyAmount(
                        v.guestRetailPrice != null ? v.guestRetailPrice : v.estimatedPrice,
                        v.currency,
                        locale,
                      )}
                    </p>
                    {v.guestRetailPrice != null && v.guestRetailPrice !== v.estimatedPrice ? (
                      <p className="text-xs text-neutral-500">
                        Way2Go base {formatMoneyAmount(v.estimatedPrice, v.currency, locale)}
                      </p>
                    ) : null}
                    {seatLabel ? <p className="text-xs text-neutral-600">{seatLabel}</p> : null}
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
