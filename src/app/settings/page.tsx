"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import styles from "@/app/module-pages.module.scss";
import ccStyles from "./control-center.module.scss";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCrmStore } from "@/store/use-crm-store";
import type { GovernanceEventKind, User } from "@/types/crm";
import { adminLayerLabel, isAdminLayer } from "@/lib/admin-layers";
import { companyRoleLabel } from "@/lib/company-roles";
import { AdminCurrencySelect } from "@/components/ui/admin-currency-select";
import { DEFAULT_DISPLAY_CURRENCY } from "@/lib/display-currencies";
import { SignupPlansPanel } from "@/components/settings/signup-plans-panel";
import { SubscriptionsPanel } from "@/components/settings/subscriptions-panel";
import { RemoveUserDialog } from "@/components/settings/remove-user-dialog";
import { PasswordSettingsPanel } from "@/components/settings/password-settings-panel";
import { canDeactivateUser } from "@/lib/user-deactivation";
import { roleLabel } from "@/lib/rbac";

function eventKindLabel(kind: GovernanceEventKind): string {
  switch (kind) {
    case "admin_promoted":
      return "Promotion";
    case "admin_demoted":
      return "Demotion";
    case "user_removed":
      return "Removal";
    case "user_added":
      return "Onboarding";
    case "hive_created":
      return "Hive";
    default:
      return "Event";
  }
}

