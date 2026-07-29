"use client";

import { handleSessionExpired } from "./handle-session-expired";
import { parseJsonSafe } from "./parse-json-safe";
import { refreshSession } from "./refresh-session";

let refreshPromise: Promise<boolean> | null = null;

export async function basicClient<T>(
  request: () => Promise<Response>,
): Promise<T> {
  const res = await request();
  if (res.ok) return parseJsonSafe<T>(res);
  const errorData = await res.json().catch(() => ({}));
  throw errorData;
}

export async function apiClient<T>(
  request: () => Promise<Response>,
): Promise<T> {
  const res = await request();

  if (res.ok) {
    return parseJsonSafe<T>(res);
  }

  if (res.status !== 401) {
    const errorData = await res.json().catch(() => ({}));
    throw errorData;
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

  if (retry.ok) {
    return parseJsonSafe<T>(retry);
  }

  if (retry.status === 401) {
    handleSessionExpired();
    throw new Error("SESSION_EXPIRED");
  }

  const errorData = await retry.json().catch(() => ({}));
  throw errorData;
}
