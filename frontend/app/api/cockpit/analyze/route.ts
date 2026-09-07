import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      transcript_chunk,
      target_speaker = "Badany oponent",
      speaker_party = "",
      dossier,
      studio_guests = [],
    } = body;

    if (!transcript_chunk || typeof transcript_chunk !== "string" || transcript_chunk.trim().length < 8) {
      return NextResponse.json({ alerts: [], sugerowany_nowy_mowca: null });
    }

    // Klucz API z nagłówka, ciasteczka lub zmiennej środowiskowej
    const cookieStore = await cookies();
    const customKeyFromCookie = cookieStore.get("eprofiler_gemini_key")?.value;
    const headerKey = request.headers.get("x-gemini-api-key");
    const activeApiKey = headerKey || customKeyFromCookie || SYSTEM_GEMINI_KEY;

    if (!activeApiKey) {
      return NextResponse.json(
        { error: "Brak skonfigurowanego klucza API Gemini." },
        { status: 400 }
      );
    }

    // Przygotowanie listy gości dla detekcji zmiany mówcy
    const guestsListStr = Array.isArray(studio_guests) && studio_guests.length > 0
      ? studio_guests.map((g: any) => `${g.name} (${g.party || "gość"})`).join(", ")
      : "Brak zdefiniowanej listy gości";

    const prompt = `Jesteś bezwzględnym, elitarnym analitykiem sztabowym i spin doktorem pracującym w trybie LIVE CO-PILOT dla naszego polityka siedzącego w studiu telewizyjnym na żywo.
Nasz polityk ma przed sobą iPada i ma DOKŁADNIE 1 SEKUNDĘ na spojrzenie kątem oka na ekran.

W studiu znajdują się następujące osoby:
${guestsListStr}

AKTYWNIE NAMIERZONY ROZMÓWCA, KTÓREGO SŁUCHAMY: "${target_speaker}" (opcja/partia: "${speaker_party}").

Oto fragment jego wypowiedzi zarejestrowany przed ułamkiem sekundy przez mikrofon:
"""
${transcript_chunk.trim()}
"""

${dossier ? `Kontekst znanych słabości i triggerów tego oponenta:\n${typeof dossier === "string" ? dossier : JSON.stringify(dossier).slice(0, 800)}` : ""}

TWOJE ZADANIE:
1. Przeanalizuj te słowa. Jeśli oponent popełnił błąd, manipulację, zaprzeczył faktom, unika tematu lub wykazuje słabość psychiczną — natychmiast wygeneruj od 1 do maksymalnie 2 uderzeniowych kart HUD dla naszego polityka.
2. Każda karta musi zawierać pole "amunicja" — DOKŁADNE JEDNO, MOCNE I PROSTE ZDANIE, które nasz polityk ma wypowiedzieć do mikrofonu! Zero ogólników, zero teorii. Tylko gotowa riposta lub nokautujące pytanie zamknięte.
3. Wykryj, czy w wypowiedzi prowadzący lub rozmówca nie przekazał właśnie głosu innej osobie ze studia (np. "Panie pośle X", "Co na to partia Y?"). Jeśli tak, wpisz to nazwisko w "sugerowany_nowy_mowca".

Zwróć wynik jako ściśle poprawny JSON o strukturze:
{
  "alerts": [
    {
      "typ": "wtopa" | "emocje" | "riposta" | "pulapka",
      "tytul": "KRÓTKI NAGŁÓWEK CAPSLOCKIEM (np. SPRZECZNOŚĆ W GŁOSOWANIACH, UNIK PRZED KONKRETEM)",
      "cytat_oponenta": "Krótki fragment słów oponenta",
      "amunicja": "DOKŁADNIE JEDNO MOCNE ZDANIE DO POWIEDZENIA NA GŁOS DO MIKROFONU"
    }
  ],
  "sugerowany_nowy_mowca": "Imię i nazwisko nowego mówcy lub null jeśli brak zmiany"
}`;

    const geminiPayload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json",
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error in cockpit/analyze:", geminiRes.status, errText);
      return NextResponse.json({ alerts: [], sugerowany_nowy_mowca: null }, { status: 200 });
    }

    const geminiJson = await geminiRes.json();
    const candidateText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

    try {
      const parsed = JSON.parse(candidateText);
      return NextResponse.json({
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        sugerowany_nowy_mowca: parsed.sugerowany_nowy_mowca || null,
      });
    } catch {
      return NextResponse.json({ alerts: [], sugerowany_nowy_mowca: null });
    }
  } catch (err: any) {
    console.error("Błąd szybkiej analizy kokpitu:", err);
    return NextResponse.json(
      { alerts: [], sugerowany_nowy_mowca: null, error: err.message },
      { status: 200 }
    );
  }
}
