'use client';

import { useAuthStore } from '@/stores/authStore';
import { QueryClient } from '@tanstack/react-query';

let refreshPromise: Promise<boolean> | null = null;

// helper
async function parseJsonSafe<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T;

  const text = await res.text();

  if (!text) return null as T;

  try {
    return JSON.parse(text);
  } catch {
    return null as T;
  }
}

async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runWithRefresh<T>(
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
    logoutUser();
    throw new Error('SESSION_EXPIRED');
  }

  const retry = await request();

  if (retry.ok) {
    return parseJsonSafe<T>(retry);
  }

  if (retry.status === 401) {
    logoutUser();
    throw new Error('SESSION_EXPIRED');
  }

  const errorData = await retry.json().catch(() => ({}));
  throw errorData;
}

// function logoutUser() {
//   if (typeof window !== 'undefined') {
//     window.location.href = '/';
//   }
// }

// let isRedirecting = false;

// export function logoutUser() {
//   if (typeof window === 'undefined' || isRedirecting) return;

//   const queryClient = new QueryClient();

//   isRedirecting = true;

//   useAuthStore.getState().logout();
//   queryClient.clear();

//   window.location.href = '/login?session=expired';
// }
export function logoutUser() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/') return; // ← вже на home, стопаємось
  if (sessionStorage.getItem('redirecting')) return;

  sessionStorage.setItem('redirecting', '1');
  useAuthStore.getState().logout();

  window.location.href = '/'; // ← або '/login' якщо створиш сторінку
}
