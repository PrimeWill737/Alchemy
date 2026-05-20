"use client";

import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCrmStore } from "@/store/use-crm-store";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import type {
  Activity,
  Customer,
  Deal,
  InboxMessage,
  Lead,
  LeadSource,
  Task,
  User,
} from "@/types/crm";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(url, { credentials: "include" }, 12_000);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Loads workspace CRM entities from APIs into Zustand after sign-in. */
export function useCrmDataSync() {
  const { ready, id: userId } = useCurrentUser();
  const setUsers = useCrmStore((s) => s.setUsers);
  const setLeads = useCrmStore((s) => s.setLeads);
  const setCustomers = useCrmStore((s) => s.setCustomers);
  const setDeals = useCrmStore((s) => s.setDeals);
  const setTasks = useCrmStore((s) => s.setTasks);
  const setMessages = useCrmStore((s) => s.setMessages);
  const setActivities = useCrmStore((s) => s.setActivities);
  const setLeadSources = useCrmStore((s) => s.setLeadSources);
  const setDataReady = useCrmStore((s) => s.setDataReady);
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !userId) {
      setDataReady(false);
      ranForUser.current = null;
      return;
    }
    if (ranForUser.current === userId) return;
    ranForUser.current = userId;
    let cancelled = false;

    (async () => {
      setDataReady(false);
      try {
        const [
          usersRes,
          leadsRes,
          customersRes,
          dealsRes,
          tasksRes,
          messagesRes,
          activitiesRes,
          sourcesRes,
        ] = await Promise.all([
          fetchJson<{ users?: User[] }>("/api/users"),
          fetchJson<{ leads?: Lead[] }>("/api/leads"),
          fetchJson<{ customers?: Customer[] }>("/api/customers"),
          fetchJson<{ deals?: Deal[] }>("/api/deals"),
          fetchJson<{ tasks?: Task[] }>("/api/tasks"),
          fetchJson<{ messages?: InboxMessage[] }>("/api/messages"),
          fetchJson<{ activities?: Activity[] }>("/api/activities"),
          fetchJson<{ sources?: LeadSource[]; source?: string }>("/api/lead-sources"),
        ]);

        if (cancelled) return;

        if (usersRes?.users) setUsers(usersRes.users);
        if (leadsRes?.leads) setLeads(leadsRes.leads);
        if (customersRes?.customers) setCustomers(customersRes.customers);
        if (dealsRes?.deals) setDeals(dealsRes.deals);
        if (tasksRes?.tasks) setTasks(tasksRes.tasks);
        if (messagesRes?.messages) setMessages(messagesRes.messages);
        if (activitiesRes?.activities) setActivities(activitiesRes.activities);
        if (sourcesRes?.sources?.length) setLeadSources(sourcesRes.sources);
      } finally {
        if (!cancelled) setDataReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    userId,
    setUsers,
    setLeads,
    setCustomers,
    setDeals,
    setTasks,
    setMessages,
    setActivities,
    setLeadSources,
    setDataReady,
  ]);
}
