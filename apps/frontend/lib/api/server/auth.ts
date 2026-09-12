import { redirect } from "next/navigation";

import { BACKEND_URL } from "@/lib/constants";
import { User } from "@/types";
import { hasManagerAccess } from "@/lib/utils/user";
import { getCookieHeader } from "./cookie-helper";

async function fetchCurrentUser() {
  const cookieHeader = await getCookieHeader();

  return fetch(`${BACKEND_URL}/users/me`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const res = await fetchCurrentUser();

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as User;
}

/**
 * Guard for pages only owners and managers may open. Anyone else is sent to
 * `/`, which routes employees on to their timesheet.
 */
export async function requireManagerAccess(): Promise<User> {
  const user = await getCurrentUser();

  if (!user || !hasManagerAccess(user.role)) {
    redirect("/");
  }

  return user;
}
