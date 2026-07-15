import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function proxy(req: NextRequest) {
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (accessToken || !refreshToken) {
    return NextResponse.next();
  }

  const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: "POST",
    headers: { Cookie: `refresh_token=${refreshToken}` },
    cache: "no-store",
  });

  if (!refreshRes.ok) {
    const response = NextResponse.next();
    response.cookies.delete("refresh_token");
    return response;
  }

  const setCookieHeader = refreshRes.headers.getSetCookie();

  const newAccessToken = setCookieHeader
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("access_token="));

  const requestHeaders = new Headers(req.headers);
  if (newAccessToken) {
    requestHeaders.set(
      "Cookie",
      `${requestHeaders.get("Cookie") ?? ""}; ${newAccessToken}`,
    );
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  setCookieHeader.forEach((raw) => {
    const [nameValue] = raw.split(";");
    const eqIdx = nameValue.indexOf("=");
    response.cookies.set(
      nameValue.slice(0, eqIdx).trim(),
      nameValue.slice(eqIdx + 1).trim(),
      {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      },
    );
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
