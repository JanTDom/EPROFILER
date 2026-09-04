export type UserProfileId = 'profile_main' | 'profile_custom';

export function getClientProfile(): UserProfileId {
  if (typeof document === 'undefined') return 'profile_main';
  const match = document.cookie.match(/eprofiler_profile=([^;]+)/);
  if (match && match[1] === 'profile_custom') {
    return 'profile_custom';
  }
  return 'profile_main';
}

export function getClientCustomGeminiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('eprofiler_custom_gemini_key') || null;
}
