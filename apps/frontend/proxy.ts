import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "./lib/constants";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  let isAuthenticated = !!accessToken;

  if (!accessToken && refreshToken) {
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshToken}` },
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
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // todo: add protected routes
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isAuthenticated && isProtectedRoute) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
