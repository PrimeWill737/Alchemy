"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import styles from "@/app/module-pages.module.scss";
import { adminLayerLabel, isAdminLayer } from "@/lib/admin-layers";
import { TeamMemberForm } from "@/components/forms/team-member-form";
import { useCrmStore } from "@/store/use-crm-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { hasPermission, roleLabel } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { HiveTeamForm } from "@/components/forms/hive-team-form";
import { companyRoleLabel } from "@/lib/company-roles";
import { RemoveUserDialog } from "@/components/settings/remove-user-dialog";
import { canDeactivateUser } from "@/lib/user-deactivation";
import type { User } from "@/types/crm";

export default function TeamPage() {
  const currentUser = useCurrentUser();
  const users = useCrmStore((state) => state.users);
  const setUsers = useCrmStore((state) => state.setUsers);
  const teams = useCrmStore((state) => state.teams);
  const removeUser = useCrmStore((state) => state.removeUser);
  const updateUserRole = useCrmStore((state) => state.updateUserRole);
  const recordGovernanceEvent = useCrmStore((state) => state.recordGovernanceEvent);
  const canManageUsers = hasPermission(currentUser.role, "manage:users");
  const isSuperAdmin = currentUser.role === "super_admin";
  const isAdmin = currentUser.role === "admin";

  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

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

  const visibleTeams = useMemo(() => {
    if (isSuperAdmin) return teams;
    if (isAdmin && currentUser.id) return teams.filter((team) => team.createdByUserId === currentUser.id);
    return teams;
  }, [teams, isSuperAdmin, isAdmin, currentUser.id]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { source?: string; users?: User[] }) => {
        if (cancelled || data.source !== "db" || !Array.isArray(data.users)) return;
        setUsers(data.users);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [setUsers]);

  return (
    <AppShell
      heading={isSuperAdmin ? "Super Admin Control Center" : "Admin Team Workspace"}
      subheading={
        isSuperAdmin
          ? "Control role ownership, admin lifecycle, and hive team architecture."
          : "Manage team members, departments, and day-to-day people operations."
      }
    >
      <RemoveUserDialog
        open={removeTarget !== null}
        userName={removeTarget?.name ?? ""}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={performRemove}
      />
      <section className={styles.splitGrid}>
        <Card>
          <h2>Create Team Hive</h2>
          {canManageUsers ? <HiveTeamForm /> : <p>Insufficient privileges.</p>}
        </Card>
        <Card>
          <h2>{isAdmin ? "Your department hives" : "Department hives"}</h2>
          <div className={styles.list}>
            {visibleTeams.length === 0 ? (
              <div className={styles.listItem}>No hive teams in this scope yet.</div>
            ) : null}
            {visibleTeams.map((team) => (
              <div key={team.id} className={styles.listItem}>
                <div className={styles.row}>
                  <strong>{team.department}</strong>
                  <Badge text={`${team.expectedMembers} members`} />
                </div>
                <p>
                  Leaders: {team.members.filter((member) => member.isLeader).map((member) => member.name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
      <section className={styles.splitGrid}>
        <Card>
          <h2>Add Team Member</h2>
          {canManageUsers ? <TeamMemberForm /> : <p>Insufficient privileges.</p>}
        </Card>
        <Card>
          <h2>Team Members</h2>
          <div className={styles.list}>
            {users.map((member) => (
              <div key={member.id} className={styles.listItem}>
                <div className={styles.row}>
                  <strong>{member.name}</strong>
                  <Badge
                    text={
                      isAdminLayer(member.role)
                        ? adminLayerLabel(member.role)
                        : member.role.replace("_", " ")
                    }
                    tone={isAdminLayer(member.role) ? "success" : "default"}
                  />
                </div>
                <p>{member.email}</p>
                <small className={styles.metaLine}>
                  {companyRoleLabel(member.companyRolePreset, member.customCompanyRole)}
                  {member.permissionLevel
                    ? ` · Permission: ${member.permissionLevel.replace(/_/g, " ")}`
                    : null}
                </small>
                {isSuperAdmin && member.role !== "super_admin" ? (
                  <div className={styles.row}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const nextRole = member.role === "admin" ? "sales_manager" : "admin";
                        updateUserRole(member.id, nextRole);
                        recordGovernanceEvent(
                          nextRole === "admin"
                            ? {
                                kind: "admin_promoted",
                                summary: `${currentUser.name} promoted ${member.name} to Admin.`,
                                actorName: currentUser.name,
                                targetName: member.name,
                              }
                            : {
                                kind: "admin_demoted",
                                summary: `${currentUser.name} removed Admin privileges from ${member.name}.`,
                                actorName: currentUser.name,
                                targetName: member.name,
                              },
                        );
                      }}
                    >
                      {member.role === "admin" ? "Demote Admin" : "Promote to Admin"}
                    </Button>
                    {canDeactivateUser(currentUser.role, currentUser.id, member) ? (
                      <Button type="button" variant="secondary" onClick={() => setRemoveTarget(member)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ) : isSuperAdmin ? (
                  <p className={styles.metaLine}>Super Admin accounts cannot be changed from this list.</p>
                ) : isAdmin && canDeactivateUser(currentUser.role, currentUser.id, member) ? (
                  <div className={styles.row}>
                    <span className={styles.metaLine}>Access level: {roleLabel(member.role)}</span>
                    <Button type="button" variant="secondary" onClick={() => setRemoveTarget(member)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p>Access level: {roleLabel(member.role)}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
