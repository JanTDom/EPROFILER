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

  response.cookies.set({ ...cookieOptions, name: 'eprofiler_auth' });
  response.cookies.set({ ...cookieOptions, name: 'eprofiler_profile', httpOnly: false });
  response.cookies.set({ ...cookieOptions, name: 'eprofiler_gemini_key' });

  return response;
}
