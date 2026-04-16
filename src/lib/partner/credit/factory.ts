import path from "node:path";

import { FilePartnerCreditStore } from "@/lib/partner/credit/file-store";
import type { PartnerCreditStore } from "@/lib/partner/credit/types";
import { SupabasePartnerCreditStore } from "@/lib/partner/credit/supabase-store";

export function getPartnerDefaultCreditLimit(): number {
  const n = Number(process.env.PARTNER_DEFAULT_CREDIT_LIMIT_EUR ?? 10_000);
  return Number.isFinite(n) && n >= 0 ? n : 10_000;
}

export function getPartnerCreditStore(): PartnerCreditStore {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (supabaseUrl && serviceKey) {
    return new SupabasePartnerCreditStore(supabaseUrl.replace(/\/+$/, ""), serviceKey);
  }
  const dataDir = process.env.PARTNER_CREDIT_FILE?.trim() || path.join(process.cwd(), ".data", "partner-credits.json");
  return new FilePartnerCreditStore(dataDir);
}
