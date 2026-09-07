import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Pamięć sesji studyjnej (w pamięci RAM procesu Vercel z synchronizacją stanu)
interface StudioSession {
  sessionId: string;
  activeSpeaker: string;
  activeParty?: string;
  guests: Array<{ name: string; party?: string; role?: string }>;
  messages: Array<{
    id: string;
    text: string;
    sender: "warroom" | "system";
    timestamp: string;
    dismissed?: boolean;
  }>;
  lastUpdated: string;
}

// Globalny magazyn sesji
const activeSessions: Map<string, StudioSession> = new Map();

function getOrCreateSession(sessionId: string): StudioSession {
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      sessionId,
      activeSpeaker: "Główny oponent",
      activeParty: "Opozycja",
      guests: [
        { name: "Główny oponent", party: "Rywal", role: "Polityk" },
        { name: "Prowadzący / Dziennikarz", party: "Studio", role: "Prowadzący" },
      ],
      messages: [],
      lastUpdated: new Date().toISOString(),
    });
  }
  return activeSessions.get(sessionId)!;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId") || "main_studio_session";
    const session = getOrCreateSession(sessionId);

    return NextResponse.json(session);
  } catch (err: any) {
    console.error("Błąd pobierania sesji kokpitu:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId || "main_studio_session";
    const session = getOrCreateSession(sessionId);

    // 1. Zmiana aktywnego mówcy
    if (body.action === "set_speaker") {
      if (body.speaker) {
        session.activeSpeaker = body.speaker;
        session.activeParty = body.party || "";
        session.lastUpdated = new Date().toISOString();
      }
    }

    // 2. Dodanie gościa do panelu
    if (body.action === "add_guest") {
      if (body.name && !session.guests.some((g) => g.name.toLowerCase() === body.name.toLowerCase())) {
        session.guests.push({
          name: body.name.trim(),
          party: body.party?.trim() || "",
          role: body.role?.trim() || "Polityk",
        });
        session.lastUpdated = new Date().toISOString();
      }
    }

    // 3. Wysłanie pilnej notatki ze sztabu (War Room -> iPad)
    if (body.action === "send_message") {
      if (body.text) {
        const newMsg = {
          id: crypto.randomUUID(),
          text: body.text.trim(),
          sender: "warroom" as const,
          timestamp: new Date().toISOString(),
          dismissed: false,
        };
        // Utrzymujemy maksymalnie 5 najnowszych notatek
        session.messages = [newMsg, ...session.messages.slice(0, 4)];
        session.lastUpdated = new Date().toISOString();
      }
    }

    // 4. Odznaczenie / ukrycie wiadomości sztabowej
    if (body.action === "dismiss_message") {
      if (body.messageId) {
        session.messages = session.messages.filter((m) => m.id !== body.messageId);
        session.lastUpdated = new Date().toISOString();
      }
    }

    // 5. Pełna aktualizacja listy gości
    if (body.action === "update_guests" && Array.isArray(body.guests)) {
      session.guests = body.guests;
      session.lastUpdated = new Date().toISOString();
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error("Błąd aktualizacji sesji kokpitu:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
