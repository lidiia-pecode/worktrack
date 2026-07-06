import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/app/api/api-consts";

export async function POST() {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: "POST",
    cache: "no-store",
    headers: { Cookie: cookieHeader },
  });

  if (!refreshRes.ok) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  refreshRes.headers.getSetCookie().forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });

  return response;
}
