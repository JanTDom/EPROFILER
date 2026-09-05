"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Play,
  RotateCcw,
  Bot,
  User,
  ShieldAlert,
  HelpCircle,
  Video,
  FileText,
  Flame,
  Target,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ForensicChatProps {
  recordingId: string;
  politicianName?: string;
  onSeek: (seconds: number) => void;
}

const QUICK_PROMPTS = [
  {
    icon: Target,
    label: "Luki logiczne i uniki",
    prompt: "Wskaż najsłabsze uniki, luki logiczne i momenty, w których polityk uciekł od odpowiedzi. Podaj dokładne znaczniki czasu [MM:SS].",
  },
  {
    icon: HelpCircle,
    label: "Pytania dociskające na debatę",
    prompt: "Zaproponuj 3 bezlitosne pytania dociskające na debatę uderzające w sprzeczności w tym nagraniu, tak aby zamknąć drogę ucieczki.",
  },
  {
    icon: Flame,
    label: "Amunicja dla oponentów (Spot)",
    prompt: "Co sztab oponentów wytnie z tego wystąpienia do 15-sekundowego negatywnego spotu wyborczego? Wskaż kluczowe 'samobóje' z czasem [MM:SS].",
  },
  {
    icon: FileText,
    label: "Oświadczenie sztabowe",
    prompt: "Napisz gotowe, mocne oświadczenie sztabowe neutralizujące największe uchybienia z tego nagrania i przejmujące kontrolę nad narracją.",
  },
  {
    icon: ShieldAlert,
    label: "Wyciski behawioralne i stres",
    prompt: "W których minutach widać było najwyższy stres, grymasy zniecierpliwienia lub defensywną mowę ciała? Podaj czasy [MM:SS] i jak to zamaskować.",
  },
];

