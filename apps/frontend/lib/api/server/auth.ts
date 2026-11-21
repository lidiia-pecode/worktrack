import { cache } from "react";
import { redirect } from "next/navigation";

import { BACKEND_URL } from "@/lib/constants/backend-url";
import { CurrentUser } from "@/types";
import { UserRole } from "@/types/enums";
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

/** Once per request: the layout and a page's access guard both ask. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const res = await fetchCurrentUser();

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as CurrentUser;
});

/**
 * Guard for pages only owners and managers may open. Anyone else is sent to
 * `/`, which routes employees on to their timesheet.
 */
export async function requireManagerAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user || !hasManagerAccess(user.role)) {
    redirect("/");
  }

  return user;
}

export async function requireOwnerAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user || user.role !== UserRole.OWNER) {
    redirect("/");
  }

  return user;
}
