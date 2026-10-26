import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleSessionExpired } from "./handle-session-expired";
import { authorizedFetch } from "./http-client";
import { refreshSession } from "./refresh-session";

vi.mock("./refresh-session", () => ({ refreshSession: vi.fn() }));
vi.mock("./handle-session-expired", () => ({ handleSessionExpired: vi.fn() }));

const expiredAccess = () =>
  Promise.resolve(new Response(null, { status: 401 }));

describe("authorizedFetch", () => {
  beforeEach(() => vi.mocked(handleSessionExpired).mockReset());

  it("ends the session when the refresh is refused", async () => {
    vi.mocked(refreshSession).mockResolvedValue(401);

    await expect(authorizedFetch(expiredAccess)).rejects.toThrow(
      "SESSION_EXPIRED",
    );
    expect(handleSessionExpired).toHaveBeenCalled();
  });

  it.each([
    ["a throttled refresh", 429, 429],
    ["a backend that is asleep", 502, 502],
    ["a refresh route it cannot reach", null, 503],
  ])(
    "keeps the session after %s, failing only the request",
    async (_, refreshStatus, statusCode) => {
      vi.mocked(refreshSession).mockResolvedValue(refreshStatus);

      await expect(authorizedFetch(expiredAccess)).rejects.toMatchObject({
        statusCode,
      });
      expect(handleSessionExpired).not.toHaveBeenCalled();
    },
  );

  it("retries the request once the session is refreshed", async () => {
    vi.mocked(refreshSession).mockResolvedValue(200);
    const request = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await expect(authorizedFetch(request)).resolves.toHaveProperty(
      "status",
      200,
    );
  });
});
