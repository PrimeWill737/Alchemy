import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_MUST_RESET_COOKIE_NAME,
  AUTH_ROLE_COOKIE_NAME,
  AUTH_USER_COOKIE_NAME,
  AUTH_USER_ID_COOKIE_NAME,
} from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_ROLE_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_USER_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_USER_ID_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_MUST_RESET_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
