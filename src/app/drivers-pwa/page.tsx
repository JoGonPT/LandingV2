import { redirect } from "next/navigation";

import { ScheduleClient } from "@/components/drivers/ScheduleClient";
import { driverPublicLoginPath } from "@/lib/drivers/server-path";
import { isDriverAuthenticated } from "@/lib/drivers/require-session";

export const dynamic = "force-dynamic";

export default async function DriversHomePage() {
  if (!(await isDriverAuthenticated())) {
    redirect(await driverPublicLoginPath());
  }
  return <ScheduleClient />;
}
