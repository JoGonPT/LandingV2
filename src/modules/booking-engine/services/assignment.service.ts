import { SupabaseService, type DriverBookingAssignmentInsertPayload } from "@/modules/booking-engine/services/supabase.service";

export interface AssignDriverInput {
  bookingId: string;
  vehicleClass: string;
  pickupLat?: number;
  pickupLng?: number;
}

export interface AssignDriverResult {
  assigned: boolean;
  driverId?: string;
  vehicleId?: string;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function scoreDistanceKm(
  driverLat: number | null,
  driverLng: number | null,
  pickupLat?: number,
  pickupLng?: number,
): number {
  if (
    driverLat === null ||
    driverLng === null ||
    pickupLat === undefined ||
    pickupLng === undefined ||
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  // Basic equirectangular approximation for short distances.
  const r = 6371;
  const lat1 = (driverLat * Math.PI) / 180;
  const lat2 = (pickupLat * Math.PI) / 180;
  const x = ((pickupLng - driverLng) * Math.PI) / 180 * Math.cos((lat1 + lat2) / 2);
  const y = lat2 - lat1;
  return Math.sqrt(x * x + y * y) * r;
}

export class AssignmentService {
  constructor(private readonly supabase: SupabaseService) {}

  async assignDriver(input: AssignDriverInput): Promise<AssignDriverResult> {
    const vehicleClass = input.vehicleClass.trim().toUpperCase();
    const candidates = await this.supabase.listActiveDriverCandidatesByVehicleClass(vehicleClass);
    if (!candidates.length) return { assigned: false };

    const sorted = [...candidates].sort((a, b) => {
      const aScore = scoreDistanceKm(toNumber(a.current_lat), toNumber(a.current_lng), input.pickupLat, input.pickupLng);
      const bScore = scoreDistanceKm(toNumber(b.current_lat), toNumber(b.current_lng), input.pickupLat, input.pickupLng);
      if (aScore === bScore) return a.driver_id.localeCompare(b.driver_id);
      return aScore - bScore;
    });

    const chosen = sorted[0];
    const assignment: DriverBookingAssignmentInsertPayload = {
      id: `dba_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      booking_id: input.bookingId,
      driver_id: chosen.driver_id,
      vehicle_id: chosen.vehicle_id,
      status: "ASSIGNED",
      assigned_at: new Date().toISOString(),
    };
    await this.supabase.insertDriverBookingAssignment(assignment);

    return {
      assigned: true,
      driverId: chosen.driver_id,
      vehicleId: chosen.vehicle_id,
    };
  }
}
