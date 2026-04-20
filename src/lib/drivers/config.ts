import type { SupabaseClient } from "@supabase/supabase-js";

import { isDriverSupabaseAuthConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * TransferCRM driver id for this PWA instance (assigned bookings only).
 * When unset, driver list/detail APIs return 503 to avoid exposing all tenant bookings.
 */
export function getDriverTransferCrmId(): string | null {
  const raw = process.env.DRIVER_TRANSFERCRM_ID?.trim();
  return raw && raw.length > 0 ? raw : null;
}

/**
 * Resolve CRM chauffeur id from `profiles.transfercrm_driver_id` or `DRIVER_TRANSFERCRM_ID` fallback.
 * Shared by Next.js routes and NestJS (any Supabase client with the user's JWT / session).
 */
export async function resolveTransferCrmDriverIdForSupabaseUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("transfercrm_driver_id")
    .eq("id", userId)
    .maybeSingle();
  const fromProfile =
    profile && typeof profile.transfercrm_driver_id === "string"
      ? profile.transfercrm_driver_id.trim()
      : "";
  if (fromProfile.length > 0) return fromProfile;
  return getDriverTransferCrmId();
}

/**
 * Per-request TransferCRM chauffeur id: `profiles.transfercrm_driver_id` for the signed-in Supabase user,
 * else `DRIVER_TRANSFERCRM_ID` env (rollout fallback). Requires Supabase env to be configured.
 */
export async function getDriverTransferCrmIdForRequest(): Promise<string | null> {
  if (!isDriverSupabaseAuthConfigured()) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return resolveTransferCrmDriverIdForSupabaseUser(supabase, user.id);
}

/**
 * If set, bookings whose `external_reference` contains this substring count as assigned to this driver
 * (partner-centric B2B orders). Example: unique token per chauffeur from your ops workflow.
 */
export function getDriverBookingExternalRefToken(): string | null {
  const raw = process.env.DRIVER_BOOKING_REF_TOKEN?.trim();
  return raw && raw.length > 0 ? raw : null;
}
