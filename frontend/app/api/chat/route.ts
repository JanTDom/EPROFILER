import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zrkyyopftellntxxwgmo.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recordingId = body.recordingId || body.recording_id;
    const messages: ChatMessage[] = body.messages || [];

    if (!recordingId) {
      return NextResponse.json({ detail: "Brak identyfikatora nagrania (recordingId)." }, { status: 400 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ detail: "Brak wiadomości w zapytaniu." }, { status: 400 });
    }

    // 1. Klucz API: ciasteczko, nagłówek, body lub klucz systemowy
    const cookieStore = await cookies();
    const customKeyFromCookie = cookieStore.get("eprofiler_gemini_key")?.value;
    const headerKey = request.headers.get("x-gemini-api-key");
    const activeApiKey = headerKey || body.gemini_api_key || customKeyFromCookie || SYSTEM_GEMINI_KEY;

    if (!activeApiKey) {
      return NextResponse.json(
        { detail: "Brak aktywnego klucza API dla silnika AI. Zaloguj się lub podaj klucz w profilu." },
        { status: 401 }
      );
    }

    // 2. Pobierz pełny kontekst nagrania z Supabase
    let recordingData: any = null;
    let profileData: any = null;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
      try {
        const [recRes, profRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${recordingId}&select=*`, {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
            cache: "no-store",
          }),
          fetch(`${SUPABASE_URL}/rest/v1/psychometric_profiles?recording_id=eq.${recordingId}&select=*`, {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
            cache: "no-store",
          }),
        ]);

        if (recRes.ok) {
          const recs = await recRes.json();
          if (recs && recs.length > 0) recordingData = recs[0];
        }
        if (profRes.ok) {
          const profs = await profRes.json();
          if (profs && profs.length > 0) profileData = profs[0];
        }
      } catch (err) {
        console.error("Błąd pobierania kontekstu nagrania z Supabase:", err);
      }
    }

    if (!recordingData) {
      return NextResponse.json({ detail: "Nie znaleziono nagrania o podanym ID." }, { status: 404 });
    }

    // 3. Przygotuj kontekst audytu do promptu systemowego
    const targetPolitician = recordingData.polityk_docelowy || "Badany polityk";
    const recordingTitle = recordingData.tytul || "Wystąpienie publiczne";
    const speakers = recordingData.rozpoznani_mowcy || [];
    const marketingData = profileData?.dane_marketingowe || profileData?.surowe_wnioski_ai?.marketing_polityczny || {};
    const rawAiNotes = profileData?.surowe_wnioski_ai || {};

    const forensicContext = `
DANE ZIDENTYFIKOWANEGO NAGRANIA:
- Tytuł: "${recordingTitle}"
- Osoba diagnozowana (cel audytu): ${targetPolitician} (Rola: ${recordingData.rola_polityka || "Polityk"})
- Czas trwania: ${recordingData.czas_trwania_sek || 0} sekund
- Rozpoznani rozmówcy: ${JSON.stringify(speakers, null, 2)}

DIAGNOZA POLITYCZNO-MARKETINGOWA I AUDYT:
- Werdykt wizerunkowy: ${marketingData.werdykt || profileData?.nastroj_glowny_prosty || "Brak werdyktu"}
- Ocena punktowa (1-10): ${marketingData.ocena_punktowa_1_10 || profileData?.wynik_ogolny || "N/A"}
- Uzasadnienie: ${marketingData.uzasadnienie_werdyktu || profileData?.podsumowanie_ai_proste || "Brak"}
- Główne atuty (plusy): ${JSON.stringify(marketingData.glowne_plusy || [], null, 2)}
- Błędy i wpadki (minusy): ${JSON.stringify(marketingData.popelnione_bledy_i_minusy || [], null, 2)}
- Niepożądane emocje i mowa ciała: ${JSON.stringify(marketingData.niepozadane_emocje_i_mowa_ciala || [], null, 2)}
- Luki argumentacyjne i nielogiczności: ${JSON.stringify(marketingData.nielogicznosci_i_luki_argumentacyjne || [], null, 2)}
- Amunicja dla oponentów (potencjalne uderzenia): ${JSON.stringify(marketingData.amunicja_dla_oponentow || [], null, 2)}
- Gotowe riposty sztabowe zamiast błędów: ${JSON.stringify(marketingData.gotowe_riposty_zamiast_bledow || [], null, 2)}
- Warsztat mowy, dykcja, soundbites: ${marketingData.warsztat_mowy_i_dykcji || "Brak"} | Soundbite: ${marketingData.nosnosc_medialna_soundbites || "Brak"}
- Wpływ na elektoraty: ${JSON.stringify(marketingData.wplyw_na_elektorat || {}, null, 2)}
- Oficjalne rekomendacje sztabowe: ${JSON.stringify(marketingData.rekomendacje_sztabowe || [], null, 2)}

SUROWE NOTATKI SILNIKA PSYCHOMETRYCZNEGO:
${JSON.stringify(rawAiNotes, null, 2)}
`;

    const systemInstruction = `Jesteś bezkompromisowym, analitycznym doradcą ds. marketingu politycznego, szefem sztabu wyborczego oraz ekspertem psychologii komunikacji systemu E-PROFILER.
Rozmawiasz ze sztabowcem, strategiem kampanii lub dziennikarzem śledczym analizującym to konkretne nagranie.

TWOJE ZASADY PRACY I FORMATOWANIA:
1. ZAWSZE opierasz się na twardych dowodach z powyższego audytu oraz przebiegu nagrania.
2. ZNACZNIKI CZASU (KLUCZOWE!): Za każdym razem, gdy powołujesz się na konkretny moment, unik, cytat, błąd, grymas lub ripostę, MUSISZ podać dokładny znacznik czasu w formacie [MM:SS] (np. [01:14], [03:42]), aby użytkownik mógł natychmiast skoczyć w odtwarzaczu do tego momentu!
3. STYL SZTABOWY: Mów zwięźle, konkretnie, bez akademickiego żargonu i bez laurki. Jeśli polityk popełnił błąd — nazywasz go po imieniu i dajesz gotową ripostę/neutralizację. Jeśli użytkownik prosi o pytania dociskające na debatę — formułujesz zabójczo precyzyjne pytania uderzające w luki logiczne.
4. JEŚLI PYTAJĄ O:
   - "Co wytną oponenci?" -> Wskaż najbardziej kompromitujące soundbites z dokładnym czasem [MM:SS] i podaj scenariusz 15-sekundowego spotu negatywnego.
   - "Pytania dociskające" -> Podaj 3-4 pytania zamykające drogę ucieczki (trapy retoryczne).
   - "Oświadczenie prasowe" -> Przygotuj gotowy, zwarty komunikat do mediów odwracający narrację.
5. Czysta polszczyzna, przejrzyste formatowanie punktowe (markdown).

KONTEKST BADAWCZY NAGRANIA:
${forensicContext}
`;

    // 4. Przygotuj zawartość konwersacji dla Gemini
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.35,
        max_output_tokens: 2048,
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
      console.error("Błąd API Gemini podczas czatu:", geminiRes.status, errText);
      let userMsg = "Wystąpił błąd podczas generowania odpowiedzi przez silnik AI.";
      if (errText.includes("API_KEY_INVALID") || errText.includes("API key not valid") || geminiRes.status === 400) {
        userMsg = "Brak ważnego klucza API dla silnika AI. Wprowadź swój bezpłatny klucz z Google AI Studio w profilu lub przy logowaniu.";
      }
      return NextResponse.json(
        { detail: userMsg },
        { status: geminiRes.status }
      );
    }

    const geminiJson = await geminiRes.json();
    const replyText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "Brak odpowiedzi od silnika AI.";

    return NextResponse.json({ reply: replyText });
  } catch (error: any) {
    console.error("Błąd endpointu czatu:", error);
    return NextResponse.json(
      { detail: error.message || "Wystąpił nieoczekiwany błąd podczas przetwarzania pytania." },
      { status: 500 }
    );
  }
}
