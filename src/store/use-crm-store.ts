"use client";

import { create } from "zustand";
import {
  defaultLeadSources,
  mockActivities,
  mockAppNotifications,
  mockCustomers,
  mockDeals,
  mockGovernanceLog,
  mockLeads,
  mockMessages,
  mockTasks,
  mockTeams,
  mockUsers,
} from "@/lib/mock-db";
import { dmPairKey } from "@/lib/dm-utils";
import type {
  Activity,
  AppNotification,
  Customer,
  Deal,
  DirectChatMessage,
  DmContactRequest,
  GovernanceEvent,
  HiveTeam,
  InboxMessage,
  InboxMessageStatus,
  Lead,
  LeadSource,
  Task,
  User,
  UserRole,
} from "@/types/crm";

type CrmState = {
  dataReady: boolean;
  leadSources: LeadSource[];
  messages: InboxMessage[];
  leads: Lead[];
  customers: Customer[];
  deals: Deal[];
  tasks: Task[];
  users: User[];
  teams: HiveTeam[];
  activities: Activity[];
  governanceLog: GovernanceEvent[];
  appNotifications: AppNotification[];
  dmMessages: DirectChatMessage[];
  dmContactRequests: DmContactRequest[];
  dmAllowedPairKeys: string[];
  setDataReady: (ready: boolean) => void;
  setLeads: (leads: Lead[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setDeals: (deals: Deal[]) => void;
  setTasks: (tasks: Task[]) => void;
  setMessages: (messages: InboxMessage[]) => void;
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  addAppNotification: (partial: Omit<AppNotification, "id" | "readByUserIds"> & { id?: string; readByUserIds?: string[] }) => void;
  markNotificationRead: (notificationId: string, userId: string) => void;
  markAllNotificationsReadForUser: (userId: string) => void;
  addDmMessage: (message: Omit<DirectChatMessage, "id">) => void;
  createDmContactRequest: (input: {
    fromUserId: string;
    fromName: string;
    fromEmail: string;
    toEmail: string;
  }) => { ok: boolean; error?: string; requestId?: string };
  acceptDmContactRequest: (requestId: string, acceptingUserId: string) => void;
  rejectDmContactRequest: (requestId: string, rejectingUserId: string) => void;
  setLeadSources: (sources: LeadSource[]) => void;
  addLeadSource: (source: LeadSource) => void;
  updateLeadSource: (id: string, name: string) => void;
  removeLeadSource: (id: string) => void;
  setMessageStatus: (id: string, status: InboxMessageStatus) => void;
  removeMessage: (id: string) => void;
  addLead: (lead: Lead) => void;
  updateLeadStatus: (leadId: string, status: Lead["status"]) => void;
  removeLead: (leadId: string) => void;
  addCustomer: (customer: Customer) => void;
  removeCustomer: (customerId: string) => void;
  addTask: (task: Task) => void;
  addUser: (user: User) => void;
  setUsers: (users: User[]) => void;
  removeUser: (userId: string) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserDisplayCurrency: (userId: string, displayCurrency: string) => void;
  addTeam: (team: HiveTeam) => void;
  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
  recordGovernanceEvent: (entry: Omit<GovernanceEvent, "id" | "at"> & { at?: string }) => void;
};

export const useCrmStore = create<CrmState>((set) => ({
  dataReady: false,
  leadSources: defaultLeadSources,
  messages: mockMessages,
  leads: mockLeads,
  customers: mockCustomers,
  deals: mockDeals,
  tasks: mockTasks,
  users: mockUsers,
  teams: mockTeams,
  activities: mockActivities,
  governanceLog: mockGovernanceLog,
  appNotifications: mockAppNotifications,
  dmMessages: [],
  dmContactRequests: [],
  dmAllowedPairKeys: [],
  setDataReady: (dataReady) => set({ dataReady }),
  setLeads: (leads) => set({ leads }),
  setCustomers: (customers) => set({ customers }),
  setDeals: (deals) => set({ deals }),
  setTasks: (tasks) => set({ tasks }),
  setMessages: (messages) => set({ messages }),
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities],
    })),
  addAppNotification: (partial) =>
    set((state) => ({
      appNotifications: [
        {
          id: partial.id ?? `appn-${crypto.randomUUID()}`,
          recipientUserIds: partial.recipientUserIds,
          title: partial.title,
          body: partial.body,
          icon: partial.icon,
          readByUserIds: partial.readByUserIds ?? [],
          createdAt: partial.createdAt,
          actionRef: partial.actionRef,
        },
        ...state.appNotifications,
      ],
    })),
  markNotificationRead: (notificationId, userId) =>
    set((state) => ({
      appNotifications: state.appNotifications.map((n) => {
        if (n.id !== notificationId || !n.recipientUserIds.includes(userId)) return n;
        if (n.readByUserIds.includes(userId)) return n;
        return { ...n, readByUserIds: [...n.readByUserIds, userId] };
      }),
    })),
  markAllNotificationsReadForUser: (userId) =>
    set((state) => ({
      appNotifications: state.appNotifications.map((n) => {
        if (!n.recipientUserIds.includes(userId) || n.readByUserIds.includes(userId)) return n;
        return { ...n, readByUserIds: [...n.readByUserIds, userId] };
      }),
    })),
  addDmMessage: (message) =>
    set((state) => ({
      dmMessages: [
        ...state.dmMessages,
        { ...message, id: `dm-${crypto.randomUUID()}` },
      ],
    })),
  createDmContactRequest: (input) => {
    let result: { ok: boolean; error?: string; requestId?: string } = { ok: false };
    set((state) => {
      const normalized = input.toEmail.trim().toLowerCase();
      if (!normalized) {
        result = { ok: false, error: "Enter an email address." };
        return state;
      }
      const target = state.users.find((u) => u.email.toLowerCase() === normalized);
      if (!target) {
        result = {
          ok: false,
          error: "No workspace user with that email. They need an account first.",
        };
        return state;
      }
      if (target.id === input.fromUserId) {
        result = { ok: false, error: "You cannot send a request to yourself." };
        return state;
      }
      const dup = state.dmContactRequests.some(
        (r) =>
          r.status === "pending" && r.fromUserId === input.fromUserId && r.toUserId === target.id,
      );
      if (dup) {
        result = { ok: false, error: "A pending request already exists for this person." };
        return state;
      }
      const reqId = `dcr-${crypto.randomUUID()}`;
      const req: DmContactRequest = {
        id: reqId,
        fromUserId: input.fromUserId,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        toEmail: target.email,
        toUserId: target.id,
        status: "pending",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const notif: AppNotification = {
        id: `appn-${crypto.randomUUID()}`,
        recipientUserIds: [target.id],
        title: `${input.fromName} wants to message you`,
        body: `${input.fromEmail} sent a direct-message request. Accept to chat, or reject to dismiss.`,
        icon: "chat_request",
        readByUserIds: [],
        createdAt: new Date().toISOString().slice(0, 10),
        actionRef: reqId,
      };
      result = { ok: true, requestId: reqId };
      return {
        dmContactRequests: [req, ...state.dmContactRequests],
        appNotifications: [notif, ...state.appNotifications],
      };
    });
    return result;
  },
  acceptDmContactRequest: (requestId, acceptingUserId) =>
    set((state) => {
      const req = state.dmContactRequests.find(
        (r) => r.id === requestId && r.toUserId === acceptingUserId && r.status === "pending",
      );
      if (!req) return state;
      const key = dmPairKey(req.fromUserId, req.toUserId);
      const allowed = state.dmAllowedPairKeys.includes(key)
        ? state.dmAllowedPairKeys
        : [...state.dmAllowedPairKeys, key];
      const acceptor = state.users.find((u) => u.id === acceptingUserId);
      const notif: AppNotification = {
        id: `appn-${crypto.randomUUID()}`,
        recipientUserIds: [req.fromUserId],
        title: `${acceptor?.name ?? "Teammate"} accepted your chat request`,
        body: "You can now send direct messages in Messaging → Live chat.",
        icon: "message",
        readByUserIds: [],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      return {
        dmContactRequests: state.dmContactRequests.map((r) =>
          r.id === requestId ? { ...r, status: "accepted" as const } : r,
        ),
        dmAllowedPairKeys: allowed,
        appNotifications: [notif, ...state.appNotifications],
      };
    }),
  rejectDmContactRequest: (requestId, rejectingUserId) =>
    set((state) => {
      const req = state.dmContactRequests.find(
        (r) => r.id === requestId && r.toUserId === rejectingUserId && r.status === "pending",
      );
      if (!req) return state;
      const rejector = state.users.find((u) => u.id === rejectingUserId);
      const notif: AppNotification = {
        id: `appn-${crypto.randomUUID()}`,
        recipientUserIds: [req.fromUserId],
        title: `${rejector?.name ?? "User"} declined your chat request`,
        body: "You can try again later or reach them through another channel.",
        icon: "message",
        readByUserIds: [],
        createdAt: new Date().toISOString().slice(0, 10),
      };
      return {
        dmContactRequests: state.dmContactRequests.filter((r) => r.id !== requestId),
        appNotifications: [notif, ...state.appNotifications],
      };
    }),
  setLeadSources: (leadSources) => set({ leadSources }),
  addLeadSource: (source) =>
    set((state) => ({
      leadSources: [...state.leadSources, source],
    })),
  updateLeadSource: (id, name) =>
    set((state) => {
      const trimmed = name.trim();
      const prev = state.leadSources.find((s) => s.id === id);
      if (!prev || prev.name === trimmed) {
        return {
          leadSources: state.leadSources.map((s) => (s.id === id ? { ...s, name: trimmed } : s)),
        };
      }
      return {
        leadSources: state.leadSources.map((s) => (s.id === id ? { ...s, name: trimmed } : s)),
        leads: state.leads.map((lead) =>
          lead.source === prev.name ? { ...lead, source: trimmed } : lead,
        ),
      };
    }),
  removeLeadSource: (id) =>
    set((state) => ({
      leadSources: state.leadSources.filter((s) => s.id !== id),
    })),
  setMessageStatus: (id, status) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, status } : m)),
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
  addLead: (lead) => set((state) => ({ leads: [lead, ...state.leads] })),
  updateLeadStatus: (leadId, status) =>
    set((state) => ({
      leads: state.leads.map((lead) => (lead.id === leadId ? { ...lead, status } : lead)),
    })),
  removeLead: (leadId) =>
    set((state) => ({
      leads: state.leads.filter((lead) => lead.id !== leadId),
    })),
  addCustomer: (customer) => set((state) => ({ customers: [customer, ...state.customers] })),
  removeCustomer: (customerId) =>
    set((state) => ({
      customers: state.customers.filter((customer) => customer.id !== customerId),
    })),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  addUser: (user) => set((state) => ({ users: [user, ...state.users] })),
  setUsers: (users) => set({ users }),
  removeUser: (userId) =>
    set((state) => ({ users: state.users.filter((user) => user.id !== userId) })),
  updateUserRole: (userId, role) =>
    set((state) => ({
      users: state.users.map((user) => (user.id === userId ? { ...user, role } : user)),
    })),
  updateUserDisplayCurrency: (userId, displayCurrency) =>
    set((state) => {
      const user = state.users.find((u) => u.id === userId);
      if (!user || user.displayCurrency === displayCurrency) return state;
      return {
        users: state.users.map((u) =>
          u.id === userId ? { ...u, displayCurrency } : u,
        ),
      };
    }),
  addTeam: (team) => set((state) => ({ teams: [team, ...state.teams] })),
  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    })),
  recordGovernanceEvent: (entry) =>
    set((state) => ({
      governanceLog: [
        {
          id: `gov-${crypto.randomUUID()}`,
          at: entry.at ?? new Date().toISOString(),
          kind: entry.kind,
          summary: entry.summary,
          actorName: entry.actorName,
          targetName: entry.targetName,
        },
        ...state.governanceLog,
      ],
    })),
}));
