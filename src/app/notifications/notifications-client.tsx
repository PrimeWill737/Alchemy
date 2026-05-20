"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCrmStore } from "@/store/use-crm-store";
import type { AppNotificationIcon } from "@/types/crm";
import styles from "@/app/notifications/notifications.module.scss";

function iconGlyph(kind: AppNotificationIcon): string {
  switch (kind) {
    case "deal":
      return "📊";
    case "task":
      return "✓";
    case "lead":
      return "◎";
    case "message":
      return "✉";
    case "chat_request":
      return "💬";
    default:
      return "•";
  }
}

export function NotificationsClient() {
  const router = useRouter();
  const { id: userId, ready } = useCurrentUser();
  const appNotifications = useCrmStore((s) => s.appNotifications);
  const markNotificationRead = useCrmStore((s) => s.markNotificationRead);
  const markAllNotificationsReadForUser = useCrmStore((s) => s.markAllNotificationsReadForUser);

  const mine = useMemo(() => {
    if (!userId) return [];
    return appNotifications.filter((n) => n.recipientUserIds.includes(userId));
  }, [appNotifications, userId]);

  const sorted = useMemo(
    () => [...mine].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [mine],
  );

  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return sorted.filter((n) => !n.readByUserIds.includes(userId)).length;
  }, [sorted, userId]);

  const onRowClick = useCallback(
    (id: string) => {
      if (!userId) return;
      markNotificationRead(id, userId);
      const n = appNotifications.find((x) => x.id === id);
      if (n?.icon === "chat_request") {
        router.push("/messages");
      }
    },
    [appNotifications, markNotificationRead, router, userId],
  );

  const onMarkAll = useCallback(() => {
    if (!userId) return;
    markAllNotificationsReadForUser(userId);
  }, [markAllNotificationsReadForUser, userId]);

  if (!ready || !userId) {
    return <p className={styles.hint}>Sign in to view notifications.</p>;
  }

  return (
    <Card>
      <div className={styles.toolbar}>
        <h2 className={styles.title}>Recent notifications</h2>
        {unreadCount > 0 ? (
          <Button type="button" variant="secondary" onClick={onMarkAll}>
            Mark all as read
          </Button>
        ) : null}
      </div>
      <div className={styles.list}>
        {sorted.length === 0 ? (
          <p className={styles.hint}>You are all caught up.</p>
        ) : (
          sorted.map((n) => {
            const unread = !n.readByUserIds.includes(userId);
            return (
              <button
                key={n.id}
                type="button"
                className={`${styles.row} ${unread ? styles.rowUnread : ""}`}
                onClick={() => onRowClick(n.id)}
              >
                <span className={styles.icon} aria-hidden>
                  {iconGlyph(n.icon)}
                </span>
                <span className={styles.body}>
                  <span className={styles.rowTitle}>{n.title}</span>
                  {n.body ? <span className={styles.rowBody}>{n.body}</span> : null}
                  <span className={styles.rowMeta}>
                    {n.createdAt}
                    {unread ? " · Unread — click to mark read" : " · Read"}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </Card>
  );
}
