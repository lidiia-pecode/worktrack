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

export async function publicClient<T>(
  request: () => Promise<Response>,
): Promise<T> {
  const res = await request();
  if (res.ok) return parseJsonSafe<T>(res);
  const errorData = await res.json().catch(() => ({}));
  throw errorData;
}