function eventBadgeTone(kind: GovernanceEventKind): "success" | "warning" | "default" {
  if (kind === "admin_promoted" || kind === "user_added" || kind === "hive_created") return "success";
  if (kind === "admin_demoted" || kind === "user_removed") return "warning";
  return "default";
}

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const isSuperAdmin = currentUser.role === "super_admin";
  const isAdminOnly = currentUser.role === "admin";

  const users = useCrmStore((state) => state.users);
  const teams = useCrmStore((state) => state.teams);
  const governanceLog = useCrmStore((state) => state.governanceLog);
  const updateUserDisplayCurrency = useCrmStore((state) => state.updateUserDisplayCurrency);
  const removeUser = useCrmStore((state) => state.removeUser);
  const recordGovernanceEvent = useCrmStore((state) => state.recordGovernanceEvent);

  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

  const adminRoster = useMemo(
    () => users.filter((u) => u.role === "super_admin" || u.role === "admin"),
    [users],
  );

  const managedUsers = useMemo(
    () =>
      users.filter((u) => u.supervisingAdminId === currentUser.id && u.id !== currentUser.id),
    [users, currentUser.id],
  );

  const sortedLog = useMemo(
    () => [...governanceLog].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [governanceLog],
  );

  const handleAdminCurrencyChange = async (userId: string, currency: string) => {
    updateUserDisplayCurrency(userId, currency);
    try {
      await fetch(`/api/users/${userId}/display-currency`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayCurrency: currency }),
      });
    } catch {
      /* no-op */
    }
  };

  const performRemove = async (reason: string) => {
    if (!removeTarget) return;
    const res = await fetch(`/api/users/${removeTarget.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Could not remove user.");
    }
    recordGovernanceEvent({
      kind: "user_removed",
      summary: `${currentUser.name} removed ${removeTarget.name} from the workspace.`,
      actorName: currentUser.name,
      targetName: removeTarget.name,
    });
    removeUser(removeTarget.id);
    setRemoveTarget(null);
  };

  if (!isSuperAdmin && !isAdminOnly) {
    return (
      <AppShell heading="Settings" subheading="Your account and workspace preferences">
        <PasswordSettingsPanel />
      </AppShell>
    );
  }

  if (isAdminOnly) {
    return (
      <AppShell heading="Settings" subheading="Manage people you onboarded.">
        <PasswordSettingsPanel />
        <RemoveUserDialog
          open={removeTarget !== null}
          userName={removeTarget?.name ?? ""}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={performRemove}
        />
        <Card>
          <h2>Billing &amp; subscription</h2>
          <p className={styles.metaLine}>
            Bank transfer, payment references, renewal, and cancellation live on the billing page (also in the sidebar as{" "}
            <strong>Billing</strong>).
          </p>
          <p className={styles.metaLine}>
            <Link href="/settings/billing">Open workspace billing</Link>
          </p>
        </Card>
        <Card>
          <h2>People you manage</h2>
          <p className={styles.metaLine}>
            These users were assigned with you as their supervising admin. Removing them sends a notification email with
            the reason you provide.
          </p>
          {managedUsers.length === 0 ? (
            <p className={styles.metaLine}>No direct reports yet. Add team members from Team Hive.</p>
          ) : (
            <div className={ccStyles.rosterScroll}>
              <table className={ccStyles.rosterTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>CRM role</th>
                    <th>Company role</th>
                    <th className={ccStyles.actionsCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedUsers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td className={ccStyles.rosterEmail}>{member.email}</td>
                      <td>{roleLabel(member.role)}</td>
                      <td>{companyRoleLabel(member.companyRolePreset, member.customCompanyRole)}</td>
                      <td className={ccStyles.actionsCell}>
                        {canDeactivateUser(currentUser.role, currentUser.id, member) ? (
                          <Button type="button" variant="secondary" onClick={() => setRemoveTarget(member)}>
                            Remove
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      heading="Control Center"
      subheading="Governance log, admin roster, and organization shortcuts."
    >
      <RemoveUserDialog
        open={removeTarget !== null}
        userName={removeTarget?.name ?? ""}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={performRemove}
      />

      <div className={ccStyles.settingsStack}>
      <section>
        <PasswordSettingsPanel />
      </section>

      <section>
        <SignupPlansPanel />
      </section>

      <section>
        <SubscriptionsPanel />
      </section>

      <section className={ccStyles.controlSplitGrid}>
        <Card>
          <h2>Governance activity</h2>
          <p className={`${styles.metaLine} ${ccStyles.cardIntro}`}>
            Live audit trail of admin lifecycle, onboarding, and hive changes. New entries appear as you act in Team
            Hive.
          </p>
          <div className={ccStyles.logPanel}>
            {sortedLog.length === 0 ? (
              <p className={styles.metaLine}>
                No events yet. Promote an admin or add a team member to build history.
              </p>
            ) : null}
            {sortedLog.map((entry) => (
              <article key={entry.id} className={ccStyles.logItem}>
                <div className={ccStyles.logItemHeader}>
                  <Badge text={eventKindLabel(entry.kind)} tone={eventBadgeTone(entry.kind)} />
                  <time className={ccStyles.logTime} dateTime={entry.at}>
                    {new Date(entry.at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <p className={ccStyles.logSummary}>{entry.summary}</p>
                {entry.actorName || entry.targetName ? (
                  <p className={ccStyles.logActors}>
                    {entry.actorName ? <span>Actor: {entry.actorName}</span> : null}
                    {entry.actorName && entry.targetName ? " · " : null}
                    {entry.targetName ? <span>Subject: {entry.targetName}</span> : null}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </Card>
        <Card>
          <h2>Organization snapshot</h2>
          <div className={`${ccStyles.summaryGrid} ${ccStyles.snapshotStats}`}>
            <div className={ccStyles.summaryStat}>
              <span>Workspace members</span>
              <strong>{users.length}</strong>
            </div>
            <div className={ccStyles.summaryStat}>
              <span>Admin layers (1–2)</span>
              <strong>{adminRoster.length}</strong>
            </div>
            <div className={ccStyles.summaryStat}>
              <span>Hive teams</span>
              <strong>{teams.length}</strong>
            </div>
          </div>
          <h3 className={ccStyles.snapshotQuickHeading}>Quick links</h3>
          <div className={ccStyles.quickLinks}>
            <Link href="/team" className={ccStyles.quickLink}>
              Team Hive — roles, hives, promotions
            </Link>
            <Link href="/dashboard" className={ccStyles.quickLink}>
              Command dashboard
            </Link>
            <Link href="/customers" className={ccStyles.quickLink}>
              Customer directory
            </Link>
          </div>
        </Card>
      </section>

      <section className={ccStyles.fullBleedSection}>
        <Card>
          <h2>Admin roster</h2>
          <p className={`${styles.metaLine} ${ccStyles.cardIntro}`}>
            Layer 1 and Layer 2 administrators. Remove sends the person an email with your reason (you cannot remove your
            own account here).
          </p>
          {adminRoster.length === 0 ? (
            <p className={styles.metaLine}>No admins in roster.</p>
          ) : (
            <div className={ccStyles.rosterScroll}>
              <table className={ccStyles.rosterTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Layer</th>
                    <th>Company role</th>
                    <th>Permission</th>
                    <th>Currency</th>
                    <th>Since</th>
                    <th className={ccStyles.actionsCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRoster.map((member) => {
                    const showRemove =
                      member.id !== currentUser.id &&
                      canDeactivateUser(currentUser.role, currentUser.id, member);
                    return (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td className={ccStyles.rosterEmail}>{member.email}</td>
                        <td className={ccStyles.layerCell}>
                          <Badge
                            className={ccStyles.badgeInTable}
                            text={isAdminLayer(member.role) ? adminLayerLabel(member.role) : member.role}
                            tone={member.role === "super_admin" ? "success" : "default"}
                          />
                        </td>
                        <td>{companyRoleLabel(member.companyRolePreset, member.customCompanyRole)}</td>
                        <td>{member.permissionLevel?.replace(/_/g, " ") ?? "—"}</td>
                        <td className={ccStyles.currencyCell}>
                          <AdminCurrencySelect
                            value={member.displayCurrency ?? DEFAULT_DISPLAY_CURRENCY}
                            ariaLabel={`Display currency for ${member.name}`}
                            onChange={(next) => handleAdminCurrencyChange(member.id, next)}
                          />
                        </td>
                        <td>{member.createdAt}</td>
                        <td className={ccStyles.actionsCell}>
                          {showRemove ? (
                            <Button type="button" variant="secondary" onClick={() => setRemoveTarget(member)}>
                              Remove
                            </Button>
                          ) : (
                            <span className={styles.metaLine}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section className={ccStyles.fullBleedSection}>
        <div className={ccStyles.layersCard}>
          <Card>
            <h2>Control layers</h2>
            <div className={ccStyles.layersStack}>
              <div className={`${styles.listItem} ${ccStyles.layersListItem}`}>
                <div className={ccStyles.layersRow}>
                  <strong>Super Admin</strong>
                  <span className={ccStyles.layersBadgeWrap}>
                    <Badge text="Layer 1" tone="success" className={ccStyles.badgeInTable} />
                  </span>
                </div>
                <p>Organization-wide controls, security policy, billing, and role ownership.</p>
              </div>
              <div className={`${styles.listItem} ${ccStyles.layersListItem}`}>
                <div className={ccStyles.layersRow}>
                  <strong>Admin</strong>
                  <span className={ccStyles.layersBadgeWrap}>
                    <Badge text="Layer 2" className={ccStyles.badgeInTable} />
                  </span>
                </div>
                <p>Operational controls for teams, members, customers, and tasks.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
      </div>
    </AppShell>
  );
}
