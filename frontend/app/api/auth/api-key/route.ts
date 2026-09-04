import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const key = cookieStore.get('eprofiler_gemini_key')?.value;
  const profile = cookieStore.get('eprofiler_profile')?.value || 'profile_main';

  return NextResponse.json({
    profile,
    hasCustomKey: Boolean(key && key.length > 5),
    maskedKey: key ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : null
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return NextResponse.json(
        { error: 'Wprowadź prawidłowy klucz Gemini API' },
        { status: 400 }
      );
    }

    const trimmedKey = apiKey.trim();
    const response = NextResponse.json({ 
      success: true, 
      message: 'Klucz Gemini API został pomyślnie powiązany z profilem.' 
    });

    response.cookies.set({
      name: 'eprofiler_gemini_key',
      value: trimmedKey,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60 days
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: 'Błąd podczas zapisywania klucza API' },
      { status: 500 }
    );
  }
}
