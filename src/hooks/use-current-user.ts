"use client";

import { useSyncExternalStore } from "react";
import type { UserRole } from "@/types/crm";
import {
  AUTH_ROLE_COOKIE_NAME,
  AUTH_USER_COOKIE_NAME,
  AUTH_USER_ID_COOKIE_NAME,
} from "@/lib/auth";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((cookieEntry) => cookieEntry.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : "";
}

export type CurrentUserSnapshot = {
  role: UserRole;
  name: string;
  id: string;
  ready: boolean;
};

const serverSnapshot: CurrentUserSnapshot = {
  role: "viewer",
  name: "Alchemy User",
  id: "",
  ready: false,
};

/** Module cache so getSnapshot returns the same object reference when cookies are unchanged (required by React). */
let clientSnapshotCache: CurrentUserSnapshot | null = null;
let clientSnapshotKey = "";

function getClientSnapshot(): CurrentUserSnapshot {
  const role = (readCookie(AUTH_ROLE_COOKIE_NAME) || "viewer") as UserRole;
  const name = readCookie(AUTH_USER_COOKIE_NAME) || "Alchemy User";
  const id = readCookie(AUTH_USER_ID_COOKIE_NAME) || "";
  const key = `${role}\0${name}\0${id}`;
  if (clientSnapshotCache && clientSnapshotKey === key) {
    return clientSnapshotCache;
  }
  clientSnapshotKey = key;
  clientSnapshotCache = { role, name, id, ready: true };
  return clientSnapshotCache;
}

function getServerSnapshot(): CurrentUserSnapshot {
  return serverSnapshot;
}

function subscribe() {
  return () => {};
}

export function useCurrentUser(): CurrentUserSnapshot {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
