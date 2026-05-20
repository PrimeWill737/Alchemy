import type { HiveTeam, User } from "@/types/crm";

export function dmPairKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(":");
}

/** Users in the same hive as `currentUserId` (matched by member id or name). */
export function getTeammateUserIds(currentUserId: string, users: User[], teams: HiveTeam[]): string[] {
  const me = users.find((u) => u.id === currentUserId);
  if (!me) return [];
  const nameKey = me.name.trim().toLowerCase();
  const teammates = new Set<string>();

  for (const team of teams) {
    const inHive = team.members.some(
      (m) =>
        (m.id && m.id === currentUserId) ||
        (!m.id && m.name.trim().toLowerCase() === nameKey),
    );
    if (!inHive) continue;
    for (const m of team.members) {
      const match = users.find(
        (u) => (m.id && u.id === m.id) || u.name.trim().toLowerCase() === m.name.trim().toLowerCase(),
      );
      if (match && match.id !== currentUserId) teammates.add(match.id);
    }
  }
  return [...teammates];
}

/** True if current user may DM peer (same team or accepted external request). */
export function canOpenDmThread(
  currentUserId: string,
  peerUserId: string,
  myTeammateIds: string[],
  allowedPairKeys: string[],
): boolean {
  if (currentUserId === peerUserId) return false;
  const key = dmPairKey(currentUserId, peerUserId);
  if (allowedPairKeys.includes(key)) return true;
  return myTeammateIds.includes(peerUserId);
}
