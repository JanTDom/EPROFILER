import { NextResponse } from 'next/server';

const REQUIRED_PASSWORD = process.env.APP_PASSWORD || 'A132a132!';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password !== REQUIRED_PASSWORD) {
      return NextResponse.json(
        { error: 'Nieprawidłowe hasło dostępu' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'eprofiler_auth',
      value: 'authorized',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: 'Błąd serwera autoryzacji' },
      { status: 500 }
    );
  }
}
