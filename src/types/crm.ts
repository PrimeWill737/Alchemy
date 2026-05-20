export type UserRole =
  | "super_admin"
  | "admin"
  | "marketer"
  | "sales_manager"
  | "sales_representative"
  | "support_agent"
  | "viewer";

/** Set by admin for every user; caps / explains access alongside system role. */
export type PermissionLevel = "read_only" | "limited" | "standard" | "elevated" | "full";

export type GovernanceEventKind =
  | "admin_promoted"
  | "admin_demoted"
  | "user_removed"
  | "user_added"
  | "hive_created";

/** Super Admin control center audit trail (client state; mirror to DB later). */
export type GovernanceEvent = {
  id: string;
  at: string;
  kind: GovernanceEventKind;
  summary: string;
  actorName?: string;
  targetName?: string;
};

export type LeadStatus = "new" | "qualified" | "proposal" | "won" | "lost";
export type DealStage = "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
export type TaskStatus = "todo" | "in_progress" | "done";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  /** Admin user id this person rolls up under (e.g. marketer → admin). */
  supervisingAdminId?: string;
  /** Company role dropdown value (e.g. marketer, finance, other). */
  companyRolePreset?: string;
  /** When preset is other — display name for the custom role. */
  customCompanyRole?: string;
  /** Permission tier assigned by admin (applies to every role). */
  permissionLevel?: PermissionLevel;
  /** Preferred display currency for monetary values (admins); ISO 4217. */
  displayCurrency?: string;
};

export type LeadSource = {
  id: string;
  name: string;
};

export type Lead = {
  id: string;
  name: string;
  source: string;
  status: LeadStatus;
  value: number;
  assignedTo: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: "active" | "inactive";
  assignedTo: string;
  createdAt: string;
  createdByUserId?: string;
  /** Admin who owns this record for roll-up (set from marketer’s supervising admin). */
  supervisingAdminId?: string;
};

export type Deal = {
  id: string;
  title: string;
  customerId: string;
  value: number;
  stage: DealStage;
  closeDate: string;
  assignedTo: string;
};

export type Task = {
  id: string;
  title: string;
  dueDate: string;
  assignee: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
};

/** When type is export — why the report was generated (for analytics / audit). */
export type ActivityExportPurpose = "sales_pipeline" | "lead_funnel";

export type Activity = {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "export";
  description: string;
  userId: string;
  customerId?: string;
  createdAt: string;
  /** Admin whose hierarchy this activity belongs to (for admin dashboard scope). */
  supervisingAdminId?: string;
  exportPurpose?: ActivityExportPurpose;
};

export type TeamMember = {
  id?: string;
  name: string;
  role: UserRole;
  companyRolePreset: string;
  customCompanyRole?: string;
  permissionLevel: PermissionLevel;
  isLeader: boolean;
};

export type HiveTeam = {
  id: string;
  department: string;
  expectedMembers: number;
  members: TeamMember[];
  createdByRole: UserRole;
  /** User id of the admin (or super admin) who created this hive. */
  createdByUserId: string;
  createdAt: string;
};

export type InboxMessageStatus = "open" | "responded" | "closed";

export type InboxMessage = {
  id: string;
  from: string;
  channel: string;
  content: string;
  createdAt: string;
  status: InboxMessageStatus;
};

export type AppNotificationIcon = "deal" | "task" | "lead" | "message" | "chat_request";

/** In-app notifications; read state is per user via readByUserIds. */
export type AppNotification = {
  id: string;
  recipientUserIds: string[];
  title: string;
  body?: string;
  icon: AppNotificationIcon;
  readByUserIds: string[];
  createdAt: string;
  actionRef?: string;
};

export type DmAttachment = {
  kind: "image" | "video";
  /** Cloudinary (HTTPS) URL */
  url?: string;
  /** Legacy session-only inline attachment */
  dataUrl?: string;
  name?: string;
  publicId?: string;
};

export type DirectChatMessage = {
  id: string;
  threadKey: string;
  senderUserId: string;
  text: string;
  attachment?: DmAttachment;
  createdAt: string;
};

export type DmContactRequest = {
  id: string;
  fromUserId: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
};
