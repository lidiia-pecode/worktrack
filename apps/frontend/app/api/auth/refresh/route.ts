import { refreshSession } from "@/lib/api/server/refresh-session";
import { NextResponse } from "next/server";

export async function POST() {
  const refreshRes = await refreshSession();

  if (!refreshRes.ok) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  refreshRes.headers.getSetCookie().forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });

  return response;
}
