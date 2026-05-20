"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useBillingGate } from "@/context/billing-gate-context";

const AUTH_PREFIX = "/auth";
const BILLING_ROUTE = "/settings/billing";

function isPublicAuthPath(pathname: string) {
  return pathname === AUTH_PREFIX || pathname.startsWith(`${AUTH_PREFIX}/`);
}

function isBillingPage(pathname: string) {
  return pathname === BILLING_ROUTE || pathname.startsWith(`${BILLING_ROUTE}/`);
}

/** Legacy `/billing` redirects via server; normalize client navigations. */
function isLegacyBillingPath(pathname: string) {
  return pathname === "/billing" || pathname.startsWith("/billing/");
}

export function BillingGuard() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { snapshot } = useBillingGate();

  useEffect(() => {
    if (isLegacyBillingPath(pathname)) {
      router.replace(BILLING_ROUTE);
      return;
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!currentUser.ready || !currentUser.id) return;
    if (currentUser.role === "super_admin") return;
    if (isPublicAuthPath(pathname)) return;

    if (snapshot.deactivated) {
      void (async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/auth?reason=workspace_closed");
      })();
      return;
    }

    /* Billing gate applies to workspace admins only — team members must not be redirected to billing. */
    if (currentUser.role !== "admin") return;

    /*
     * While subscription status is loading, keep admins off dashboard/tools so they never see a flash
     * of full CRM before we know billing state.
     */
    if (snapshot.loading) {
      if (!isBillingPage(pathname)) {
        router.replace(BILLING_ROUTE);
      }
      return;
    }

    if (snapshot.exempt) return;

    if (!snapshot.blocked) return;

    if (isBillingPage(pathname)) return;

    router.replace(BILLING_ROUTE);
  }, [
    currentUser.ready,
    currentUser.id,
    currentUser.role,
    pathname,
    router,
    snapshot.blocked,
    snapshot.deactivated,
    snapshot.exempt,
    snapshot.loading,
  ]);

  return null;
}
