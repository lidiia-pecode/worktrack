import { refreshSession } from "@/lib/api/server/refresh-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/projects";

  const refreshRes = await refreshSession();

  if (!refreshRes.ok) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const response = NextResponse.redirect(new URL(returnTo, req.url));

  refreshRes.headers.getSetCookie().forEach((raw) => {
    const [nameValue] = raw.split(";");
    const eqIdx = nameValue.indexOf("=");
    const name = nameValue.slice(0, eqIdx).trim();
    const value = nameValue.slice(eqIdx + 1).trim();
    response.cookies.set(name, value, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
  });

  return response;
}
