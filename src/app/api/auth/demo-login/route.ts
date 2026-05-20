import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_VALUE,
  AUTH_MUST_RESET_COOKIE_NAME,
  AUTH_ROLE_COOKIE_NAME,
  AUTH_USER_COOKIE_NAME,
  AUTH_USER_ID_COOKIE_NAME,
  getDemoAccount,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { authenticateDbUser } from "@/lib/db-auth";

export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();
  let account = null as {
    email: string;
    displayName: string;
    userId: string;
    role:
      | "super_admin"
      | "admin"
      | "marketer"
      | "sales_manager"
      | "sales_representative"
      | "support_agent"
      | "viewer";
  } | null;

  let mustChangePassword = false;

  if (db) {
    const dbResult = await authenticateDbUser(body?.email, body?.password);
    if (dbResult) {
      account = {
        email: dbResult.user.email,
        displayName: dbResult.user.name,
        userId: dbResult.user.id,
        role: dbResult.user.role,
      };
      mustChangePassword = dbResult.mustChangePassword;
    }
  }

  if (!account) {
    account = getDemoAccount(body?.email, body?.password) ?? null;
  }

  if (!account) {
    return NextResponse.json(
      { success: false, message: "Invalid email or password" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true, mustChangePassword });
  response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_ROLE_COOKIE_NAME, account.role, {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_USER_COOKIE_NAME, account.displayName, {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_USER_ID_COOKIE_NAME, account.userId, {
    httpOnly: false,
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });
  if (mustChangePassword) {
    response.cookies.set(AUTH_MUST_RESET_COOKIE_NAME, "1", {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
  } else {
    response.cookies.set(AUTH_MUST_RESET_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  }
  return response;
}
