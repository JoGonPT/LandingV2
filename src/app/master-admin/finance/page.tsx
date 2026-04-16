import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MasterFinanceDashboard } from "@/components/internal/MasterFinanceDashboard";

export const dynamic = "force-dynamic";
import {
  getMasterAdminSessionSecret,
  MASTER_ADMIN_SESSION_COOKIE,
  verifyMasterAdminSession,
} from "@/lib/internal-admin/session";

export default async function MasterFinancePage() {
  try {
    const secret = getMasterAdminSessionSecret();
    const jar = await cookies();
    const token = jar.get(MASTER_ADMIN_SESSION_COOKIE)?.value;
    if (!verifyMasterAdminSession(secret, token)) {
      redirect("/master-admin/login/");
    }
  } catch {
    redirect("/master-admin/login/");
  }

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <MasterFinanceDashboard />
    </main>
  );
}
