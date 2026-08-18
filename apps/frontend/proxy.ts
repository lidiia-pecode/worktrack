import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "./lib/constants";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  const accessTokenExpired = accessToken ? isTokenExpired(accessToken) : true;

  let isAuthenticated = !!accessToken && !accessTokenExpired;

  if (accessTokenExpired && refreshToken) {
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: "no-store",
    });

    if (!refreshRes.ok) {
      const response = NextResponse.next();

      response.cookies.delete("refresh_token");
      response.cookies.delete("access_token");

      return handleRouteGuards(pathname, false, req, response);
    }

    isAuthenticated = true;
    const setCookieHeader = refreshRes.headers.getSetCookie();

    const requestHeaders = new Headers(req.headers);

    const newCookies = setCookieHeader
      .map((cookie) => cookie.split(";")[0])
      .filter(Boolean);

    if (newCookies.length > 0) {
      const existingCookies = requestHeaders.get("Cookie");

      requestHeaders.set(
        "Cookie",
        [existingCookies, ...newCookies].filter(Boolean).join("; "),
      );
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

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

    // console.log("[AUTH] access token exists:", !!accessToken);
    // console.log("[AUTH] access token expired:", accessTokenExpired);
    // console.log("[AUTH] refresh token exists:", !!refreshToken);

    return handleRouteGuards(pathname, true, req, response);
  }

  return handleRouteGuards(pathname, isAuthenticated, req, NextResponse.next());
}

function handleRouteGuards(
  pathname: string,
  isAuthenticated: boolean,
  req: NextRequest,
  response: NextResponse,
) {
  const isGuestRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding");

  if (isAuthenticated && isGuestRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL("/login", req.url);
    // loginUrl.searchParams.set("returnTo", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );

    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
