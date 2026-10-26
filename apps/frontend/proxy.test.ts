import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { proxy } from "./proxy";

vi.mock("./lib/constants/backend-url", () => ({
  BACKEND_URL: "http://backend.test",
}));

const HOUR_S = 60 * 60;

const token = (expiresInSeconds: number) => {
  const payload = { exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
};

const request = (path: string, cookies: Record<string, string>) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: {
      Cookie: Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    },
  });

const expiredSession = { access_token: token(-60), refresh_token: "refresh" };
const liveSession = { access_token: token(HOUR_S), refresh_token: "refresh" };

/** What the backend answers, by path. */
const backendAnswers = (answers: Record<string, () => Response>) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const path = Object.keys(answers).find((key) => url.endsWith(key));
      return Promise.resolve(answers[path!]());
    }),
  );

const refreshed = () =>
  new Response(null, {
    status: 200,
    headers: [
      ["Set-Cookie", "access_token=new-access; Path=/; HttpOnly"],
      ["Set-Cookie", "refresh_token=new-refresh; Path=/; HttpOnly"],
    ],
  });

const setCookies = (response: Response) => response.headers.getSetCookie();
const deletes = (cookies: string[], name: string) =>
  cookies.some((cookie) => cookie.startsWith(`${name}=;`));

describe("proxy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the new cookies when a sign-in page sends a refreshed person home", async () => {
    backendAnswers({ "/auth/refresh": refreshed });

    const response = await proxy(request("/login", expiredSession));

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(setCookies(response)).toEqual([
      "access_token=new-access; Path=/; HttpOnly",
      "refresh_token=new-refresh; Path=/; HttpOnly",
    ]);
  });

  it("deletes the cookies on the way to sign-in when the refresh is refused", async () => {
    backendAnswers({
      "/auth/refresh": () => new Response(null, { status: 401 }),
    });

    const response = await proxy(request("/timesheet", expiredSession));

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
    expect(deletes(setCookies(response), "access_token")).toBe(true);
    expect(deletes(setCookies(response), "refresh_token")).toBe(true);
  });

  it.each([
    ["a throttled refresh", () => new Response(null, { status: 429 })],
    ["a backend that is asleep", () => new Response(null, { status: 502 })],
    [
      "a backend it cannot reach",
      () => {
        throw new TypeError("fetch failed");
      },
    ],
  ])("keeps the session after %s", async (_, answer) => {
    backendAnswers({ "/auth/refresh": answer });

    const response = await proxy(request("/timesheet", expiredSession));

    expect(response.headers.get("location")).toBeNull();
    expect(setCookies(response)).toEqual([]);
  });

  it("lets a person whose session is gone reach sign-in, without the old cookies", async () => {
    backendAnswers({ "/users/me": () => new Response(null, { status: 401 }) });

    const response = await proxy(request("/login", liveSession));

    expect(response.headers.get("location")).toBeNull();
    expect(deletes(setCookies(response), "access_token")).toBe(true);
  });

  it("still sends a signed-in person home from a sign-in page", async () => {
    backendAnswers({ "/users/me": () => new Response("{}", { status: 200 }) });

    const response = await proxy(request("/login", liveSession));

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
