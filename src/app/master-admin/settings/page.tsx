import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OperationalSettingsPanel } from "@/components/internal/OperationalSettingsPanel";
import {
  getMasterAdminSessionSecret,
  MASTER_ADMIN_SESSION_COOKIE,
  verifyMasterAdminSession,
} from "@/lib/internal-admin/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Way2Go | Controlo operacional",
  robots: { index: false, follow: false },
};

export default async function OperationalSettingsPage() {
  try {
    const secret = getMasterAdminSessionSecret();
    const jar = await cookies();
    const token = jar.get(MASTER_ADMIN_SESSION_COOKIE)?.value;
    if (!verifyMasterAdminSession(secret, token)) {
      redirect("/master-admin/login/?next=/master-admin/settings/");
    }
  } catch {
    redirect("/master-admin/login/?next=/master-admin/settings/");
  }

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-10 md:px-8">
      <OperationalSettingsPanel />
    </main>
  );
}
