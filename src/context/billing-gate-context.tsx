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

    if (!subscriptionGateKnownRef.current) {
      setSnapshot((s) => ({ ...s, loading: true }));
    }
    try {
      const res = await fetch("/api/subscriptions/me", { credentials: "include" });
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

      if (data.mode === "demo" || data.legacyWorkspace) {
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
