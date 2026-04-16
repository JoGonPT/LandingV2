/** Maps TransferCRM `vehicle_type` strings to a coarse brand lane for UI (not sent to API). */
export type VehicleBrandLane = "business" | "first" | "van";

export function inferVehicleBrandLane(raw: string): VehicleBrandLane {
  const t = raw.toLowerCase();
  if (/(van|v-class|vito|sprinter|minivan|shuttle|mpv|9[- ]?seater|transporter)/i.test(t)) {
    return "van";
  }
  if (/(s-class|maybach|first|premier|luxury|pullman)/i.test(t)) {
    return "first";
  }
  if (/(business|executive|e-class|sedan|standard|comfort|economy|saloon)/i.test(t)) {
    return "business";
  }
  // Default: treat unknown slugs as business sedan tier
  return "business";
}
