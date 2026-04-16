import type { VehicleBrandLane } from "@/lib/booking/vehicle-brand";

/** Minimal monochrome vehicle silhouettes (no raster assets). */
export function VehicleClassVisual({ lane, className = "" }: { lane: VehicleBrandLane; className?: string }) {
  if (lane === "van") {
    return (
      <div
        className={`relative flex h-28 w-full items-center justify-center bg-gradient-to-b from-neutral-100 to-neutral-200 ${className}`}
        aria-hidden
      >
        <svg viewBox="0 0 120 48" className="h-16 w-[85%] text-black" fill="currentColor">
          <path d="M8 32h8l4-14h52l10 14h30v-6l-8-10H70l-8-8H26L8 18v14z" opacity="0.92" />
          <rect x="14" y="34" width="12" height="10" rx="2" fill="white" />
          <rect x="78" y="34" width="12" height="10" rx="2" fill="white" />
        </svg>
      </div>
    );
  }

  if (lane === "first") {
    return (
      <div
        className={`relative flex h-28 w-full items-center justify-center bg-gradient-to-b from-neutral-200 to-neutral-300 ${className}`}
        aria-hidden
      >
        <svg viewBox="0 0 120 48" className="h-14 w-[88%] text-black" fill="currentColor">
          <path d="M6 30h10l6-12h40l14 12h38v-4l-10-10H68l-10-6H28L6 16v14z" opacity="0.95" />
          <rect x="12" y="32" width="11" height="9" rx="2" fill="white" />
          <rect x="86" y="32" width="11" height="9" rx="2" fill="white" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-28 w-full items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-200 ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 120 48" className="h-12 w-[86%] text-black" fill="currentColor">
        <path d="M10 31h9l5-13h38l12 13h36v-5l-9-9H66l-9-7H30L10 17v14z" opacity="0.9" />
        <rect x="16" y="33" width="10" height="8" rx="2" fill="white" />
        <rect x="82" y="33" width="10" height="8" rx="2" fill="white" />
      </svg>
    </div>
  );
}
