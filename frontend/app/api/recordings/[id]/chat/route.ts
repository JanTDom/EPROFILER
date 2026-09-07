import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zrkyyopftellntxxwgmo.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ detail: "Brak identyfikatora nagrania." }, { status: 400 });
    }

    const body = await request.json();
    const messages: ChatMessage[] = body.messages || [];

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
          fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}&select=*`, {
            headers: {
              apikey: SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            },
            cache: "no-store",
          }),
          fetch(`${SUPABASE_URL}/rest/v1/psychometric_profiles?recording_id=eq.${id}&select=*`, {
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
    const targetPolitician = recordingData.polityk_docelowy || "Badana osoba";
    const recordingTitle = recordingData.tytul || "Wystąpienie publiczne";
    const speakers = recordingData.rozpoznani_mowcy || [];
    const rawAiNotes = profileData?.surowe_wnioski_ai || {};
    const marketingData = profileData?.dane_marketingowe || rawAiNotes.marketing_polityczny || {};
    const adversaryData = rawAiNotes.analiza_przeciwnika || {};
    const isAdversary = recordingData.relacja_polityka === "przeciwnik" || Boolean(rawAiNotes.analiza_przeciwnika);

    const forensicContext = isAdversary
      ? `
DANE ZIDENTYFIKOWANEGO OPONENTA:
- Tytuł nagrania: "${recordingTitle}"
- Oponent (cel ataku): ${targetPolitician} (Rola: ${recordingData.rola_polityka || "Oponent polityczny / dziennikarz / działacz"})
- Relacja ze sztabem: PRZECIWNIK (TRYB WYWIADU OFENSYWNEGO & WEKTORÓW ATAKU)
- Czas trwania: ${recordingData.czas_trwania_sek || 0} sekund
- Rozpoznani rozmówcy: ${JSON.stringify(speakers, null, 2)}

OPPOSITION RESEARCH — DOSSIER SŁABOŚCI I WEKTORÓW ATAKU:
- Główna podatność oponenta: ${adversaryData.glowna_podatnosc_oponenta || profileData?.nastroj_glowny_prosty || "Brak"}
- Ocena podatności na atak (1-10): ${adversaryData.ocena_podatnosci_na_atak_1_10 || 8}/10
- Punkty wejścia osobowościowe i słabości psychiczne (TRIGERY ORAZ JAK GO WYPROWADZIĆ Z RÓWNOWAGI): 
${JSON.stringify(adversaryData.punkty_wejscia_osobowosciowe || [], null, 2)}
- Punkty wejścia argumentacyjne (LUKI, MANIPULACJE I GOTOWE PYTANIA-PUŁAPKI):
${JSON.stringify(adversaryData.punkty_wejscia_argumentacyjne || [], null, 2)}
- Amunicja uderzeniowa do spotów ('samobóje'):
${JSON.stringify(adversaryData.amunicja_uderzeniowa_do_spotow || [], null, 2)}
- Strategiczne dyrektywy ofensywne dla naszego sztabu:
${JSON.stringify(adversaryData.rekomendacje_ofensywne_dla_naszego_sztabu || [], null, 2)}

SUROWE NOTATKI SILNIKA BEHAWIORALNEGO:
${JSON.stringify(rawAiNotes, null, 2)}
`
      : `
DANE ZIDENTYFIKOWANEGO NAGRANIA:
- Tytuł: "${recordingTitle}"
- Osoba diagnozowana (cel audytu): ${targetPolitician} (Rola: ${recordingData.rola_polityka || "Polityk"})
- Relacja ze sztabem: SOJUSZNIK (AUDYT SZTABOWY)
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

    const systemInstruction = isAdversary
      ? `Jesteś ofensywnym doradcą sztabowym ds. walki politycznej, rzecznikiem i głównym strategiem sztabu wyborczego w systemie E-PROFILER.
Badana osoba (${targetPolitician}) została zdefiniowana jako PRZECIWNIK / OPONENT (może to być rywalizujący polityk, nieprzychylny lub agresywny dziennikarz prowadzący rozmowę, albo wrogi publicysta/działacz).

TWOJA MISJA:
Pomagasz naszemu kandydatowi, sztabowcom i rozmówcom w mediach ZNEUTRALIZOWAĆ oponenta, zdemaskować jego fałsz i słabości psychiczne oraz WYGRAĆ starcie medialne.

ZASADY PRACY I FORMATOWANIA:
1. ZNACZNIKI CZASU (BARDZO WAŻNE): Za każdym razem gdy wskazujesz błąd, wyciek w głosie/mimice, manipulację czy cytat oponenta, podawaj dokładny znacznik [MM:SS] (np. [02:14]), aby sztabowiec mógł to natychmiast zobaczyć i wyciąć.
2. DESTABILIZACJA I EMOCJE (JAK GO WYPROWADZIĆ Z RÓWNOWAGI):
   - Jeśli użytkownik pyta "Jak go wyprowadzić z równowagi?", "Kiedy puszczają mu nerwy?" lub "W co uderzyć?" — wskaż jego kluczowe kompleksy, triggery, wycieki mimiczne/głosowe i podaj bezwzględną instrukcję zachowania w studiu, która doprowadzi go do dekompozycji na wizji.
3. WEKTORY ARGUMENTACYJNE:
   - Formułuj bezwzględnie precyzyjne pytania-pułapki (trapy retoryczne), które nie dają oponentowi drogi ucieczki w ogólniki.
4. AMUNICJA DO SPOTÓW:
   - Gdy padnie pytanie o amunicję spotową lub social media — wskaż dokładne cytaty ("samobóje") i opisz scenariusz 15-sekundowego klipu uderzeniowego.
5. Czysta polszczyzna, twardy sztabowy styl, zero laurek dla oponenta, czytelne formatowanie punktowe.

KONTEKST BADAWCZY NAGRANIA:
${forensicContext}
`
      : `Jesteś bezkompromisowym, analitycznym doradcą ds. marketingu politycznego, szefem sztabu wyborczego oraz ekspertem psychologii komunikacji systemu E-PROFILER.
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
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
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
      return NextResponse.json(
        { detail: `Błąd silnika AI (${geminiRes.status}): Upewnij się, że klucz API jest prawidłowy.` },
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
