import { redirect } from "next/navigation";

import { DriverLoginForm } from "@/components/drivers/DriverLoginForm";
import { driverPublicHomePath } from "@/lib/drivers/server-path";
import { isDriverAuthenticated } from "@/lib/drivers/require-session";

export const dynamic = "force-dynamic";

export default async function DriverLoginPage() {
  if (await isDriverAuthenticated()) {
    redirect(await driverPublicHomePath());
  }
  return <DriverLoginForm />;
}
