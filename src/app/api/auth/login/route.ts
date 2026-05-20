import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    token: "mock-jwt-token",
    refreshToken: "mock-refresh-token",
    user: { id: "u1", email: "amina@crm.dev", role: "admin" },
  });
}
