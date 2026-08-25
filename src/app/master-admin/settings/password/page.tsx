import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AdminPasswordRotation } from "@/components/internal/AdminPasswordRotation";
import {
  getMasterAdminSessionSecret,
  MASTER_ADMIN_SESSION_COOKIE,
  verifyMasterAdminSession,
} from "@/lib/internal-admin/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Way2Go | Password de administração",
  robots: { index: false, follow: false },
};

export default async function AdminPasswordPage() {
  try {
    const secret = getMasterAdminSessionSecret();
    const jar = await cookies();
    const token = jar.get(MASTER_ADMIN_SESSION_COOKIE)?.value;
    if (!verifyMasterAdminSession(secret, token)) {
      redirect("/master-admin/login/?next=/master-admin/settings/password/");
    }
  } catch {
    redirect("/master-admin/login/?next=/master-admin/settings/password/");
  }

  return (
    <main className="mx-auto max-w-[720px] px-4 py-10 md:px-8">
      <AdminPasswordRotation />
    </main>
  );
}
