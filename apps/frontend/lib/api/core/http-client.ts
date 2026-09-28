"use client";

import { handleSessionExpired } from "./handle-session-expired";
import { parseJsonSafe } from "./parse-json-safe";
import { refreshSession } from "./refresh-session";

let refreshPromise: Promise<boolean> | null = null;

const readError = (res: Response) => res.json().catch(() => ({}));

export async function basicClient<T>(
  request: () => Promise<Response>,
): Promise<T> {
  const res = await request();
  if (res.ok) return parseJsonSafe<T>(res);
  throw await readError(res);
}

/** The OK response, after refreshing the session once if it had expired. */
export async function authorizedFetch(
  request: () => Promise<Response>,
): Promise<Response> {
  const res = await request();

  if (res.ok) return res;

  if (res.status !== 401) {
    throw await readError(res);
  }

  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  const refreshed = await refreshPromise;

  if (!refreshed) {
    handleSessionExpired();
    throw new Error("SESSION_EXPIRED");
  }

  const retry = await request();

  if (retry.ok) return retry;

  if (retry.status === 401) {
    handleSessionExpired();
    throw new Error("SESSION_EXPIRED");
  }

  throw await readError(retry);
}

export async function apiClient<T>(
  request: () => Promise<Response>,
): Promise<T> {
  return parseJsonSafe<T>(await authorizedFetch(request));
}
