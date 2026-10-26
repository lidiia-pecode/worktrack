import { refreshSession } from "@/lib/api/server/refresh-session";
import { NextResponse } from "next/server";

const BAD_GATEWAY = 502;

export async function POST() {
  const refreshRes = await refreshSession().catch(() => null);

  // The browser ends the session only on a 401, so a throttled refresh or a
  // backend that is down must not turn into one.
  if (!refreshRes?.ok) {
    return NextResponse.json(
      { success: false },
      { status: refreshRes?.status ?? BAD_GATEWAY },
    );
  }

  const response = NextResponse.json({ success: true });

  refreshRes.headers.getSetCookie().forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });

  return response;
}
