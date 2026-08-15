import { BACKEND_URL } from "@/lib/constants";
import { User } from "@/types";
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
