"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

export type BillingGateSnapshot = {
  loading: boolean;
  /** True when this workspace admin cannot use CRM features until billing is satisfied (DB mode, subscription applies). */
  blocked: boolean;
  /** User deactivated (e.g. grace period ended). BillingGuard handles logout. */
  deactivated: boolean;
  /** No enforcement (demo / no DB / legacy org without subscription row). */
  exempt: boolean;
};

const defaultSnapshot: BillingGateSnapshot = {
  loading: true,
  blocked: false,
  deactivated: false,
  exempt: false,
};

const BillingGateContext = createContext<{
  snapshot: BillingGateSnapshot;
  refresh: () => Promise<void>;
}>({
  snapshot: defaultSnapshot,
  refresh: async () => {},
});

export function BillingGateProvider({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  const [snapshot, setSnapshot] = useState<BillingGateSnapshot>(defaultSnapshot);
  /** After the first resolved /api/subscriptions/me for this signed-in user, avoid toggling `loading` on refresh (stops nav/header flicker when WorkspaceBilling calls refresh). */
  const subscriptionGateKnownRef = useRef(false);

  useEffect(() => {
    subscriptionGateKnownRef.current = false;
    setSnapshot(defaultSnapshot);
  }, [currentUser.id]);

  const runFetch = useCallback(async () => {
    if (!currentUser.ready) {
      setSnapshot({ loading: true, blocked: false, deactivated: false, exempt: false });
      return;
    }
    if (!currentUser.id) {
      setSnapshot({ loading: false, blocked: false, deactivated: false, exempt: true });
      return;
    }
    if (currentUser.role === "super_admin") {
      setSnapshot({ loading: false, blocked: false, deactivated: false, exempt: true });
      return;
    }

    /* Team members only need deactivation check — not billing lock. */
    if (currentUser.role !== "admin") {
      if (!subscriptionGateKnownRef.current) {
        setSnapshot((s) => ({ ...s, loading: true }));
      }
      try {
        const res = await fetchWithTimeout("/api/subscriptions/me", { credentials: "include" }, 12_000);
        const data = (await res.json().catch(() => ({}))) as {
          deactivated?: boolean;
        };
        subscriptionGateKnownRef.current = true;
        if (data.deactivated) {
          setSnapshot({ loading: false, blocked: false, deactivated: true, exempt: false });
          return;
        }
        setSnapshot({ loading: false, blocked: false, deactivated: false, exempt: true });
      } catch {
        subscriptionGateKnownRef.current = true;
        setSnapshot({ loading: false, blocked: false, deactivated: false, exempt: true });
      }
      return;
    }

    if (!subscriptionGateKnownRef.current) {
      setSnapshot((s) => ({ ...s, loading: true }));
    }
    try {
      const res = await fetchWithTimeout("/api/subscriptions/me", { credentials: "include" }, 12_000);
      const data = (await res.json().catch(() => ({}))) as {
        hasAccess?: boolean;
        deactivated?: boolean;
        mode?: string;
        legacyWorkspace?: boolean;
      };

      if (data.deactivated) {
        subscriptionGateKnownRef.current = true;
        setSnapshot({ loading: false, blocked: false, deactivated: true, exempt: false });
        return;
      }

      if (
        data.mode === "demo" ||
        data.mode === "degraded" ||
        data.legacyWorkspace ||
        data.mode === "super_admin"
      ) {
        subscriptionGateKnownRef.current = true;
        setSnapshot({ loading: false, blocked: false, deactivated: false, exempt: true });
        return;
      }

      const blocked = data.hasAccess === false;
      subscriptionGateKnownRef.current = true;
      setSnapshot({ loading: false, blocked, deactivated: false, exempt: false });
    } catch {
      subscriptionGateKnownRef.current = true;
      setSnapshot({ loading: false, blocked: false, deactivated: false, exempt: true });
    }
  }, [currentUser.ready, currentUser.id, currentUser.role]);

  useEffect(() => {
    void runFetch();
  }, [runFetch]);

  /* Never leave admins in perpetual loading (e.g. hung subscription API on deploy). */
  useEffect(() => {
    if (!currentUser.ready || currentUser.role !== "admin") return;
    const t = window.setTimeout(() => {
      setSnapshot((s) =>
        s.loading
          ? { loading: false, blocked: false, deactivated: false, exempt: true }
          : s,
      );
      subscriptionGateKnownRef.current = true;
    }, 14_000);
    return () => window.clearTimeout(t);
  }, [currentUser.ready, currentUser.id, currentUser.role]);

  const value = useMemo(
    () => ({
      snapshot,
      refresh: runFetch,
    }),
    [snapshot, runFetch],
  );

  return <BillingGateContext.Provider value={value}>{children}</BillingGateContext.Provider>;
}

export function useBillingGate() {
  return useContext(BillingGateContext);
}
