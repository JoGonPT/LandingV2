import type { BookingLocale } from "@/lib/transfercrm/types";
import type { TransferCrmVehicleOption } from "@/lib/transfercrm/types";
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

function brandCopy(lane: ReturnType<typeof inferVehicleBrandLane>, L: VehicleClassSelectorLabels) {
  if (lane === "van") return { title: L.businessVan, hint: L.vanHint };
  if (lane === "first") return { title: L.firstClass, hint: L.firstHint };
  return { title: L.businessClass, hint: L.businessHint };
}

export function VehicleClassSelector({
  options,
  selected,
  onSelect,
  locale,
  labels,
}: {
  options: TransferCrmVehicleOption[];
  selected: string;
  onSelect: (vehicleType: string) => void;
  locale: BookingLocale;
  labels: VehicleClassSelectorLabels;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-1">
      {options.map((v) => {
        const lane = inferVehicleBrandLane(v.vehicleType);
        const { title, hint } = brandCopy(lane, labels);
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
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-neutral-400">
                      {v.vehicleType.replace(/_/g, " ")}
                    </p>
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
