import { BACKEND_URL } from "@/lib/constants/backend-url";
import { getCookieHeader } from "./cookie-helper";

export async function refreshSession() {
  const cookieHeader = await getCookieHeader();

  return fetch(`${BACKEND_URL}/auth/refresh`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });
}