export const ForensicChat: React.FC<ForensicChatProps> = ({
  recordingId,
  politicianName,
  onSeek,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Witaj w Sztabowym Asystencie Śledczym E-PROFILER. Jestem podłączony do pełnego audytu behawioralnego i retorycznego tego nagrania${
        politicianName ? ` dotyczącego: **${politicianName}**` : ""
      }.\n\nMożesz zapytać mnie o luki logiczne, najsłabsze momenty, amunicję do spotów opozycji lub poprosić o gotowe riposty i pytania na debatę. Wszystkie momenty oznaczone jako **[MM:SS]** są klikalne i natychmiast przewijają odtwarzacz wideo do wskazanego fragmentu.`,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setError(null);
    setInput("");

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Przygotuj historię wiadomości (bez komunikatu powitalnego)
      const payloadMessages = newHistory
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`/api/recordings/${recordingId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `Błąd serwera (${res.status})`);
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Brak odpowiedzi od asystenta.",
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Błąd zapytania czatu:", err);
      setError(err.message || "Nie udało się uzyskać odpowiedzi od sztabowego AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: `Zresetowano wątek konwersacji. W czym mogę pomóc w analizie wystąpienia${
          politicianName ? ` polityka **${politicianName}**` : ""
        }?`,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setError(null);
  };

  // Funkcja parsująca tekst i zamieniająca znaczniki [MM:SS] lub [M:SS] na klikalne przyciski
  const renderMessageContent = (text: string) => {
    // Rozbijamy wg regexu dopasowującego [MM:SS]
    const timestampRegex = /\[(\d{1,2}):(\d{2})\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = timestampRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const fullMatch = match[0];
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const totalSeconds = minutes * 60 + seconds;

      // Dodaj tekst przed dopasowaniem
      if (matchIndex > lastIndex) {
        parts.push(renderFormattedSnippet(text.substring(lastIndex, matchIndex), `text-${lastIndex}`));
      }

      // Dodaj klikalny badge timestampu
      parts.push(
        <button
          key={`ts-${matchIndex}`}
          type="button"
          onClick={() => onSeek(totalSeconds)}
          title={`Skocz do ${fullMatch} w wideo`}
          className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-xs font-semibold hover:bg-cyan-500 hover:text-black hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>{fullMatch}</span>
        </button>
      );

      lastIndex = matchIndex + fullMatch.length;
    }

    // Dodaj resztę tekstu
    if (lastIndex < text.length) {
      parts.push(renderFormattedSnippet(text.substring(lastIndex), `text-${lastIndex}`));
    }

    return parts;
  };

  // Prosty renderer formatowania markdown (pogrubienia **bold**, punkty list)
  const renderFormattedSnippet = (snippet: string, keyPrefix: string) => {
    const lines = snippet.split("\n");
    return (
      <span key={keyPrefix}>
        {lines.map((line, lIdx) => {
          // Obsługa pogrubienia **tekst**
          const boldParts = line.split(/(\*\*.*?\*\*)/g);
          const formattedLine = boldParts.map((bp, bpIdx) => {
            if (bp.startsWith("**") && bp.endsWith("**")) {
              return (
                <strong key={`${keyPrefix}-l${lIdx}-b${bpIdx}`} className="text-white font-semibold">
                  {bp.slice(2, -2)}
                </strong>
              );
            }
            return bp;
          });

          return (
            <React.Fragment key={`${keyPrefix}-line-${lIdx}`}>
              {line.startsWith("- ") || line.startsWith("* ") ? (
                <span className="block pl-3 text-slate-300 my-0.5">
                  <span className="text-cyan-400 font-bold mr-1.5">•</span>
                  {formattedLine}
                </span>
              ) : (
                formattedLine
              )}
              {lIdx < lines.length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  return (
    <div className="bg-studio-card/80 border border-studio-border/90 rounded-2xl p-5 md:p-6 shadow-2xl backdrop-blur-xl flex flex-col h-[650px] relative overflow-hidden">
      {/* Nagłówek czatu */}
      <div className="flex items-center justify-between pb-4 border-b border-studio-border/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Sztabowy Czat AI z Nagraniem
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                FORENSIC INTERACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Kliknij dowolny znacznik czasu [MM:SS], aby natychmiast przewinąć odtwarzacz
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          title="Wyczyść historię konwersacji"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-700 transition-all text-xs flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Wyczyść wątek</span>
        </button>
      </div>

      {/* Szybkie prompty sztabowe (Chips) */}
      <div className="pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
        {QUICK_PROMPTS.map((qp, idx) => {
          const Icon = qp.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(qp.prompt)}
              disabled={loading}
              className="flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 transition-all active:scale-95 disabled:opacity-50"
            >
              <Icon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{qp.label}</span>
            </button>
          );
        })}
      </div>

      {/* Lista wiadomości */}
      <div className="flex-1 overflow-y-auto pr-2 py-3 space-y-4 font-sans text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((m) => {
          const isAssistant = m.role === "assistant";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
            >
              {isAssistant && (
                <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                  isAssistant
                    ? "bg-slate-900/90 border border-studio-border/90 text-slate-200"
                    : "bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium"
                }`}
              >
                <div className="text-[10px] text-slate-400/80 mb-1 flex items-center justify-between gap-4 font-mono">
                  <span>{isAssistant ? "E-PROFILER SZTAB AI" : "STRATEG / ANALITYK"}</span>
                  <span>{m.createdAt}</span>
                </div>
                <div className="leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30">
                  {renderMessageContent(m.content)}
                </div>
              </div>

              {!isAssistant && (
                <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl px-4 py-3 text-slate-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-xs text-cyan-300">
                Silnik AI dekonstruuje nagranie i weryfikuje znaczniki czasowe...
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pole wprowadzania wiadomości */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-3 border-t border-studio-border/70 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Zadaj pytanie sztabowe do tego nagrania (np. "Wskaż uniki w pierwszych 5 minutach")...`}
          disabled={loading}
          className="flex-1 bg-slate-900/90 border border-studio-border hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 font-mono outline-none transition-all"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-blue-600 text-black font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-cyan-500/20 active:scale-95 transition-all"
        >
          <span>Wyślij</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
