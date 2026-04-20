import { redirect } from "next/navigation";

/** Canonical entry: `/partner/book/` (picker or single-partner redirect). */
export default function PartnerRootPage() {
  redirect("/partner/book/");
}
