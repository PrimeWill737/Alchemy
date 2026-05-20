"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_DISPLAY_CURRENCY,
  isDisplayCurrencyCode,
} from "@/lib/display-currencies";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCrmStore } from "@/store/use-crm-store";

/** Live display currency for admins; others see USD. Syncs with Postgres when configured. */
export function useAdminDisplayCurrency() {
  const { role, id } = useCurrentUser();
  const updateUserDisplayCurrency = useCrmStore((s) => s.updateUserDisplayCurrency);
  const isAdminLayer = role === "admin" || role === "super_admin";
  const [currency, setCurrencyState] = useState(DEFAULT_DISPLAY_CURRENCY);
  const writeVersionRef = useRef(0);

  useEffect(() => {
    if (!isAdminLayer) return;
    let cancelled = false;
    const readVersion = writeVersionRef.current;
    fetch("/api/users/me/display-currency", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { displayCurrency?: string } | null) => {
        if (
          cancelled ||
          writeVersionRef.current !== readVersion ||
          !data?.displayCurrency ||
          !isDisplayCurrencyCode(data.displayCurrency)
        ) {
          return;
        }
        const next = data.displayCurrency;
        setCurrencyState((prev) => (prev === next ? prev : next));
        if (id) updateUserDisplayCurrency(id, next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdminLayer, id, updateUserDisplayCurrency]);

  const setCurrency = useCallback(
    async (next: string) => {
      if (!isAdminLayer || !isDisplayCurrencyCode(next)) return;
      writeVersionRef.current += 1;
      setCurrencyState(next);
      if (id) updateUserDisplayCurrency(id, next);
      try {
        const res = await fetch("/api/users/me/display-currency", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ displayCurrency: next }),
        });
        const data = (await res.json().catch(() => null)) as { displayCurrency?: string } | null;
        if (isDisplayCurrencyCode(data?.displayCurrency)) {
          setCurrencyState(data.displayCurrency);
          if (id) updateUserDisplayCurrency(id, data.displayCurrency);
        }
      } catch {
        /* network */
      }
    },
    [isAdminLayer, id, updateUserDisplayCurrency],
  );

  return {
    currency: isAdminLayer ? currency : DEFAULT_DISPLAY_CURRENCY,
    setCurrency,
    isAdminLayer,
  };
}
