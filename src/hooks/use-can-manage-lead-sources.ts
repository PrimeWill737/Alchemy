"use client";

import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canManageLeadSources } from "@/lib/rbac";
import { useCrmStore } from "@/store/use-crm-store";

export function useCanManageLeadSources(): boolean {
  const { id, role, ready } = useCurrentUser();
  const users = useCrmStore((s) => s.users);
  return useMemo(() => {
    if (!ready) return false;
    const permissionLevel = users.find((u) => u.id === id)?.permissionLevel;
    return canManageLeadSources(role, permissionLevel);
  }, [id, role, ready, users]);
}
