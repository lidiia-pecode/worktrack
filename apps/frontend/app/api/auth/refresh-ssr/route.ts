import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/app/api/api-consts';

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/projects';

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: 'POST',
    cache: 'no-store',
    headers: { Cookie: cookieHeader },
  });

  if (!refreshRes.ok) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const response = NextResponse.redirect(new URL(returnTo, req.url));

  refreshRes.headers.getSetCookie().forEach(raw => {
    const [nameValue] = raw.split(';');
    const eqIdx = nameValue.indexOf('=');
    const name = nameValue.slice(0, eqIdx).trim();
    const value = nameValue.slice(eqIdx + 1).trim();
    response.cookies.set(name, value, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
  });

  return response;
}
