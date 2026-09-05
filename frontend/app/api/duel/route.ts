import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zrkyyopftellntxxwgmo.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recordingIdA, recordingIdB } = body;

    if (!recordingIdA || !recordingIdB) {
      return NextResponse.json(
        { detail: "Wymagane są identyfikatory dwóch nagrań do pojedynku." },
        { status: 400 }
      );
    }

    if (recordingIdA === recordingIdB) {
      return NextResponse.json(
        { detail: "Wybierz dwa różne nagrania lub dwóch różnych mówców do porównania." },
        { status: 400 }
      );
    }

    // 1. Klucz API
    const cookieStore = await cookies();
    const customKeyFromCookie = cookieStore.get("eprofiler_gemini_key")?.value;
    const headerKey = request.headers.get("x-gemini-api-key");
    const activeApiKey = headerKey || body.gemini_api_key || customKeyFromCookie || SYSTEM_GEMINI_KEY;

    if (!activeApiKey) {
      return NextResponse.json(
        { detail: "Brak klucza API dla silnika AI. Zaloguj się lub podaj swój klucz." },
        { status: 401 }
      );
    }

    // 2. Pobierz dane obu nagrań z Supabase
    const [recARes, profARes, recBRes, profBRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${recordingIdA}&select=*`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
        cache: "no-store",
      }),
      fetch(`${SUPABASE_URL}/rest/v1/psychometric_profiles?recording_id=eq.${recordingIdA}&select=*`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
        cache: "no-store",
      }),
      fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${recordingIdB}&select=*`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
        cache: "no-store",
      }),
      fetch(`${SUPABASE_URL}/rest/v1/psychometric_profiles?recording_id=eq.${recordingIdB}&select=*`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
        cache: "no-store",
      }),
    ]);

    const recsA = await recARes.json();
    const profsA = await profARes.json();
    const recsB = await recBRes.json();
    const profsB = await profBRes.json();

    const recA = recsA?.[0];
    const profA = profsA?.[0];
    const recB = recsB?.[0];
    const profB = profsB?.[0];

    if (!recA || !recB) {
      return NextResponse.json({ detail: "Nie odnaleziono nagrań w bazie danych." }, { status: 404 });
    }

    const nameA = recA.polityk_docelowy || recA.tytul || "Zawodnik A";
    const nameB = recB.polityk_docelowy || recB.tytul || "Zawodnik B";

    const marketingA = profA?.dane_marketingowe || {};
    const marketingB = profB?.dane_marketingowe || {};

    const systemPrompt = `Jesteś bezkompromisowym, głównym sędzią i arbitrem debat politycznych, szefem sztabu wyborczego oraz ekspertem psychologii komunikacji systemu E-PROFILER.
Otrzymujesz audyty behawioralne i wizerunkowe dwóch polityków/wystąpień publicznych. Twoim celem jest wyłonienie bezapelacyjnego werdyktu w formule STARCIU 1-NA-1 (HEAD-TO-HEAD DUEL).

OBOWIĄZUJĄ CIĘ NASTĘPUJĄCE TWARDE REGUŁY:
1. BRAK DIPLOMATYCZNEJ POPRAWNOŚCI: Nie unikaj wskazania zwycięzcy. Jeśli jeden polityk popełnił mniej błędów, panował nad nerwami i narzucił swój język — wygrywa starcie.
2. TUG-OF-WAR (PRZEWAGA PROCENTOWA): Suma przewag polityka A i B musi wynosić dokładnie 100%. (np. 57% dla A i 43% dla B). Jeśli starcie było wyjątkowo wyrównane, dopuszczalne jest np. 52% vs 48%.
3. 4 KATEGORIE BITWY:
   - Opanowanie emocjonalne (kto lepiej ukrył zdenerwowanie, brak tików, stabilność głosu)
   - Siła argumentacji (fakty vs uniki, ciąg przyczynowo-skutkowy)
   - Kontrola narracji (kto narzucił temat rozmowy, narzucanie swoich pojęć)
   - Odporność na presję (reakcja na trudne pytania, riposty pod ostrzałem)
4. KLUCZOWY MOMENT PRZEŁAMANIA: Wskaż zwięźle decydujący moment lub kontrast, który przeważył szalę na korzyść zwycięzcy.
5. FORMAT ODPOWIEDZI: Zwróć WYŁĄCZNIE poprawny format JSON (żadnego markdownu poza JSON-em).

STRUKTURA JSON:
{
  "zwyciezca_starcia": "KANDYDAT_A" | "KANDYDAT_B" | "REMIS_ZE_WSKAZANIEM_NA_A" | "REMIS_ZE_WSKAZANIEM_NA_B",
  "nazwa_zwyciezcy": "${nameA}" lub "${nameB}",
  "przewaga_procentowa_a": 55,
  "przewaga_procentowa_b": 45,
  "tytul_pojedynku": "Zwięzły, dynamiczny tytuł starcia w sentence case",
  "podsumowanie_starcia": "2-3 mocne, esencjonalne zdania werdyktu sztabowego.",
  "kluczowy_moment_przelamania": "Opis decydującego kontrastu retorycznego lub momentu przełamania.",
  "kategorie": {
    "opanowanie_emocjonalne": {
      "zwyciezca": "A" | "B",
      "ocena_a_1_10": 7,
      "ocena_b_1_10": 5,
      "uzasadnienie": "Zwięzłe porównanie opanowania"
    },
    "sila_argumentacji": {
      "zwyciezca": "A" | "B",
      "ocena_a_1_10": 6,
      "ocena_b_1_10": 7,
      "uzasadnienie": "Zwięzłe porównanie logiki i faktów"
    },
    "kontrola_narracji": {
      "zwyciezca": "A" | "B",
      "ocena_a_1_10": 8,
      "ocena_b_1_10": 6,
      "uzasadnienie": "Zwięzłe porównanie narzucania agendy"
    },
    "odpornosc_na_presje": {
      "zwyciezca": "A" | "B",
      "ocena_a_1_10": 7,
      "ocena_b_1_10": 5,
      "uzasadnienie": "Zwięzłe porównanie odporności na trudne pytania"
    }
  },
  "rekomendacja_dla_sztabu_a": "Kluczowa dyrektywa sztabowa dla ${nameA}",
  "rekomendacja_dla_sztabu_b": "Kluczowa dyrektywa sztabowa dla ${nameB}"
}`;

    const duelPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `DOKONAJ ANALIZY PORÓWNAWCZEJ STARCIU 1-NA-1 MIĘDZY DWOMA POLITYKAMI:

=== ZAWODNIK A: ${nameA} ===
- Tytuł nagrania: "${recA.tytul}"
- Werdykt wizerunkowy: ${marketingA.werdykt || profA?.nastroj_glowny_prosty || "Brak"}
- Ocena punktowa: ${marketingA.ocena_punktowa_1_10 || profA?.wynik_ogolny || 5}/10
- Główne atuty: ${JSON.stringify(marketingA.glowne_plusy || [])}
- Główne błędy i uniki: ${JSON.stringify(marketingA.popelnione_bledy_i_minusy || [])}
- Luki logiczne: ${JSON.stringify(marketingA.nielogicznosci_i_luki_argumentacyjne || [])}
- Emocje i mowa ciała: ${JSON.stringify(marketingA.niepozadane_emocje_i_mowa_ciala || [])}
- Amunicja dla oponentów: ${JSON.stringify(marketingA.amunicja_dla_oponentow || [])}

=== ZAWODNIK B: ${nameB} ===
- Tytuł nagrania: "${recB.tytul}"
- Werdykt wizerunkowy: ${marketingB.werdykt || profB?.nastroj_glowny_prosty || "Brak"}
- Ocena punktowa: ${marketingB.ocena_punktowa_1_10 || profB?.wynik_ogolny || 5}/10
- Główne atuty: ${JSON.stringify(marketingB.glowne_plusy || [])}
- Główne błędy i uniki: ${JSON.stringify(marketingB.popelnione_bledy_i_minusy || [])}
- Luki logiczne: ${JSON.stringify(marketingB.nielogicznosci_i_luki_argumentacyjne || [])}
- Emocje i mowa ciała: ${JSON.stringify(marketingB.niepozadane_emocje_i_mowa_ciala || [])}
- Amunicja dla oponentów: ${JSON.stringify(marketingB.amunicja_dla_oponentow || [])}

Zwróć kompletny werdykt w formacie JSON.`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.25,
        responseMimeType: "application/json",
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duelPayload),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Błąd API Gemini podczas syntezy pojedynku:", geminiRes.status, errBody);
      return NextResponse.json(
        { detail: `Błąd silnika AI (${geminiRes.status}): Nie udało się wygenerować werdyktu starcia.` },
        { status: 502 }
      );
    }

    const geminiJson = await geminiRes.json();
    const candidateText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Pusta odpowiedź od modelu AI.");
    }

    const duelResult = JSON.parse(candidateText);

    return NextResponse.json({
      duel: duelResult,
      candidateA: {
        id: recA.id,
        name: nameA,
        title: recA.tytul,
        score: marketingA.ocena_punktowa_1_10 || profA?.wynik_ogolny || 5,
        verdict: marketingA.werdykt || "Poprawny",
        hits: marketingA.glowne_plusy || [],
        blunders: marketingA.popelnione_bledy_i_minusy || [],
        lapses: marketingA.nielogicznosci_i_luki_argumentacyjne || [],
      },
      candidateB: {
        id: recB.id,
        name: nameB,
        title: recB.tytul,
        score: marketingB.ocena_punktowa_1_10 || profB?.wynik_ogolny || 5,
        verdict: marketingB.werdykt || "Poprawny",
        hits: marketingB.glowne_plusy || [],
        blunders: marketingB.popelnione_bledy_i_minusy || [],
        lapses: marketingB.nielogicznosci_i_luki_argumentacyjne || [],
      },
    });
  } catch (error: any) {
    console.error("Błąd endpointu pojedynku /api/duel:", error);
    return NextResponse.json(
      { detail: error.message || "Wystąpił błąd podczas analizy pojedynku." },
      { status: 500 }
    );
  }
}
