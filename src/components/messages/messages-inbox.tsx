"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canInteractWithInbox } from "@/lib/rbac";
import { getMessageRespondUrl, openExternalUrl } from "@/lib/message-respond";
import { useCrmStore } from "@/store/use-crm-store";
import type { InboxMessage, InboxMessageStatus } from "@/types/crm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import styles from "./messages-inbox.module.scss";

function statusBadge(status: InboxMessageStatus) {
  if (status === "responded") {
    return <span className={`${styles.badge} ${styles.badgeResponded}`}>Responded</span>;
  }
  if (status === "closed") {
    return <span className={`${styles.badge} ${styles.badgeClosed}`}>Close</span>;
  }
  return <span className={`${styles.badge} ${styles.badgeOpen}`}>Open</span>;
}

export function MessagesInbox() {
  const { role, ready } = useCurrentUser();
  const messages = useCrmStore((s) => s.messages);
  const setMessageStatus = useCrmStore((s) => s.setMessageStatus);
  const removeMessage = useCrmStore((s) => s.removeMessage);

  const [messageToDelete, setMessageToDelete] = useState<InboxMessage | null>(null);

  const canAct = ready && canInteractWithInbox(role);

  const patchStatus = (id: string, status: InboxMessageStatus) => {
    setMessageStatus(id, status);
    void fetch(`/api/messages/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
  };

  const onRespond = (message: InboxMessage) => {
    if (!canAct || message.status === "closed") return;
    const url = getMessageRespondUrl(message.channel, message.from);
    if (!url) return;
    openExternalUrl(url);
    if (message.status === "open") {
      patchStatus(message.id, "responded");
    }
  };

  const onClosed = (id: string) => {
    if (!canAct) return;
    patchStatus(id, "closed");
  };

  const confirmRemoveMessage = () => {
    if (!messageToDelete) return;
    removeMessage(messageToDelete.id);
    setMessageToDelete(null);
  };

  return (
    <div className={styles.list}>
      <ConfirmDialog
        open={messageToDelete !== null}
        title="Remove message?"
        description="Remove this message from the inbox? You cannot restore it here."
        confirmLabel="Remove"
        onCancel={() => setMessageToDelete(null)}
        onConfirm={confirmRemoveMessage}
      />
      {!canAct ? (
        <p className={styles.hint}>
          Your role can view the inbox but not respond or change message status. Ask an admin for customer or task
          access.
        </p>
      ) : null}
      {messages.map((message) => {
        const respondUrl = getMessageRespondUrl(message.channel, message.from);
        const isClosed = message.status === "closed";
        return (
          <article
            key={message.id}
            className={`${styles.card} ${isClosed ? styles.cardClosed : ""}`}
          >
            <div className={styles.header}>
              <div className={styles.channelRow}>
                <strong>{message.channel}</strong>
                {statusBadge(message.status)}
              </div>
              <span className={styles.time}>{new Date(message.createdAt).toLocaleString()}</span>
            </div>
            <p className={styles.from}>{message.from}</p>
            <p className={styles.content}>{message.content}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionBtn}
                disabled={!canAct || isClosed || !respondUrl}
                title={
                  !respondUrl
                    ? "No email or phone detected for this channel."
                    : `Open ${message.channel} to reply`
                }
                onClick={() => onRespond(message)}
              >
                Respond
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionDanger}`}
                disabled={!canAct}
                onClick={() => setMessageToDelete(message)}
              >
                Delete
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                disabled={!canAct || isClosed}
                onClick={() => onClosed(message.id)}
              >
                Close
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
