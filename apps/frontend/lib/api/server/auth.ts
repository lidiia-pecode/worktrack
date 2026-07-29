import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BACKEND_URL } from "@/lib/constants";
import { User } from "@/types";

async function fetchCurrentUser() {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(`${BACKEND_URL}/users/me`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });
}

export async function getCurrentUser(returnTo: string) {
  const res = await fetchCurrentUser();

  if (res.ok) {
    return (await res.json()) as User;
  }

  if (res.status === 401) {
    redirect(
      `/api/auth/refresh-redirect?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  return null;
}

export async function getCurrentUserOrNull() {
  const res = await fetchCurrentUser();

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as User;
}
