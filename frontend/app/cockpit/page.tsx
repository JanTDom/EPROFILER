"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Radio, 
  Mic, 
  MicOff, 
  Volume2, 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2, 
  Clock, 
  RefreshCw, 
  Users, 
  Plus, 
  X, 
  Check, 
  Sparkles, 
  Target, 
  Swords, 
  ArrowLeft,
  ChevronRight,
  HelpCircle
} from "lucide-react";

interface StudioGuest {
  name: string;
  party?: string;
  role?: string;
}

interface TacticalAlert {
  id: string;
  typ: "wtopa" | "emocje" | "riposta" | "pulapka";
  tytul: string;
  cytat_oponenta?: string;
  amunicja: string;
  timestamp: string;
  speaker: string;
  dismissed?: boolean;
}

interface WarroomMessage {
  id: string;
  text: string;
  sender: "warroom" | "system";
  timestamp: string;
  dismissed?: boolean;
}

function StudioCockpitContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "warroom" ? "warroom" : "studio";
  const recordingId = searchParams.get("recordingId");

  // Rola użytkownika: studio (iPad na stole) vs warroom (laptop/telefon sztabowca)
  const [activeRole, setActiveRole] = useState<"studio" | "warroom">(initialRole);

  // Stan czarnego ekranu (Panic Button / Blackout)
  const [isBlackout, setIsBlackout] = useState(false);

  // Stan pełnego ekranu
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Stan WakeLock (zapobieganie wygaszaniu ekranu)
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Stoper studyjny
  const [studioSeconds, setStudioSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Lista gości w studiu i aktywny oponent
  const [guests, setGuests] = useState<StudioGuest[]>([
    { name: "Sławomir Mentzen", party: "Konfederacja", role: "Poseł" },
    { name: "Tobiasz Bocheński", party: "PiS", role: "Europoseł" },
    { name: "Krzysztof Śmiszek", party: "Lewica", role: "Europoseł" },
    { name: "Bogdan Rymanowski", party: "Studio", role: "Prowadzący" },
  ]);
  const [activeSpeaker, setActiveSpeaker] = useState<string>("Sławomir Mentzen");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestParty, setNewGuestParty] = useState("");

  // Sugestia zmiany mówcy wykryta przez AI ze słów prowadzącego
  const [suggestedSpeaker, setSuggestedSpeaker] = useState<string | null>(null);

  // Wiadomości z War-Roomu (prompter sztabowy)
  const [warroomMessages, setWarroomMessages] = useState<WarroomMessage[]>([]);
  const [outgoingNote, setOutgoingNote] = useState("");

  // Rozpoznawanie mowy na żywo (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recentSpeechHistory, setRecentSpeechHistory] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const speechBufferRef = useRef<string>("");
  const analyzeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Karty taktyczne (Heads-Up Display)
  const [alerts, setAlerts] = useState<TacticalAlert[]>([
    {
      id: "demo-1",
      typ: "wtopa",
      tytul: "SPRZECZNOŚĆ W GŁOSOWANIACH",
      cytat_oponenta: "Nigdy nie popieraliśmy podwyższania obciążeń dla małych firm...",
      amunicja: "Złap go: „A w marcu 2023 osobiście głosował Pan ZA tą ustawą!”",
      timestamp: "14:12",
      speaker: "Sławomir Mentzen",
    },
    {
      id: "demo-2",
      typ: "emocje",
      tytul: "TRAFIONY W CZUŁY PUNKT (NERWY)",
      cytat_oponenta: "To są insynuacje mediów, ja nie zamierzam się z tego tłumaczyć...",
      amunicja: "Dociśnij go: „Dlaczego unika Pan odpowiedzi o konkretną kwotę dotacji?”",
      timestamp: "14:13",
      speaker: "Tobiasz Bocheński",
    },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 1. Inicjalizacja Screen Wake Lock (ochrona przed wygaszeniem)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && !wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          setWakeLockActive(true);
          wakeLockRef.current.addEventListener("release", () => {
            setWakeLockActive(false);
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn("WakeLock request failed:", err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // 2. Stoper studyjny
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setStudioSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // 3. Synchronizacja sesji z serwerem (polling co 2 sekundy dla War-Roomu i iPada)
  const pollSession = useCallback(async () => {
    try {
      const res = await fetch("/api/cockpit/session?sessionId=main_studio_session", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.guests && data.guests.length > 0) {
          setGuests(data.guests);
        }
        if (data.activeSpeaker && data.activeSpeaker !== activeSpeaker) {
          setActiveSpeaker(data.activeSpeaker);
        }
        if (Array.isArray(data.messages)) {
          setWarroomMessages(data.messages);
        }
      }
    } catch (e) {
      // Ciche ignorowanie błędów sieci w tle
    }
  }, [activeSpeaker]);

  useEffect(() => {
    pollSession();
    const interval = setInterval(pollSession, 2000);
    return () => clearInterval(interval);
  }, [pollSession]);

  // 4. Analiza rozpoznanego tekstu oponenta przez AI
  const triggerAiAnalysis = async (chunkText: string, currentSpeaker: string) => {
    if (!chunkText || chunkText.trim().length < 10) return;

    setIsAnalyzing(true);
    try {
      const activeGuest = guests.find((g) => g.name === currentSpeaker);
      const res = await fetch("/api/cockpit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript_chunk: chunkText,
          target_speaker: currentSpeaker,
          speaker_party: activeGuest?.party || "",
          studio_guests: guests,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.alerts) && data.alerts.length > 0) {
          const nowStr = new Date().toLocaleTimeString("pl-PL", { minute: "2-digit", second: "2-digit" });
          const newAlerts: TacticalAlert[] = data.alerts.map((a: any) => ({
            id: crypto.randomUUID(),
            typ: a.typ || "riposta",
            tytul: a.tytul || "RIPOSTA SZTABOWA",
            cytat_oponenta: a.cytat_oponenta || chunkText.slice(0, 100),
            amunicja: a.amunicja,
            timestamp: nowStr,
            speaker: currentSpeaker,
          }));

          setAlerts((prev) => [...newAlerts, ...prev.slice(0, 8)]);
        }

        if (data.sugerowany_nowy_mowca) {
          setSuggestedSpeaker(data.sugerowany_nowy_mowca);
        }
      }
    } catch (err) {
      console.warn("Błąd analizy live:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 5. Obsługa Web Speech API w przeglądarce (Safari / Chrome na iPadzie)
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Twoja przeglądarka nie obsługuje SpeechRecognition. Użyj Safari lub Chrome na iPadzie.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "pl-PL";

      recognition.onstart = () => {
        setIsListening(true);
        setIsTimerRunning(true);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += trans + " ";
          } else {
            interim += trans;
          }
        }

        setInterimTranscript(interim);

        if (finalChunk.trim()) {
          speechBufferRef.current += " " + finalChunk.trim();
          setRecentSpeechHistory((prev) => [finalChunk.trim(), ...prev.slice(0, 5)]);

          // Zbieramy wypowiedź i po krótkiej pauzie (2.2 sekundy) wysyłamy do analizy AI
          if (analyzeDebounceTimer.current) clearTimeout(analyzeDebounceTimer.current);
          analyzeDebounceTimer.current = setTimeout(() => {
            const fullChunk = speechBufferRef.current.trim();
            if (fullChunk.length >= 12) {
              triggerAiAnalysis(fullChunk, activeSpeaker);
              speechBufferRef.current = "";
            }
          }, 2200);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart jeśli użytkownik nie wyłączył ręcznie
        if (isListening) {
          try {
            recognition.start();
          } catch (e) {}
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Nie udało się zainicjować rozpoznawania mowy:", err);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  // 6. Przełączanie aktywnego oponenta (lokalnie i na serwerze)
  const handleSelectSpeaker = async (name: string, party?: string) => {
    setActiveSpeaker(name);
    setSuggestedSpeaker(null);
    speechBufferRef.current = "";

    try {
      await fetch("/api/cockpit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_speaker",
          speaker: name,
          party: party || "",
        }),
      });
    } catch (e) {}
  };

  // 7. Dodawanie nowego gościa
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    const newG = {
      name: newGuestName.trim(),
      party: newGuestParty.trim() || undefined,
      role: "Polityk",
    };

    setGuests((prev) => [...prev, newG]);
    setNewGuestName("");
    setNewGuestParty("");

    try {
      await fetch("/api/cockpit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_guest",
          name: newG.name,
          party: newG.party,
          role: newG.role,
        }),
      });
    } catch (e) {}
  };

  // 8. Wysłanie notatki z War-Roomu
  const handleSendWarroomNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingNote.trim()) return;

    const noteText = outgoingNote.trim();
    setOutgoingNote("");

    try {
      await fetch("/api/cockpit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          text: noteText,
        }),
      });
      pollSession();
    } catch (e) {}
  };

  // 9. Odznaczenie / usunięcie alertu lub wiadomości
  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleDismissMessage = async (msgId: string) => {
    setWarroomMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await fetch("/api/cockpit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss_message",
          messageId: msgId,
        }),
      });
    } catch (e) {}
  };

  // 10. Pełny ekran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Formatowanie sekund do MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // TRYB AWARYJNY (PANIC BUTTON / BLACKOUT):
  // Jedno dotknięcie zamienia ekran w absolutną czerń, by chronić przed wścibską kamerą
  if (isBlackout) {
    return (
      <div 
        onClick={() => setIsBlackout(false)}
        className="fixed inset-0 bg-black z-[9999] cursor-pointer flex items-center justify-center select-none"
        title="Dotknij ekranu, aby przywrócić kokpit"
      >
        <span className="text-[10px] font-mono text-zinc-900 tracking-widest uppercase opacity-40">
          E-PROFILER STEALTH • DOTKNIJ ABY ODBLOKOWAĆ
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col justify-between selection:bg-rose-500 selection:text-white antialiased font-sans">
      {/* 1. GÓRNY PASEK STATUSU I TELEMETRII STUDYJNEJ */}
      <header className="px-4 py-2.5 bg-[#070d1d] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wyjdź</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            <span className="font-mono text-xs font-black tracking-wider text-white flex items-center gap-1.5">
              LIVE COCKPIT
              <span className="text-[10px] font-bold text-rose-300 bg-rose-950/90 border border-rose-500/50 px-2 py-0.2 rounded-full">
                {activeRole === "studio" ? "STUDIO (iPAD)" : "SZTAB (WAR-ROOM)"}
              </span>
            </span>
          </div>

          {/* Stoper studyjny */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-slate-700/80 rounded-lg font-mono text-xs text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatTime(studioSeconds)}</span>
          </div>
        </div>

        {/* Przyciski sterujące: Mikrofon, Pełny ekran, Blackout, Rola */}
        <div className="flex items-center gap-2">
          {/* Przycisk nasłuchu audio */}
          {activeRole === "studio" && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isListening
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 animate-bounce" />
                  <span>NASŁUCH AKTYWNY</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>WŁĄCZ MIKROFON</span>
                </>
              )}
            </button>
          )}

          {/* WakeLock status */}
          <span 
            className={`hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border ${
              wakeLockActive 
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
            title="Blokada wygaszania ekranu iPada"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            WAKE-LOCK
          </span>

          {/* Przełącznik ról: Studio iPad vs War-Room */}
          <div className="flex items-center p-0.5 bg-black/60 border border-slate-800 rounded-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveRole("studio")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                activeRole === "studio"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              iPad
            </button>
            <button
              type="button"
              onClick={() => setActiveRole("warroom")}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                activeRole === "warroom"
                  ? "bg-rose-500/25 text-rose-300 font-bold border border-rose-500/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sztab
            </button>
          </div>

          {/* Pełny ekran */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
            title="Pełny ekran (ukryj paski przeglądarki)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Panic button (Blackout) */}
          <button
            type="button"
            onClick={() => setIsBlackout(true)}
            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
            title="Awaryjny czarny ekran (Panic button) — dotknij, aby natychmiast ukryć interfejs przed okiem kamery"
          >
            <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Blackout</span>
          </button>
        </div>
      </header>

      {/* 2. GŁÓWNY PANEL WYBORU MÓWCY W STUDIU (PASEK RYWALI - 1 TAP SELECTION) */}
      <section className="px-4 py-3 bg-[#060b18] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 mr-1">
              <Target className="w-3.5 h-3.5 text-rose-400" />
              Cel:
            </span>

            {guests.map((g) => {
              const isTarget = g.name === activeSpeaker;
              return (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => handleSelectSpeaker(g.name, g.party)}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    isTarget
                      ? "bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] ring-2 ring-rose-400 scale-[1.02]"
                      : "bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:border-slate-500 hover:bg-slate-800"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isTarget ? "bg-white animate-ping" : "bg-slate-600"}`} />
                  <span className="text-sm">{g.name}</span>
                  {g.party && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${isTarget ? "bg-black/40 text-rose-100" : "bg-slate-800 text-slate-400"}`}>
                      {g.party}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sugestia AI jeśli prowadzący wywołał inne nazwisko */}
          {suggestedSpeaker && (
            <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/60 px-3 py-1.5 rounded-xl text-xs text-amber-200 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Głos ma: <strong>{suggestedSpeaker}</strong>?</span>
              <button
                type="button"
                onClick={() => handleSelectSpeaker(suggestedSpeaker)}
                className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded text-[10px] uppercase tracking-wider hover:bg-amber-400 transition-colors"
              >
                Przełącz
              </button>
              <button
                type="button"
                onClick={() => setSuggestedSpeaker(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. PROMPTER SZTABOWY — PILNE WIADOMOŚCI Z WAR-ROOMU */}
      {warroomMessages.length > 0 && (
        <section className="px-4 py-2 bg-gradient-to-r from-red-950/90 via-rose-950/80 to-amber-950/90 border-b border-rose-500/50">
          <div className="max-w-7xl mx-auto space-y-1.5">
            {warroomMessages.map((msg) => (
              <div 
                key={msg.id}
                className="flex items-center justify-between gap-3 bg-black/60 border border-rose-500/60 p-2.5 sm:p-3 rounded-xl shadow-lg animate-fade-in"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-300 shrink-0 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/40">
                    SZTAB (WAR-ROOM)
                  </span>
                  <p className="text-sm sm:text-base md:text-lg font-bold text-white truncate font-sans">
                    {msg.text}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismissMessage(msg.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                  title="Odznacz / przeczytane"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. GŁÓWNA PRZESTRZEŃ KOKPITU */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEWA KOLUMNA: STRUMIEŃ KART UDERZENIOWYCH (HUD) — 8 kolumn na desktopie / 12 na iPadzie */}
        <div className={`${activeRole === "warroom" ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-rose-400" />
                Bieżąca amunicja na rywala: <span className="text-white font-black">{activeSpeaker}</span>
              </span>
              {isAnalyzing && (
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> AI generuje kontrę...
                </span>
              )}
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              {alerts.length} alertów taktycznych
            </span>
          </div>

          {/* LISTA WIELKICH KART UDERZENIOWYCH DLA POLITYKA (CZYTELNE Z 60 CM KĄTEM OKA) */}
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3">
                <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-slate-300">
                  Czekam na wypowiedź oponenta w studiu...
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Włącz mikrofon lub uruchom nasłuch studyjny. Gdy {activeSpeaker} zacznie mówić, system w 2 sekundy wygeneruje gotową ripostę, wtopę i pytanie zamykające w pułapce.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isWtopa = alert.typ === "wtopa";
                const isEmocje = alert.typ === "emocje";
                const isPulapka = alert.typ === "pulapka";

                const borderColor = isWtopa
                  ? "border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.2)] bg-gradient-to-r from-rose-950/60 via-[#0a0f1d] to-[#0a0f1d]"
                  : isEmocje
                  ? "border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-gradient-to-r from-amber-950/60 via-[#0a0f1d] to-[#0a0f1d]"
                  : isPulapka
                  ? "border-blue-500/80 shadow-[0_0_30px_rgba(59,130,246,0.2)] bg-gradient-to-r from-blue-950/60 via-[#0a0f1d] to-[#0a0f1d]"
                  : "border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.2)] bg-gradient-to-r from-emerald-950/60 via-[#0a0f1d] to-[#0a0f1d]";

                const badgeBg = isWtopa
                  ? "bg-rose-950 text-rose-300 border-rose-500/60"
                  : isEmocje
                  ? "bg-amber-950 text-amber-300 border-amber-500/60"
                  : isPulapka
                  ? "bg-blue-950 text-blue-300 border-blue-500/60"
                  : "bg-emerald-950 text-emerald-300 border-emerald-500/60";

                return (
                  <div
                    key={alert.id}
                    className={`border rounded-2xl p-5 sm:p-6 transition-all relative overflow-hidden group ${borderColor}`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${badgeBg}`}>
                          {isWtopa ? "🔴 WTOPA / SPRZECZNOŚĆ" : isEmocje ? "🟡 NERWY / SŁABOŚĆ PSYCHICZNA" : isPulapka ? "🔵 PYTANIE-PUŁAPKA" : "🟢 GOTOWA KONTRA"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {alert.speaker} • {alert.timestamp}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDismissAlert(alert.id)}
                        className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-black/40 border border-slate-700/60 hover:border-slate-500 transition-colors flex items-center gap-1"
                        title="Wykorzystano / ukryj kartę"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Wykorzystane</span>
                      </button>
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight mb-2">
                      {alert.tytul}
                    </h2>

                    {alert.cytat_oponenta && (
                      <p className="text-xs sm:text-sm text-slate-400 italic mb-3 border-l-2 border-slate-600 pl-3 leading-relaxed">
                        „{alert.cytat_oponenta}”
                      </p>
                    )}

                    {/* WIELKA AMUNICJA (CZYTELNA Z ODDALI NA STOLE W STUDIU) */}
                    <div className="p-3.5 sm:p-4 bg-black/80 border border-slate-700/80 rounded-xl mt-3 shadow-inner">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 block mb-1">
                        POWIEDZ DO KAMERY / RIPOSTA:
                      </span>
                      <p className="text-base sm:text-xl md:text-2xl font-black text-white leading-snug font-sans">
                        {alert.amunicja}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PRAWA KOLUMNA: PANEL DLA SZTABOWCA (WAR-ROOM CO-PILOT) */}
        {activeRole === "warroom" && (
          <div className="lg:col-span-4 space-y-5 bg-[#070e20] border border-rose-500/40 p-5 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">
                Panel Sztabowy (War-Room)
              </h3>
            </div>

            {/* Wstrzykiwanie wiadomości na iPada polityka */}
            <form onSubmit={handleSendWarroomNote} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Wyślij pilną podpowiedź na iPada polityka:
              </label>
              <textarea
                rows={3}
                value={outgoingNote}
                onChange={(e) => setOutgoingNote(e.target.value)}
                placeholder="np. Zapytaj o wczorajszy artykuł w Onecie! Powiedz mu o 42 mld deficytu!"
                className="w-full p-3 bg-black/80 border border-rose-500/50 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 font-sans"
              />
              <button
                type="submit"
                disabled={!outgoingNote.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Wyślij na ekran iPada</span>
              </button>
            </form>

            {/* Zarządzanie gośćmi w studiu */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Goście w studiu ({guests.length}):
                </span>
              </div>

              <form onSubmit={handleAddGuest} className="flex gap-2">
                <input
                  type="text"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="Imię i nazwisko gościa"
                  className="flex-1 px-3 py-1.5 bg-black/60 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={newGuestParty}
                  onChange={(e) => setNewGuestParty(e.target.value)}
                  placeholder="Partia"
                  className="w-20 px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!newGuestName.trim()}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {guests.map((g) => (
                  <div 
                    key={g.name}
                    onClick={() => handleSelectSpeaker(g.name, g.party)}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      g.name === activeSpeaker 
                        ? "bg-rose-950/60 border-rose-500/60 text-white font-bold"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span>{g.name} {g.party ? `(${g.party})` : ""}</span>
                    {g.name === activeSpeaker && <span className="text-[10px] text-rose-400 uppercase font-mono">AKTYWNY</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Podgląd live rozpoznanego tekstu */}
            <div className="space-y-1.5 pt-3 border-t border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Strumień tekstu z mikrofonu na żywo:
              </span>
              <div className="p-3 bg-black/90 border border-slate-800 rounded-xl text-xs text-slate-300 max-h-32 overflow-y-auto font-mono leading-relaxed">
                {interimTranscript ? (
                  <span className="text-cyan-300">{interimTranscript}</span>
                ) : recentSpeechHistory.length > 0 ? (
                  recentSpeechHistory[0]
                ) : (
                  <span className="text-slate-600">Czekam na głos...</span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 5. DOLNY PASEK NASŁUCHU MIKROFONU (DLA iPADa) */}
      <footer className="px-4 py-2 bg-[#050914] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isListening ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
          <span>{isListening ? `Nasłuchiwanie oponenta: ${activeSpeaker}` : "Nasłuch wyłączony"}</span>
          {interimTranscript && (
            <span className="text-slate-300 max-w-sm truncate hidden md:inline">
              „{interimTranscript}”
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAlerts([])}
            className="hover:text-slate-300 transition-colors"
            title="Wyczyść alerty na ekranie"
          >
            Wyczyść ekran
          </button>
          <span>E-PROFILER Studio HUD v2026.1</span>
        </div>
      </footer>
    </div>
  );
}

export default function StudioCockpitPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#030712] text-slate-400 font-mono flex items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            <span>Ładowanie Kokpitu Studyjnego...</span>
          </div>
        </div>
      }
    >
      <StudioCockpitContent />
    </React.Suspense>
  );
}
