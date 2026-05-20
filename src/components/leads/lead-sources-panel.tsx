"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCanManageLeadSources } from "@/hooks/use-can-manage-lead-sources";
import { useCrmStore } from "@/store/use-crm-store";
import type { LeadSource } from "@/types/crm";
import styles from "./lead-sources-panel.module.scss";

async function safeReadError(response: Response): Promise<string> {
  try {
    const j = (await response.json()) as { error?: string };
    return j.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export function LeadSourcesPanel() {
  const canManage = useCanManageLeadSources();
  const leadSources = useCrmStore((s) => s.leadSources);
  const setLeadSources = useCrmStore((s) => s.setLeadSources);
  const addLeadSource = useCrmStore((s) => s.addLeadSource);
  const updateLeadSource = useCrmStore((s) => s.updateLeadSource);
  const removeLeadSource = useCrmStore((s) => s.removeLeadSource);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteSource, setPendingDeleteSource] = useState<LeadSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/lead-sources");
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { source?: string; sources?: LeadSource[] };
        if (data.source === "db" && Array.isArray(data.sources)) {
          setLeadSources(data.sources);
        }
      } catch {
        /* offline / no DB — keep store defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setLeadSources]);

  const startEdit = useCallback((source: LeadSource) => {
    setError(null);
    setEditingId(source.id);
    setDraftName(source.name);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setDraftName("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const trimmed = draftName.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setError(null);
    setBusyId(editingId);
    try {
      const response = await fetch(`/api/lead-sources/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (response.status === 200) {
        updateLeadSource(editingId, trimmed);
        cancelEdit();
        return;
      }
      if (response.status === 503) {
        updateLeadSource(editingId, trimmed);
        cancelEdit();
        return;
      }
      setError(await safeReadError(response));
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setBusyId(null);
    }
  }, [editingId, draftName, updateLeadSource, cancelEdit]);

  const confirmRemoveLeadSource = useCallback(async () => {
    const source = pendingDeleteSource;
    if (!source) return;
    setError(null);
    setBusyId(source.id);
    try {
      const response = await fetch(`/api/lead-sources/${encodeURIComponent(source.id)}`, {
        method: "DELETE",
      });
      if (response.status === 200 || response.status === 503) {
        removeLeadSource(source.id);
        if (editingId === source.id) cancelEdit();
        setPendingDeleteSource(null);
        return;
      }
      setError(await safeReadError(response));
    } catch {
      setError("Could not delete. Try again.");
    } finally {
      setBusyId(null);
    }
  }, [pendingDeleteSource, removeLeadSource, editingId, cancelEdit]);

  const addSource = useCallback(async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setError(null);
    setBusyId("__new__");
    try {
      const response = await fetch("/api/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (response.status === 201) {
        const data = (await response.json()) as { sourceEntry?: LeadSource };
        if (data.sourceEntry) {
          addLeadSource(data.sourceEntry);
        }
        setNewName("");
        return;
      }
      if (response.status === 503) {
        addLeadSource({ id: `ls-${crypto.randomUUID()}`, name: trimmed });
        setNewName("");
        return;
      }
      setError(await safeReadError(response));
    } catch {
      setError("Could not add source. Try again.");
    } finally {
      setBusyId(null);
    }
  }, [newName, addLeadSource]);

  return (
    <>
    <ConfirmDialog
      open={pendingDeleteSource !== null}
      title="Remove lead source?"
      description={
        pendingDeleteSource ? (
          <>
            Remove &ldquo;<strong>{pendingDeleteSource.name}</strong>&rdquo; from the list? Existing leads keep this
            label.
          </>
        ) : null
      }
      confirmLabel="Remove"
      confirmPendingLabel="Removing…"
      pending={busyId === pendingDeleteSource?.id}
      onCancel={() => setPendingDeleteSource(null)}
      onConfirm={confirmRemoveLeadSource}
    />
    <div className={styles.panel}>
      {!canManage ? (
        <p className={styles.hint}>
          Only Super Admin, Admin, and teammates with lead-management access (standard permission or higher) can
          change this list.
        </p>
      ) : null}

      {leadSources.map((source) => (
        <div key={source.id} className={styles.row}>
          {editingId === source.id ? (
            <>
              <input
                className={styles.input}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                aria-label="Edit source name"
                disabled={busyId === source.id}
              />
              <div className={styles.actions}>
                <button type="button" className={styles.iconBtn} onClick={() => void saveEdit()} disabled={busyId === source.id}>
                  Save
                </button>
                <button type="button" className={styles.iconBtn} onClick={cancelEdit} disabled={busyId === source.id}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <span className={styles.name}>{source.name}</span>
              {canManage ? (
                <div className={styles.actions}>
                  <button type="button" className={styles.iconBtn} onClick={() => startEdit(source)} disabled={busyId !== null}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => setPendingDeleteSource(source)}
                    disabled={busyId !== null}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ))}

      {canManage ? (
        <div className={styles.addRow}>
          <input
            className={styles.input}
            placeholder="New source name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="New lead source name"
            disabled={busyId === "__new__"}
          />
          <Button type="button" onClick={() => void addSource()} disabled={busyId === "__new__"}>
            Add source
          </Button>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
    </>
  );
}
