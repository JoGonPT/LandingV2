/** Rough drive-time hint when the CRM does not return duration (~50 km/h blended average). */
export function estimateDriveMinutesFromKm(km: number): number {
  return Math.max(1, Math.round((km / 50) * 60));
}
