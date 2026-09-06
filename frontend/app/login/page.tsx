'use client';

import React, { useState, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  ShieldAlert, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Terminal, 
  KeyRound,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Info
} from 'lucide-react';

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

      // Jeśli profil niezależny (Rower23Moto / Moto23Rower)
      if (data.profile === 'profile_custom') {
        // 1. Sprawdź najpierw w pamięci podręcznej przeglądarki (localStorage)
        const localKey = typeof window !== 'undefined' ? localStorage.getItem('eprofiler_custom_gemini_key') : null;
        if (localKey && localKey.trim().length > 10) {
          // Klucz istnieje — zsynchronizuj z sesją i zaloguj natychmiast bez ponownego pytania!
          await fetch('/api/auth/api-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: localKey.trim() }),
          }).catch(() => null);

          window.location.href = from;
          return;
        }

        // 2. Sprawdź czy użytkownik ma już zapisany klucz w ciasteczku serwera
        const keyRes = await fetch('/api/auth/api-key', { signal: AbortSignal.timeout(3000) }).catch(() => null);
        const keyData = keyRes ? await keyRes.json().catch(() => null) : null;

        if (keyData?.hasCustomKey) {
          // Klucz jest już na stałe skonfigurowany, przejdź od razu
          window.location.href = from;
          return;
        }

        // 3. Pierwsze logowanie lub brak klucza — otwórz okienko z instrukcją krok po kroku
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
    <div className={`relative bg-[#0d121f]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl w-full ${step === 'api_key' ? 'max-w-xl' : 'max-w-md'} transition-all duration-300`}>
      {/* Header with Logo */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.25)] border border-cyan-500/30">
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
            : 'PODŁĄCZ WŁASNY BEZPŁATNY KLUCZ API GOOGLE'}
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
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2 cursor-pointer"
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
        /* KROK 2: JEDNORAZOWE OKIENKO Z INSTRUKCJĄ DLA LAIKA (FOOLPROOF HELP) */
        <form onSubmit={handleApiKeySubmit} className="space-y-4 animate-fadeIn">
          <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-xs text-purple-200 font-mono space-y-1">
            <div className="font-bold text-purple-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>PROFIL NIEZALEŻNY AKTYWNY</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Ten profil ma własną, odizolowaną pamięć nagrań i korzysta wyłącznie z Twojego prywatnego klucza API Google.
            </p>
          </div>

          {/* Przewodnik krok po kroku */}
          <div className="p-4 bg-[#0a0f1d] border border-cyan-500/40 rounded-xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Jak pobrać klucz w Google AI Studio?</span>
              </span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 border border-emerald-600/40 rounded">
                Darmowe lub płatne
              </span>
            </div>

            {/* Dwie opcje korzystania z API */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px]">
                <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Dwie opcje API do wyboru w Google AI Studio:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
                <div className="p-2.5 bg-[#070b14] border border-emerald-500/30 rounded-lg space-y-1">
                  <strong className="text-emerald-400 block font-mono text-[10px] uppercase">1. Opcja darmowa (bez karty)</strong>
                  <p className="text-slate-400 text-[10px] leading-normal">
                    100% bezpłatna, 15 zapytań/min, brak opłat i karty. Wystarcza do bieżących analiz wywiadów.
                  </p>
                </div>
                <div className="p-2.5 bg-[#070b14] border border-cyan-500/30 rounded-lg space-y-1">
                  <strong className="text-cyan-400 block font-mono text-[10px] uppercase">2. Opcja płatna (Pay-as-you-go)</strong>
                  <p className="text-slate-400 text-[10px] leading-normal">
                    Z kartą w Google Cloud: grosze za analizę, brak limitów i 100% gwarancji poufności danych.
                  </p>
                </div>
              </div>
            </div>

            <ol className="text-xs text-slate-300 space-y-2.5 list-none">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                <div className="flex-1">
                  <span>Kliknij poniższy przycisk, aby przejść do panelu kluczy:</span>
                  <div className="mt-1.5">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer"
                    >
                      <span>Otwórz Google AI Studio</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    (Zaloguj się dowolnym kontem Google / Gmail).
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                <div>
                  <span>Na otwartej stronie kliknij niebieski przycisk: </span>
                  <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">"Create API key"</strong>
                  <span className="text-slate-400 text-[11px]"> (lub "Utwórz klucz API").</span>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
                <div>
                  <span>W okienku, które wyskoczy, wybierz typ projektu:</span>
                  <div className="mt-1 p-2 bg-slate-900 border border-slate-800 rounded text-cyan-300 font-mono text-[11px] space-y-1">
                    <div>👉 <strong>Dla opcji darmowej:</strong> wybierz <em>"Create API key in new project"</em> (bez karty).</div>
                    <div>👉 <strong>Dla opcji płatnej:</strong> wskaż projekt z Google Cloud Billing.</div>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">4</span>
                <div>
                  <span>Kliknij <strong>"Copy"</strong> przy wygenerowanym kluczu, wróć tutaj i wklej go w poniższe pole.</span>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Twój klucz ma postać: <code>AIzaSy...</code> (ok. 39 znaków).
                  </p>
                </div>
              </li>
            </ol>

            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Gwarancja: Klucz zostanie trwale zapamiętany na tym urządzeniu.</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-2">
              WKLEJ TUTAJ SWÓJ KLUCZ API GOOGLE
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <KeyRound className="w-4 h-4 text-purple-400" />
              </div>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                required
                autoFocus
                className="w-full pl-10 pr-10 py-3 bg-[#070a11] border border-purple-800/80 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Zapisywanie klucza na stałe...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Zapisz klucz na stałe i wejdź do studia</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('password');
                setError('');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1 font-mono cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Wróć do logowania innym hasłem</span>
            </button>
          </div>
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
    <div className="flex-1 min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-xl flex flex-col items-center">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <Suspense fallback={<div className="text-cyan-400 font-mono text-center p-8">Ładowanie interfejsu autoryzacji...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
