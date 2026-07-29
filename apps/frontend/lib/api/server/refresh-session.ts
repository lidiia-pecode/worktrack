
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/lib/constants";

export async function refreshSession() {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(`${BACKEND_URL}/auth/refresh`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  });
}