"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import styles from "./remove-user-dialog.module.scss";

type Props = {
  open: boolean;
  userName: string;
  title?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function RemoveUserDialog({
  open,
  userName,
  onCancel,
  onConfirm,
  title = "Remove workspace access",
  confirmLabel = "Confirm removal",
}: Props) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setError("");
      setPending(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 8) {
      setError("Please enter a clear reason (at least 8 characters). This is emailed to the user.");
      return;
    }
    setError("");
    setPending(true);
    try {
      await onConfirm(trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={onCancel}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-user-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="remove-user-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.lead}>
          Remove <strong>{userName}</strong> from the workspace. They will receive an email with the reason you provide.
        </p>
        <label className={styles.label} htmlFor="removal-reason">
          Reason (sent to their email)
        </label>
        <textarea
          id="removal-reason"
          className={styles.textarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Role no longer required — contract ended."
          disabled={pending}
          autoFocus
        />
        <p className={styles.hint}>Minimum 8 characters. Be professional; this message is delivered directly.</p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={pending}>
            {pending ? "Removing…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
