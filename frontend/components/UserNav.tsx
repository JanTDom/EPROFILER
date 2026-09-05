"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield, KeyRound, CheckCircle2 } from "lucide-react";
import { getClientProfile, UserProfileId } from "@/lib/profile";

export const UserNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileId>("profile_main");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setProfile(getClientProfile());
  }, [pathname]);

  // Nie wyświetlaj paska użytkownika na ekranie logowania
  if (pathname === "/login") {
    return null;
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      // Przekieruj do ekranu logowania z czystą sesją
      window.location.href = "/login";
    }
  };

  const isCustom = profile === "profile_custom";

  return (
    <div className="flex items-center gap-2.5 font-mono text-xs">
      {/* Wskaźnik aktywnego profilu */}
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
          isCustom
            ? "bg-purple-950/60 border-purple-700/60 text-purple-300"
            : "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
        }`}
        title={
          isCustom
            ? "Zalogowano do Profilu Niezależnego (własny klucz API)"
            : "Zalogowano do Profilu Głównego"
        }
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isCustom ? "bg-purple-400" : "bg-emerald-400"
          } animate-pulse`}
        />
        <span className="font-bold text-[11px] hidden md:inline">
          {isCustom ? "PROFIL NIEZALEŻNY" : "PROFIL GŁÓWNY"}
        </span>
      </div>

      {/* Przycisk wylogowania */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-slate-700/80 hover:border-red-500/50 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
        title="Wyloguj się z bieżącego profilu"
      >
        {loggingOut ? (
          <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span className="text-[11px]">Wyloguj</span>
      </button>
    </div>
  );
};
