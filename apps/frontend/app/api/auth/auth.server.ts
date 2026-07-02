import { cookies } from 'next/headers';
import { BACKEND_URL } from '../api-consts';
import { redirect } from 'next/navigation';

async function fetchMe(cookieHeader: string) {
  return fetch(`${BACKEND_URL}/users/me`, {
    cache: 'no-store',
    headers: { Cookie: cookieHeader },
  });
}

export async function meServer(currentPath = '/projects') {
  const cookieStore = await cookies();

  const getCookieHeader = () =>
    cookieStore
      .getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

  const res = await fetchMe(getCookieHeader());

  if (res.ok) return res.json();

  if (res.status === 401) {
    redirect(`/api/auth/refresh-ssr?returnTo=${currentPath}`);
  }

  return null;
}

export async function meServerSoft() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch(`${BACKEND_URL}/users/me`, {
    cache: 'no-store',
    headers: { Cookie: cookieHeader },
  });

  if (!res.ok) return null;
  return res.json();
}
