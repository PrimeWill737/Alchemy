import type {
  Activity,
  AppNotification,
  Customer,
  Deal,
  GovernanceEvent,
  HiveTeam,
  InboxMessage,
  Lead,
  LeadSource,
  Task,
  User,
} from "@/types/crm";

export const mockUsers: User[] = [
  {
    id: "u1",
    name: "William Bosworth",
    email: "williambosworth420@gmail.com",
    role: "super_admin",
    createdAt: "2026-05-01",
    companyRolePreset: "super_admin",
    permissionLevel: "full",
    displayCurrency: "NGN",
  },
  {
    id: "u2",
    name: "Leo Hayes",
    email: "leo@crm.dev",
    role: "admin",
    createdAt: "2026-05-01",
    supervisingAdminId: "u1",
    companyRolePreset: "admin",
    permissionLevel: "full",
    displayCurrency: "NGN",
  },
  {
    id: "u3",
    name: "Noah Reid",
    email: "noah@crm.dev",
    role: "sales_manager",
    createdAt: "2026-05-02",
    supervisingAdminId: "u2",
    companyRolePreset: "sales_manager",
    permissionLevel: "standard",
  },
  {
    id: "u4",
    name: "Maya Chen",
    email: "marketing@crmsuite.com",
    role: "marketer",
    createdAt: "2026-05-02",
    supervisingAdminId: "u2",
    companyRolePreset: "marketer",
    permissionLevel: "standard",
  },
];

export const defaultLeadSources: LeadSource[] = [
  { id: "ls-website", name: "Website" },
  { id: "ls-referral", name: "Referral" },
  { id: "ls-linkedin", name: "LinkedIn" },
];

export const mockLeads: Lead[] = [
  { id: "l1", name: "Nova Logistics", source: "Website", status: "new", value: 12000, assignedTo: "u2", createdAt: "2026-05-03" },
  { id: "l2", name: "Peak Retail", source: "Referral", status: "qualified", value: 38000, assignedTo: "u2", createdAt: "2026-05-02" },
];

export const mockCustomers: Customer[] = [
  {
    id: "c1",
    name: "Jordan Mills",
    email: "jordan@northstar.com",
    phone: "+1-202-555-0112",
    company: "Northstar Inc",
    status: "active",
    assignedTo: "u2",
    createdAt: "2026-05-01",
    createdByUserId: "u4",
    supervisingAdminId: "u2",
  },
];

export const mockDeals: Deal[] = [
  {
    id: "d1",
    title: "Northstar Expansion",
    customerId: "c1",
    value: 74000,
    stage: "negotiation",
    closeDate: "2026-06-04",
    assignedTo: "u2",
  },
];

export const mockTasks: Task[] = [
  { id: "t1", title: "Follow up with Nova Logistics", dueDate: "2026-05-10", assignee: "u2", status: "in_progress", priority: "high" },
  { id: "t2", title: "Prepare monthly pipeline report", dueDate: "2026-05-12", assignee: "u1", status: "todo", priority: "medium" },
];

export const mockActivities: Activity[] = [
  {
    id: "a1",
    type: "call",
    description: "Discovery call completed with Northstar",
    userId: "u2",
    customerId: "c1",
    createdAt: "2026-05-06",
    supervisingAdminId: "u2",
  },
  {
    id: "a2",
    type: "email",
    description: "Sent proposal draft",
    userId: "u4",
    customerId: "c1",
    createdAt: "2026-05-07",
    supervisingAdminId: "u2",
  },
];

export const mockMessages: InboxMessage[] = [
  {
    id: "m1",
    from: "support@crm.dev",
    channel: "Email",
    content: "Customer requested invoice copy.",
    createdAt: "2026-05-08T08:30:00Z",
    status: "open",
  },
  {
    id: "m2",
    from: "+1-202-555-0148",
    channel: "SMS",
    content: "Need call back this afternoon.",
    createdAt: "2026-05-08T09:05:00Z",
    status: "open",
  },
  {
    id: "m3",
    from: "+234 803 555 0199",
    channel: "WhatsApp",
    content: "Can we reschedule the demo to Thursday?",
    createdAt: "2026-05-08T11:20:00Z",
    status: "open",
  },
];

const workspaceUserIds = mockUsers.map((u) => u.id);

export const mockAppNotifications: AppNotification[] = [
  {
    id: "appn-deal-1",
    recipientUserIds: workspaceUserIds,
    title: "Deal Northstar Expansion moved to negotiation",
    icon: "deal",
    readByUserIds: [],
    createdAt: "2026-05-08",
  },
  {
    id: "appn-task-1",
    recipientUserIds: workspaceUserIds,
    title: "Task due tomorrow: monthly pipeline report",
    icon: "task",
    readByUserIds: [],
    createdAt: "2026-05-07",
  },
  {
    id: "appn-lead-1",
    recipientUserIds: workspaceUserIds,
    title: "New lead created from website channel",
    icon: "lead",
    readByUserIds: [],
    createdAt: "2026-05-06",
  },
];

/** Demo hive so team chat can resolve teammates by id / name. */
export const mockTeams: HiveTeam[] = [
  {
    id: "hive-revenue-demo",
    department: "Revenue",
    expectedMembers: mockUsers.length,
    members: mockUsers.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      companyRolePreset: u.companyRolePreset ?? "admin",
      permissionLevel: u.permissionLevel ?? "standard",
      isLeader: u.role === "super_admin" || u.role === "admin",
    })),
    createdByRole: "super_admin",
    createdByUserId: "u1",
    createdAt: "2026-05-01",
  },
];

/** Initial Super Admin audit trail (demo). */
export const mockGovernanceLog: GovernanceEvent[] = [
  {
    id: "gov-seed-1",
    at: "2026-05-01T09:15:00.000Z",
    kind: "user_added",
    summary: "Leo Hayes onboarded as Admin (Layer 2) with full permission level.",
    actorName: "Amina Carter",
    targetName: "Leo Hayes",
  },
  {
    id: "gov-seed-2",
    at: "2026-05-02T11:30:00.000Z",
    kind: "user_added",
    summary: "Noah Reid added under sales operations; reports to Leo Hayes.",
    actorName: "Leo Hayes",
    targetName: "Noah Reid",
  },
  {
    id: "gov-seed-3",
    at: "2026-05-02T14:00:00.000Z",
    kind: "user_added",
    summary: "Maya Chen added as Marketer with standard permission level.",
    actorName: "Leo Hayes",
    targetName: "Maya Chen",
  },
];
