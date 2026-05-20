"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCrmStore } from "@/store/use-crm-store";
import type { AppNotification, AppNotificationIcon } from "@/types/crm";
import styles from "./notification-bell.module.scss";

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

export function NotificationBell() {
  const router = useRouter();
  const { id: userId, ready } = useCurrentUser();
  const appNotifications = useCrmStore((s) => s.appNotifications);
  const markNotificationRead = useCrmStore((s) => s.markNotificationRead);
  const markAllNotificationsReadForUser = useCrmStore((s) => s.markAllNotificationsReadForUser);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const mine = useMemo(() => {
    if (!userId) return [];
    return appNotifications.filter((n) => n.recipientUserIds.includes(userId));
  }, [appNotifications, userId]);

  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return mine.filter((n) => !n.readByUserIds.includes(userId)).length;
  }, [mine, userId]);

  const sorted = useMemo(
    () => [...mine].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [mine],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onItemClick = useCallback(
    (n: AppNotification) => {
      if (!userId) return;
      markNotificationRead(n.id, userId);
      if (n.icon === "chat_request" && n.actionRef) {
        setOpen(false);
        router.push("/messages");
        return;
      }
      setOpen(false);
      router.push("/notifications");
    },
    [markNotificationRead, router, userId],
  );

  const onMarkAll = useCallback(() => {
    if (!userId) return;
    markAllNotificationsReadForUser(userId);
  }, [markAllNotificationsReadForUser, userId]);

  if (!ready || !userId) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.bellButton}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>🔔</span>
        {unreadCount > 0 ? <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>
      {open ? (
        <div className={styles.dropdown} role="menu">
          <div className={styles.dropdownHeader}>
            <span>Alerts</span>
            {unreadCount > 0 ? (
              <button type="button" className={styles.markAll} onClick={onMarkAll}>
                Mark all read
              </button>
            ) : null}
          </div>
          {sorted.length === 0 ? (
            <p className={styles.empty}>No notifications yet.</p>
          ) : (
            sorted.slice(0, 8).map((n) => {
              const unread = !n.readByUserIds.includes(userId);
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`${styles.item} ${unread ? styles.itemUnread : ""}`}
                  onClick={() => onItemClick(n)}
                >
                  <span className={styles.iconCell} aria-hidden>
                    {iconGlyph(n.icon)}
                  </span>
                  <span className={styles.body}>
                    <span className={styles.title}>{n.title}</span>
                    <span className={styles.meta}>
                      {n.createdAt}
                      {unread ? " · Unread" : ""}
                    </span>
                  </span>
                </button>
              );
            })
          )}
          <Link href="/notifications" className={styles.footerLink} onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
