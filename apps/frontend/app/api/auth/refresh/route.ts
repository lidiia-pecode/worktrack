import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/app/api/api-consts';

// export async function POST() {
//   const cookieStore = await cookies();
//   const cookieHeader = cookieStore
//     .getAll()
//     .map(c => `${c.name}=${c.value}`)
//     .join('; ');

//   const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
//     method: 'POST',
//     cache: 'no-store',
//     headers: { Cookie: cookieHeader },
//   });

//   if (!refreshRes.ok) {
//     return NextResponse.json({ success: false }, { status: 401 });
//   }

//   const response = NextResponse.json({ success: true });

//   refreshRes.headers.getSetCookie().forEach(raw => {
//     const [nameValue] = raw.split(';');
//     const eqIdx = nameValue.indexOf('=');
//     const name = nameValue.slice(0, eqIdx).trim();
//     const value = nameValue.slice(eqIdx + 1).trim();
//     response.cookies.set(name, value, {
//       httpOnly: true,
//       path: '/',
//       sameSite: 'lax',
//     });
//   });
//   return response;
// }

export async function POST() {
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
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  // ✅ ПРОСТО ПРОКИДАЄМО КУКИ
  refreshRes.headers.getSetCookie().forEach(cookie => {
    response.headers.append('Set-Cookie', cookie);
  });

  return response;
}
