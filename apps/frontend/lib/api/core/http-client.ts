"use client";

import { handleSessionExpired } from "./handle-session-expired";
import { parseJsonSafe } from "./parse-json-safe";
import { refreshSession } from "./refresh-session";

const UNAUTHORIZED = 401;
const SERVICE_UNAVAILABLE = 503;

let refreshPromise: Promise<number | null> | null = null;

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

  if (res.status !== UNAUTHORIZED) {
    throw await readError(res);
  }

  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  const refreshStatus = await refreshPromise;

  if (refreshStatus === UNAUTHORIZED) {
    handleSessionExpired();
    throw new Error("SESSION_EXPIRED");
  }

  // A throttled refresh or an unreachable backend is a failed request, not
  // an ended session: the person stays signed in and can try again.
  if (refreshStatus === null || refreshStatus >= 400) {
    throw {
      statusCode: refreshStatus ?? SERVICE_UNAVAILABLE,
      message: "Your session could not be renewed just now. Please try again.",
    };
  }

  const retry = await request();

  if (retry.ok) return retry;

  if (retry.status === UNAUTHORIZED) {
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
