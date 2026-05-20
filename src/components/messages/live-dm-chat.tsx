"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipIcon } from "@/components/messages/clip-icon";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canOpenDmThread, dmPairKey, getTeammateUserIds } from "@/lib/dm-utils";
import { useCrmStore } from "@/store/use-crm-store";
import type { DmAttachment, User } from "@/types/crm";
import styles from "./live-dm-chat.module.scss";

const FILE_ACCEPT =
  "image/*,video/*,.mkv,.mov,.webm,.m4v,.avi,.wmv,.mpeg,.mpg,.3gp,.flv,.ogv,.ts,.heic,.heif,.avif,.jfif,.bmp,.tiff,.tif";

function SendIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function attachmentSrc(a: DmAttachment): string | undefined {
  return a.url ?? a.dataUrl;
}

function eligiblePeers(
  meId: string,
  users: User[],
  teammateIds: string[],
  allowedPairKeys: string[],
): User[] {
  return users.filter(
    (u) => u.id !== meId && canOpenDmThread(meId, u.id, teammateIds, allowedPairKeys),
  );
}

export function LiveDmChat() {
  const { id: userId, ready, name: sessionName } = useCurrentUser();
  const users = useCrmStore((s) => s.users);
  const teams = useCrmStore((s) => s.teams);
  const dmMessages = useCrmStore((s) => s.dmMessages);
  const dmContactRequests = useCrmStore((s) => s.dmContactRequests);
  const dmAllowedPairKeys = useCrmStore((s) => s.dmAllowedPairKeys);
  const addDmMessage = useCrmStore((s) => s.addDmMessage);
  const createDmContactRequest = useCrmStore((s) => s.createDmContactRequest);
  const acceptDmContactRequest = useCrmStore((s) => s.acceptDmContactRequest);
  const rejectDmContactRequest = useCrmStore((s) => s.rejectDmContactRequest);

  const [peerId, setPeerId] = useState<string>("");
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<DmAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);

  const feedEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const profile = useMemo(() => users.find((u) => u.id === userId), [users, userId]);
  const teammateIds = useMemo(
    () => (userId ? getTeammateUserIds(userId, users, teams) : []),
    [userId, users, teams],
  );

  const peers = useMemo(
    () => (userId ? eligiblePeers(userId, users, teammateIds, dmAllowedPairKeys) : []),
    [userId, users, teammateIds, dmAllowedPairKeys],
  );

  const activePeer = useMemo(() => peers.find((p) => p.id === peerId), [peers, peerId]);

  const incoming = useMemo(
    () =>
      userId
        ? dmContactRequests.filter((r) => r.toUserId === userId && r.status === "pending")
        : [],
    [dmContactRequests, userId],
  );

  const outgoing = useMemo(
    () =>
      userId
        ? dmContactRequests.filter((r) => r.fromUserId === userId && r.status === "pending")
        : [],
    [dmContactRequests, userId],
  );

  const threadKey = peerId && userId ? dmPairKey(userId, peerId) : "";
  const threadMessages = useMemo(() => {
    if (!threadKey) return [];
    return dmMessages
      .filter((m) => m.threadKey === threadKey)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [dmMessages, threadKey]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length, threadKey]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const sendChat = useCallback(() => {
    setError(null);
    if (!userId || !peerId) {
      setError("Pick someone to message.");
      return;
    }
    if (!canOpenDmThread(userId, peerId, teammateIds, dmAllowedPairKeys)) {
      setError("You are not connected with this person yet. Send a chat request by email first.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed && !attachment) {
      setError("Type a message or attach a photo/video.");
      return;
    }
    addDmMessage({
      threadKey,
      senderUserId: userId,
      text: trimmed,
      attachment: attachment ?? undefined,
      createdAt: new Date().toISOString(),
    });
    setText("");
    setAttachment(null);
  }, [
    addDmMessage,
    attachment,
    dmAllowedPairKeys,
    peerId,
    teammateIds,
    text,
    threadKey,
    userId,
  ]);

  const onPickFile = useCallback(async (fileList: FileList | null) => {
    setError(null);
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload/cloudinary", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as {
        error?: string;
        url?: string;
        kind?: "image" | "video";
        publicId?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed.");
      }
      if (!data.url || !data.kind) {
        throw new Error("Invalid upload response.");
      }
      setAttachment({
        kind: data.kind,
        url: data.url,
        publicId: data.publicId,
        name: file.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, []);

  const submitRequest = useCallback(async () => {
    setError(null);
    setRequestMsg(null);
    if (!userId || !profile?.email) {
      setError("Sign in to send a request.");
      return;
    }
    const emailToSend = requestEmail.trim();
    const result = createDmContactRequest({
      fromUserId: userId,
      fromName: profile.name,
      fromEmail: profile.email,
      toEmail: emailToSend,
    });
    if (!result.ok) {
      setError(result.error ?? "Could not send request.");
      return;
    }
    setRequestEmail("");
    setRequestMsg("Request sent. They will get an email (if configured) and a dashboard notification.");
    try {
      await fetch("/api/messaging/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: emailToSend,
          fromName: profile.name,
          fromEmail: profile.email,
          requestId: result.requestId,
        }),
      });
    } catch {
      /* email is best-effort */
    }
  }, [createDmContactRequest, profile, requestEmail, userId]);

  if (!ready || !userId) {
    return <p className={styles.hint}>Sign in to use live chat.</p>;
  }

  const hasAlerts = incoming.length > 0 || outgoing.length > 0;

  return (
    <div className={styles.root}>
      <p className={styles.intro}>
        Message teammates in your hive or invite others by workspace email. Videos up to 100&nbsp;MB.
      </p>

      {hasAlerts ? (
        <div className={styles.alertsBlock}>
          {incoming.length > 0 ? (
            <div>
              <p className={styles.alertSectionTitle}>Chat requests</p>
              {incoming.map((r) => (
                <div key={r.id} className={styles.requestCard}>
                  <p className={styles.hint}>
                    <strong>{r.fromName}</strong> ({r.fromEmail}) wants to message you.
                  </p>
                  <div className={styles.requestActions}>
                    <button
                      type="button"
                      className={styles.acceptBtn}
                      onClick={() => acceptDmContactRequest(r.id, userId)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      onClick={() => rejectDmContactRequest(r.id, userId)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {outgoing.length > 0 ? (
            <div>
              <p className={styles.alertSectionTitle}>Pending invites</p>
              {outgoing.map((r) => (
                <div key={r.id} className={styles.requestCard}>
                  <p className={styles.hint}>
                    Waiting for <strong>{r.toEmail}</strong> to accept.
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.setupStrip}>
        <div className={styles.setupField}>
          <span className={styles.setupLabel}>Invite by email</span>
          <div className={styles.row}>
            <input
              type="email"
              className={styles.input}
              placeholder="colleague@company.com"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              aria-label="Email to invite for chat"
            />
            <Button type="button" variant="secondary" onClick={() => void submitRequest()}>
              Send request
            </Button>
          </div>
        </div>
        <div className={styles.setupField}>
          <span className={styles.setupLabel}>Direct message</span>
          <select
            className={styles.select}
            aria-label="Chat with"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
          >
            <option value="">Choose someone…</option>
            {peers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
        {requestMsg ? (
          <p className={styles.setupHint}>{requestMsg}</p>
        ) : teammateIds.length === 0 ? (
          <p className={styles.setupHint}>
            No hive teammates for {sessionName}. Admins can add you on Team Hive.
          </p>
        ) : null}
      </div>

      <div className={styles.chatPanel}>
        <header className={styles.chatHeader}>
          <span
            className={`${styles.chatHeaderDot} ${peerId ? "" : styles.chatHeaderDotIdle}`}
            aria-hidden
          />
          <div className={styles.chatHeaderText}>
            <h3 className={styles.chatHeaderTitle}>
              {activePeer?.name ?? "New message"}
            </h3>
            <p className={styles.chatHeaderSub}>
              {activePeer?.email ??
                "Pick a teammate or accepted contact to open the thread."}
            </p>
          </div>
        </header>

        <div className={styles.chatFeed} aria-live="polite">
          {!peerId ? (
            <div className={styles.emptyFeed}>
              <p>
                <strong>No thread selected</strong>
                Choose who you are messaging above. Your conversation will show here.
              </p>
            </div>
          ) : threadMessages.length === 0 ? (
            <div className={styles.emptyFeed}>
              <p>
                <strong>Start the thread</strong>
                Say hello or drop a file — messages stay in this workspace only.
              </p>
            </div>
          ) : (
            threadMessages.map((m) => {
              const mine = m.senderUserId === userId;
              const sender = users.find((u) => u.id === m.senderUserId);
              const src = m.attachment ? attachmentSrc(m.attachment) : undefined;
              return (
                <div
                  key={m.id}
                  className={`${styles.bubble} ${mine ? styles.bubbleMe : styles.bubbleThem}`}
                >
                  <div className={styles.meta}>
                    {sender?.name ?? m.senderUserId} · {new Date(m.createdAt).toLocaleString()}
                  </div>
                  {m.text ? <div>{m.text}</div> : null}
                  {m.attachment?.kind === "image" && src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URL or legacy data URL
                    <img
                      src={src}
                      alt={m.attachment.name ?? "attachment"}
                      className={styles.attachPreview}
                    />
                  ) : null}
                  {m.attachment?.kind === "video" && src ? (
                    <video src={src} controls className={styles.videoPreview} />
                  ) : null}
                </div>
              );
            })
          )}
          <div ref={feedEndRef} className={styles.feedEnd} />
        </div>

        <div className={styles.chatFooter}>
          <div className={styles.attachMeta}>
            {uploading ? <span className={styles.hint}>Uploading…</span> : null}
            {attachment ? (
              <>
                <span className={styles.hint}>{attachment.name ?? attachment.kind}</span>
                <button type="button" className={styles.clearAttach} onClick={() => setAttachment(null)}>
                  Remove
                </button>
              </>
            ) : null}
          </div>
          <div className={styles.composerShell}>
            <div className={styles.clipWrap}>
              <label
                className={styles.clipBtn}
                aria-label={uploading ? "Uploading…" : "Attach image or video"}
              >
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  className={styles.srInput}
                  disabled={uploading}
                  onChange={(e) => void onPickFile(e.target.files)}
                />
                <ClipIcon />
              </label>
            </div>
            <textarea
              ref={textareaRef}
              className={styles.composerTextarea}
              rows={1}
              placeholder={peerId ? "Write a message…" : "Select someone to start…"}
              value={text}
              disabled={!peerId}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              aria-label="Message text"
            />
            <Button
              type="button"
              className={styles.sendButton}
              onClick={sendChat}
              disabled={uploading || !peerId}
              aria-label="Send message"
            >
              <SendIcon />
            </Button>
          </div>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
