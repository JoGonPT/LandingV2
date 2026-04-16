import { redirect } from "next/navigation";

import { BookingDetailClient } from "@/components/drivers/BookingDetailClient";
import { driverPublicLoginPath } from "@/lib/drivers/server-path";
import { isDriverAuthenticated } from "@/lib/drivers/require-session";

export const dynamic = "force-dynamic";

export default async function DriverBookingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isDriverAuthenticated())) {
    redirect(await driverPublicLoginPath());
  }
  const { id } = await params;
  return <BookingDetailClient bookingId={id} />;
}
