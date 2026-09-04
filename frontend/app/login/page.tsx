'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ShieldAlert, ArrowRight, Eye, EyeOff, Terminal, KeyRound } from 'lucide-react';

function LoginForm() {
  const [step, setStep] = useState<'password' | 'api_key'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Nieprawidłowe hasło dostępu');
        setLoading(false);
        return;
      }

      // Jeśli profil niezależny (Rower23Moto)
      if (data.profile === 'profile_custom') {
        // Sprawdź czy użytkownik ma już zapisany klucz w ciasteczku/localStorage
        const keyRes = await fetch('/api/auth/api-key', { signal: AbortSignal.timeout(3000) }).catch(() => null);
        const keyData = keyRes ? await keyRes.json().catch(() => null) : null;

        if (keyData?.hasCustomKey) {
          // Klucz jest już skonfigurowany, przejdź od razu
          window.location.href = from;
          return;
        }

        // Brak klucza — otwórz jednorazowe okienko do wpisania własnego API Gemini
        setLoading(false);
        setStep('api_key');
        return;
      }

      // Profil główny (A132a132!) — natychmiastowe przejście
      window.location.href = from;
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setError('Przekroczono czas oczekiwania serwera. Spróbuj ponownie.');
      } else {
        setError('Wystąpił błąd połączenia z serwerem autoryzacji');
      }
      setLoading(false);
    }
  };

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Nie udało się zapisać klucza API');
        setLoading(false);
        return;
      }

      // Zapisz klucz również lokalnie
      if (typeof window !== 'undefined') {
        localStorage.setItem('eprofiler_custom_gemini_key', geminiApiKey.trim());
      }

      window.location.href = from;
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        setError('Przekroczono czas oczekiwania serwera. Spróbuj ponownie.');
      } else {
        setError('Błąd zapisu klucza API');
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-[#0d121f]/90 border border-slate-800/90 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl w-full max-w-md">
      {/* Header with Logo */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative w-24 h-24 mb-4 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.25)] border border-cyan-500/30">
          <Image
            src="/logo.png"
            alt="PROFILER Intelligence System"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 font-mono text-[10px] uppercase tracking-wider mb-2">
          <Terminal className="w-3 h-3" />
          <span>
            {step === 'password' ? 'Dostęp chroniony // Forensic Guard' : 'Konfiguracja Silnika // Profil Niezależny'}
          </span>
        </div>

        <h1 className="text-2xl font-black font-mono tracking-wider text-white">
          E-PROFILER
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          {step === 'password'
            ? 'MULTIMODAL BEHAVIORAL INTELLIGENCE SYSTEM'
            : 'PODŁĄCZ WŁASNY KLUCZ API DLA TEGO PROFILU'}
        </p>
      </div>

      {step === 'password' ? (
        /* KROK 1: WPISANIE HASŁA */
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-2">
              HASŁO DOSTĘPOWE DO SYSTEMU
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4 text-cyan-500/70" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wprowadź hasło autoryzacyjne..."
                required
                autoFocus
                className="w-full pl-10 pr-10 py-3 bg-[#070a11] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-2">
              Hasło określa profil: Główny (wbudowane API) lub Niezależny (własne API).
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs font-mono animate-shake">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Weryfikacja tożsamości...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Autoryzuj wejście</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* KROK 2: JEDNORAZOWE OKIENKO NA WŁASNY KLUCZ DLA PROFILU 2 */
        <form onSubmit={handleApiKeySubmit} className="space-y-5 animate-fadeIn">
          <div className="p-3.5 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-200 font-mono space-y-1">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              PROFIL NIEZALEŻNY AKTYWNY
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Ten profil ma własną, odizolowaną pamięć nagrań i korzysta wyłącznie z Twojego prywatnego klucza API.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-2">
              TWÓJ PRYWATNY KLUCZ API
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4 text-purple-400" />
              </div>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Wklej klucz: AIzaSy..."
                required
                autoFocus
                className="w-full pl-10 pr-10 py-3 bg-[#070a11] border border-purple-800/60 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1.5">
              Klucz zostanie bezpiecznie przypisany do Twojej sesji w przeglądarce.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs font-mono">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !geminiApiKey}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Zapisywanie klucza...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Zapisz klucz i wejdź do studia</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer Clearance */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 text-center space-y-1.5">
        <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
          RESTRICTED ACCESS • LEVEL 4 CONFIDENTIAL
        </p>
        <p className="text-[11px] text-slate-400 font-mono">
          © Copyright by{" "}
          <a
            href="https://multinewsroom.pl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
          >
            Multinewsroom (multinewsroom.pl)
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <Suspense fallback={<div className="text-cyan-400 font-mono text-center p-8">Ładowanie interfejsu autoryzacji...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
