import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "./lib/constants/backend-url";

const UNAUTHORIZED = 401;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  const accessTokenExpired = accessToken ? isTokenExpired(accessToken) : true;

  if (accessTokenExpired && refreshToken) {
    const refreshRes = await reachBackend("/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshToken}` },
    });

    // Only a refused refresh ends the session. A throttled one, or a backend
    // that is asleep or down, keeps the cookies for the next request to retry.
    if (refreshRes?.status === UNAUTHORIZED) {
      return handleRouteGuards(pathname, false, req, withoutSession());
    }
    if (!refreshRes?.ok) return NextResponse.next();

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

    // Forward the backend's cookies untouched: it already decides secure,
    // sameSite and how long they live. Rebuilding them here dropped Max-Age.
    setCookieHeader.forEach((raw) => {
      response.headers.append("Set-Cookie", raw);
    });

    return handleRouteGuards(pathname, true, req, response);
  }

  const isAuthenticated = !accessTokenExpired;

  // An unexpired token can outlive its session (signed out elsewhere, cleaned
  // up), and a sign-in page would then send the person back to `/` for good.
  if (isAuthenticated && isGuestRoute(pathname)) {
    const meRes = await reachBackend("/users/me", {
      headers: { Cookie: `access_token=${accessToken}` },
    });

    if (meRes?.status === UNAUTHORIZED) return withoutSession();
  }

  return handleRouteGuards(pathname, isAuthenticated, req, NextResponse.next());
}

/** The backend's answer, or null when it could not be reached. */
async function reachBackend(path: string, init: RequestInit) {
  try {
    return await fetch(`${BACKEND_URL}${path}`, { ...init, cache: "no-store" });
  } catch {
    return null;
  }
}

function withoutSession() {
  const response = NextResponse.next();

  response.cookies.delete("refresh_token");
  response.cookies.delete("access_token");

  return response;
}

// The Google sign-up and link pages finish signing somebody in, so a signed-in
// person has no business there.
function isGuestRoute(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/google/")
  );
}

function isProtectedRoute(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/planning") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/timesheet") ||
    pathname.startsWith("/my-time") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/getting-started")
  );
}

function handleRouteGuards(
  pathname: string,
  isAuthenticated: boolean,
  req: NextRequest,
  response: NextResponse,
) {
  if (isAuthenticated && isGuestRoute(pathname)) {
    return redirectKeepingCookies("/", req, response);
  }

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    return redirectKeepingCookies("/login", req, response);
  }

  return response;
}

/** A redirect carrying the cookies already set or deleted on `response`. */
function redirectKeepingCookies(
  path: string,
  req: NextRequest,
  response: NextResponse,
) {
  const redirect = NextResponse.redirect(new URL(path, req.url));

  response.headers.getSetCookie().forEach((cookie) => {
    redirect.headers.append("Set-Cookie", cookie);
  });

  return redirect;
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
