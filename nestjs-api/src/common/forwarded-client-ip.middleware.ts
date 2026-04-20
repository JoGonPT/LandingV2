import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { pickClientIpForwardHeadersFromNodeHeaders } from "@/lib/http/client-ip-forward-headers";
import { runWithOutboundClientIpHeaders } from "@/lib/http/outbound-forwarded-headers";

/**
 * Captures `X-Forwarded-For` / `X-Real-IP` (and Cloudflare `CF-Connecting-IP` as fallback for real IP)
 * on the inbound HTTP request so `transferCrmFetch` can attach them to outbound TransferCRM calls.
 */
@Injectable()
export class ForwardedClientIpMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headers = pickClientIpForwardHeadersFromNodeHeaders(req.headers);
    runWithOutboundClientIpHeaders(headers, () => next());
  }
}
