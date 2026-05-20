import { redirect } from "next/navigation";

/** @deprecated Use `/settings/billing`. */
export default function BillingRedirectPage() {
  redirect("/settings/billing");
}
