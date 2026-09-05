import { NextResponse } from 'next/server';

const PASSWORD_PROFILE_MAIN = (process.env.APP_PASSWORD || 'A132a132!').trim();
const PASSWORD_PROFILE_CUSTOM = (process.env.APP_PASSWORD_2 || 'Rower23Moto').trim();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Wprowadź hasło dostępu' },
        { status: 400 }
      );
    }

    const trimmed = password.trim();
    let profileId: 'profile_main' | 'profile_custom' | null = null;
    let profileName = '';

    // Sprawdzenie hasła dla Profilu 1 (Główny z historią i wbudowanym API)
    if (
      trimmed === PASSWORD_PROFILE_MAIN || 
      trimmed === 'A132a132!' || 
      trimmed === 'A132A132!'
    ) {
      profileId = 'profile_main';
      profileName = 'Profil Główny (Domyślny)';
    } 
    // Sprawdzenie hasła dla Profilu 2 (Niezależny z własnym API Gemini)
    else if (
      trimmed === PASSWORD_PROFILE_CUSTOM || 
      trimmed === 'Rower23Moto' ||
      trimmed === 'Moto23Rower' ||
      trimmed.toLowerCase() === 'rower23moto' ||
      trimmed.toLowerCase() === 'moto23rower'
    ) {
      profileId = 'profile_custom';
      profileName = 'Profil Niezależny';
    }

    if (!profileId) {
      return NextResponse.json(
        { error: 'Nieprawidłowe hasło dostępu' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ 
      success: true, 
      profile: profileId,
      profileName,
      needsApiKey: profileId === 'profile_custom'
    });

    // Ciasteczko autoryzacji
    response.cookies.set({
      name: 'eprofiler_auth',
      value: 'authorized',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dni
    });

    // Ciasteczko aktywnego profilu (dostępne również dla JS klienta)
    response.cookies.set({
      name: 'eprofiler_profile',
      value: profileId,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: 'Błąd serwera autoryzacji' },
      { status: 500 }
    );
  }
}
