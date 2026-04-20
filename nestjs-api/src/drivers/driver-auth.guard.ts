import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { User } from "@supabase/supabase-js";
import type { Request } from "express";

import { resolveTransferCrmDriverIdForSupabaseUser } from "@/lib/drivers/config";
import { createSupabaseDriverClientFromNodeRequest } from "@/lib/supabase/create-driver-client-from-request";

export type DriverPortalContext = {
  userId: string;
  user: User;
  /** From `profiles.transfercrm_driver_id` or `DRIVER_TRANSFERCRM_ID` fallback. */
  transfercrmDriverId: string | null;
};

@Injectable()
export class DriverAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    let supabase;
    try {
      supabase = createSupabaseDriverClientFromNodeRequest(req);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("NEXT_PUBLIC_SUPABASE")) {
        throw new HttpException(
          {
            error:
              "Driver portal requires Supabase: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on the API.",
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new HttpException({ error: "Unauthorized" }, HttpStatus.UNAUTHORIZED);
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      throw new HttpException({ error: "Unauthorized" }, HttpStatus.UNAUTHORIZED);
    }

    const transfercrmDriverId = await resolveTransferCrmDriverIdForSupabaseUser(supabase, user.id);
    (req as Request & { driverPortal?: DriverPortalContext }).driverPortal = {
      userId: user.id,
      user,
      transfercrmDriverId,
    };
    return true;
  }
}

export function getDriverPortal(req: Request): DriverPortalContext {
  const ctx = (req as Request & { driverPortal?: DriverPortalContext }).driverPortal;
  if (!ctx) {
    throw new HttpException({ error: "Unauthorized" }, HttpStatus.UNAUTHORIZED);
  }
  return ctx;
}
