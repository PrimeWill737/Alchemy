"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./app-shell.module.scss";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAdminDisplayCurrency } from "@/hooks/use-admin-display-currency";
import { AdminCurrencySelect } from "@/components/ui/admin-currency-select";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { BillingGuard } from "@/components/layout/billing-guard";
import { useBillingGate } from "@/context/billing-gate-context";
import { hasPermission, roleLabel } from "@/lib/rbac";

type AppShellProps = {
  children: React.ReactNode;
  heading: string;
  subheading?: string;
};

export function AppShell({ children, heading, subheading }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { snapshot: billingSnapshot } = useBillingGate();
  const { currency, setCurrency, isAdminLayer } = useAdminDisplayCurrency();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mustResetPassword, setMustResetPassword] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setMustResetPassword(document.cookie.split("; ").some((c) => c === "crm_must_reset=1"));
  }, [pathname]);

  /** Locked until we know subscription is OK: loading (unknown), or confirmed unpaid/blocked. */
  const billingLocked =
    currentUser.role !== "super_admin" &&
    !billingSnapshot.exempt &&
    (billingSnapshot.loading || billingSnapshot.blocked);

  const fullNavigationItems = [
    { href: "/dashboard", label: "Dashboard", visible: true },
    { href: "/leads", label: "Leads", visible: hasPermission(currentUser.role, "manage:leads") },
    { href: "/customers", label: "Customers", visible: hasPermission(currentUser.role, "view:customers") },
    { href: "/pipeline", label: "Pipeline", visible: hasPermission(currentUser.role, "manage:deals") },
    { href: "/tasks", label: "Tasks", visible: hasPermission(currentUser.role, "manage:tasks") },
    { href: "/messages", label: "Messages", visible: currentUser.role !== "viewer" },
    { href: "/reports", label: "Reports", visible: hasPermission(currentUser.role, "view:reports") },
    { href: "/team", label: "Team Hive", visible: hasPermission(currentUser.role, "manage:users") },
    { href: "/notifications", label: "Notifications", visible: true },
    {
      href: "/settings/billing",
      label: "Billing",
      visible: currentUser.role === "super_admin" || currentUser.role === "admin",
    },
    {
      href: "/settings",
      label: currentUser.role === "super_admin" ? "Control Center" : "Settings",
      visible: true,
    },
  ].filter((item) => item.visible);

  const lockedNavigationItems = [
    { href: "/settings/billing", label: "Billing", visible: true },
  ].filter((item) => item.visible);

  const navigationItems = billingLocked ? lockedNavigationItems : fullNavigationItems;

  const navItemActive = (href: string) => {
    if (href === "/settings/billing") {
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    if (href === "/settings") {
      if (pathname.startsWith("/settings/billing")) return false;
      return pathname === "/settings" || pathname.startsWith(`${href}/`);
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close drawer on client navigation
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  };

  const nav = (
    <nav className={styles.nav}>
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(styles.navItem, navItemActive(item.href) && styles.navItemActive)}
          onClick={() => setMobileNavOpen(false)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className={styles.shell}>
      <BillingGuard />
      <header className={styles.navbar}>
        <div className={styles.navBarLeft}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span className={styles.menuIcon} aria-hidden />
          </button>
          <div className={styles.brand}>Alchemy</div>
        </div>
        <div className={styles.headerActions}>
          {isAdminLayer && !billingLocked ? (
            <div className={styles.headerCurrencyWrap}>
              <span>Currency</span>
              <AdminCurrencySelect
                value={currency}
                ariaLabel="Workspace display currency"
                onChange={setCurrency}
              />
            </div>
          ) : null}
          {!billingLocked ? <NotificationBell /> : null}
          <ThemeToggle compact />
          <div className={styles.profile}>
            {currentUser.name} - {roleLabel(currentUser.role)}
          </div>
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      {mobileNavOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <div className={styles.body}>
        <aside className={clsx(styles.sidebar, mobileNavOpen && styles.sidebarOpen)}>{nav}</aside>
        <main className={styles.content}>
          <section className={styles.pageHeader}>
            <h1>{heading}</h1>
            {subheading ? <p>{subheading}</p> : null}
          </section>
          {mustResetPassword && pathname !== "/settings" ? (
            <p className={styles.resetBanner}>
              Set a permanent password in{" "}
              <Link href="/settings" onClick={() => setMobileNavOpen(false)}>
                Settings
              </Link>{" "}
              to finish securing your account.
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
