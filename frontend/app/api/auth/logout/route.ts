import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  const cookieOptions = {
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  // Wylogowanie sesji i profilu — zachowujemy zapamiętany klucz API w ciasteczku/localStorage!
  response.cookies.set({ ...cookieOptions, name: 'eprofiler_auth' });
  response.cookies.set({ ...cookieOptions, name: 'eprofiler_profile', httpOnly: false });

  return response;
}
