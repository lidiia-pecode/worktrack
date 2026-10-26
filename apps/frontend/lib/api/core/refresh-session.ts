/** The refresh route's status, or null when it could not be reached. */
export async function refreshSession(): Promise<number | null> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.status;
  } catch {
    return null;
  }
}
