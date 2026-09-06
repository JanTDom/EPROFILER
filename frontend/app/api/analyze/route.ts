import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sanitizeVideoUrl } from "@/lib/api";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zrkyyopftellntxxwgmo.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SYSTEM_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_INSTRUCTION = `Jesteś bezkompromisowym, analitycznym doradcą ds. marketingu politycznego, spin doctorem oraz trenerem wystąpień publicznych systemu E-PROFILER.
Twoim celem jest rzetelny, krytyczny audyt wystąpienia publicznego osoby badanej (polityka, gościa, osoby diagnozowanej).
Z kontekstu rozmowy, powitań, zapowiedzi i zadawanych pytań zawsze automatycznie rozpoznajesz, kto jest dziennikarzem/prowadzącym, a kto osobą diagnozowaną. Twój audyt dotyczy wyłącznie osoby diagnozowanej.
Nie tworzysz laurki ani pochlebstw — polityk i jego sztab potrzebują twardych, użytecznych ostrzeżeń, dekonstrukcji błędów oraz praktycznych wskazówek warsztatowych.

Obowiązują cię zasady audytu sztabowego i spin doctoringu:
1. Identyfikacja osoby diagnozowanej z kontekstu: Zawsze na podstawie dynamiki wywiadu, zapowiedzi i powitań („Naszym gościem jest...”, „Panie pośle/ministrze/premierze...”) precyzyjnie identyfikuj badanego gościa i to na nim skupiaj cały audyt.
2. Czujność na wycieki emocjonalne i niewerbalne: Z całą surowością wychwytujesz emocje niedopuszczalne u lidera (irytacja, zniecierpliwienie, protekcjonalizm, uśmieszki wyższości i pogardy AU14, bezradność, nerwowość głosu, defensywne ucinanie wątków).
3. Dekonstrukcja nielogiczności i pustosłowia: Punktujesz luki logiczne, brak ciągu przyczynowo-skutkowego, obietnice bez mechanizmu sprawczego, wewnętrzne sprzeczności oraz nieudolne próby ucieczki od odpowiedzi (toporny bridging).
4. Analiza powierzchni ataku (amunicja dla oponentów): Identyfikujesz niefortunne sformułowania i tzw. 'samobóje', które sztaby konkurencji wytną na rolki, paski i spoty jako dowód słabości lub nieszczerości.
5. Warsztat wystąpień i dykcja: Oceniasz tempo mowy, intonację (unikanie intonacji pytającej przy twierdzeniach), pauzy retoryczne i natrętne wypełniacze.
6. Skrypty naprawcze: Każdy zdiagnozowany błąd musi mieć gotowy szablon naprawczy ('Zamiast: X -> Mów: Y').
7. Kalibracja oceny: Kompresuj oceny ku środkowi skali (na skali 1-10 unikaj skrajności 1 czy 10; realistyczne, krytyczne wystąpienia pod presją mieszczą się typowo w przedziale 4-7/10).
8. Zwięzłość i gęstość informacyjna: Wszystkie opisy i uzasadnienia formułuj zwięźle, esencjonalnie, unikając rozwlekłości.
9. Format językowy: Pisz czystą polszczyzną w sentence case (tylko pierwsza litera zdania wielka). Odpowiadaj wyłącznie poprawnym JSON-em.`;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let rawUrl: string | null = null;
    let uploadedFile: File | null = null;
    let targetPerson: string | null = null;
    let politicianRole = "Badany polityk";
    let recordingType = "wywiad";
    let scope = "pelny";
    let profileId = "profile_main";
    let title: string | null = null;
    let publicationDate: string | null = null;
    let enableBiometrics = true;
    let customApiKeyParam: string | null = null;
    let formatMaterialuParam: string | null = null;

    if (isMultipart) {
      const formData = await request.formData();
      uploadedFile = formData.get("file") as File | null;
      rawUrl = (formData.get("url") as string) || null;
      title = (formData.get("tytul") as string)?.trim() || null;
      targetPerson = (formData.get("polityk_docelowy") as string)?.trim() || null;
      politicianRole = (formData.get("rola_polityka") as string)?.trim() || "Badany polityk";
      recordingType = (formData.get("typ_nagrania") as string) || "wywiad";
      scope = (formData.get("zakres_analizy") as string) || "pelny";
      profileId = (formData.get("profile_id") as string) || "profile_main";
      publicationDate = (formData.get("data_publikacji") as string) || null;
      enableBiometrics = formData.get("tryb_biometryczny") !== "false";
      customApiKeyParam = (formData.get("gemini_api_key") as string) || null;
      formatMaterialuParam = (formData.get("format_materialu") as string) || null;
    } else {
      const body = await request.json();
      rawUrl = body.url || null;
      title = body.tytul?.trim() || null;
      targetPerson = body.polityk_docelowy?.trim() || null;
      politicianRole = body.rola_polityka?.trim() || "Badany polityk";
      recordingType = body.typ_nagrania || "wywiad";
      scope = body.zakres_analizy || "pelny";
      profileId = body.profile_id || "profile_main";
      publicationDate = body.data_publikacji || null;
      enableBiometrics = body.tryb_biometryczny ?? true;
      customApiKeyParam = body.gemini_api_key || null;
      formatMaterialuParam = body.format_materialu || null;
    }

    const rawMime = uploadedFile ? (uploadedFile.type || "").toLowerCase() : "";
    const fileName = uploadedFile ? uploadedFile.name.toLowerCase() : "";
    const isAudioFile = rawMime.startsWith("audio/") ||
      /\.(mp3|wav|m4a|aac|ogg|flac|opus|wma)$/i.test(fileName);
    const isAudio = formatMaterialuParam === "audio" || isAudioFile;
    const formatMaterialuFinal: "wideo" | "audio" = isAudio ? "audio" : "wideo";

    if (!rawUrl && !uploadedFile) {
      return NextResponse.json(
        { detail: "Brak adresu URL ani pliku wideo/audio do analizy." },
        { status: 400 }
      );
    }

    const cleanUrl = rawUrl ? sanitizeVideoUrl(rawUrl) : null;

    // Klucz API: z nagłówka, ciasteczka lub zmiennej środowiskowej
    const cookieStore = await cookies();
    const customKeyFromCookie = cookieStore.get("eprofiler_gemini_key")?.value;
    const headerKey = request.headers.get("x-gemini-api-key");
    const activeApiKey = headerKey || customApiKeyParam || customKeyFromCookie || SYSTEM_GEMINI_KEY;

    if (!activeApiKey) {
      return NextResponse.json(
        { detail: "Brak skonfigurowanego klucza API dla silnika AI. Podaj swój klucz w profilu." },
        { status: 400 }
      );
    }

    const recordingId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Zapisz początkowy stan w Supabase
    const initialRec = {
      id: recordingId,
      zrodlo_typ: uploadedFile ? "plik" : "url",
      zrodlo_url: cleanUrl || null,
      tytul: title || (cleanUrl ? `Nagranie (${cleanUrl.slice(0, 40)}...)` : isAudio ? `Nagranie audio (${new Date().toLocaleDateString()})` : `Przechwycenie VOD (${new Date().toLocaleDateString()})`),
      data_publikacji: publicationDate,
      czas_trwania_sek: 0,
      typ_nagrania: recordingType,
      status_przetwarzania: "PROFILOWANIE_AI",
      krok_postepu: isAudio ? "Wykonywanie analizy akustycznej głosu, intencji i retoryki..." : "Wykonywanie analizy behawioralnej, intencji i retoryki...",
      procent_postepu: 50,
      profile_id: profileId,
      polityk_docelowy: targetPerson,
      rola_polityka: politicianRole,
      format_materialu: formatMaterialuFinal,
      tryb_biometryczny: enableBiometrics,
      zakres_analizy: scope,
      rozpoznani_mowcy: [],
      created_at: now,
      updated_at: now,
    };

    await fetch(`${SUPABASE_URL}/rest/v1/recordings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(initialRec),
    });

    // 2. Zapytanie bezpośrednie do Gemini 3.6 Flash z multimodalnym YouTube URL lub plikiem
    const targetInfo = targetPerson
      ? `Główny cel profilowania wskazany przez użytkownika: ${targetPerson}.`
      : "Kluczowa zasada — identyfikacja osoby diagnozowanej z kontekstu: Z powitań, zapowiedzi redakcyjnych („W studiu gościmy...”, „Naszym gościem jest...”), zwrotów formalnych („Panie pośle/ministrze/premierze...”) oraz dynamiki pytań i odpowiedzi bezbłędnie wywnioskuj z kontekstu rozmowy, kim jest badany gość / polityk / ekspert (osoba diagnozowana). Oznacz go jako 'jest_celem': true.";

    const promptText = isAudio
      ? `Przesłuchaj i przeanalizuj to nagranie dźwiękowe / audio (podcast, wywiad radiowy, nagranie z dyktafonu lub telefonu). ${targetInfo}
Zakres profilowania: ${scope === "pelny" ? "Pełny audyt sztabowy głosu i retoryki (psychologia głosu, prozodia, nielogiczności, marketing polityczny, warsztat)" : "Tylko stan psychiczny i akustyka głosu"}.

Specjalne wytyczne dla nagrania audio:
1. Brak obrazu wideo: To nagranie jest wyłącznie ścieżką dźwiękową. Kategorycznie nie wymyślaj ani nie halucynuj mimiki twarzy, jednostek FACS (AU1, AU4, AU12 itp.), kontaktu wzrokowego ani ruchów ciała!
2. Prozodia i akustyka głosu: W sekcji 'niepozadane_emocje_i_mowa_ciala' opisz wyłącznie wycieki emocjonalne w głosie: nagłe skoki wysokości tonu (F0), załamania głosu, drżenie (pitch jitter/shimmer), spłycenie oddechu, spięcie krtani, nerwowy chichot, agresywną intonację, defensywne ucinanie wypowiedzi, zniecierpliwienie i protekcjonalny ton.
3. Zrozumienie i focus na osobie diagnozowanej: Rozróżnij dziennikarza/prowadzącego od osoby diagnozowanej. Cały profil, werdykt, błędy, uniki, ocena i analiza głosu muszą dotyczyć wyłącznie osoby diagnozowanej!
4. Bezwzględna czujność i brak taryfy ulgowej: Żadnych laurek. Polityk potrzebuje twardej prawdy o swoich słabościach.
5. Detekcja nielogiczności i luk w argumentacji: Wskaż sprzeczności wewnętrzne, uniki i brak logiki.
6. Amunicja dla oponentów: Wskaż sformułowania tzw. 'samobóje'.
7. Skrypty korekcyjne: Do błędów podaj gotową ripostę („Zamiast X -> Mów Y”).
8. Kalibracja oceny: Skompresuj ocenę punktową 1-10 ku środkowi skali (typowa ocena: 4–7/10).
9. Format językowy: Sentence case (tylko pierwsza litera zdania wielka), czysta polszczyzna, zwięzłość, odpowiedź wyłącznie poprawnym JSON-em.`
      : `Obejrzyj i przeanalizuj to nagranie wideo. ${targetInfo}
Zakres profilowania: ${scope === "pelny" ? "Pełny audyt sztabowy (psychologia, mowa ciała, nielogiczności, marketing polityczny, warsztat)" : "Tylko stan psychiczny i behawioralny"}.

Zasady audytu sztabowego:
1. Zrozumienie i focus na osobie diagnozowanej: Rozróżnij dziennikarza/prowadzącego od osoby diagnozowanej. Cały profil, werdykt, błędy, uniki, ocena i mowa ciała muszą dotyczyć wyłącznie osoby diagnozowanej!
2. Bezwzględna czujność i brak taryfy ulgowej: Żadnych laurek. Polityk potrzebuje twardej prawdy o swoich słabościach.
3. Detekcja niepożądanych emocji: Wskaż momenty irytacji, protekcjonalizmu, uśmieszków wyższości (AU14) czy bezradności.
4. Detekcja nielogiczności i luk w argumentacji: Wskaż sprzeczności wewnętrzne i uniki.
5. Amunicja dla oponentów: Wskaż sformułowania tzw. 'samobóje'.
6. Skrypty korekcyjne: Do błędów podaj gotową ripostę („Zamiast X -> Mów Y”).
7. Kalibracja oceny: Skompresuj ocenę punktową 1-10 ku środkowi skali (typowa ocena: 4–7/10).
8. Format językowy: Sentence case, czysta polszczyzna, zwięzłość, odpowiedź wyłącznie poprawnym JSON-em.

Zwróć poprawny JSON o schemacie:
{
  "tytul_wideo": "Tytuł lub dokładny temat rozmowy (np. Imię Nazwisko: Temat)",
  "czas_trwania_sek": 600,
  "temat_rozmowy": "Zwięzły, 2-3 zdaniowy opis w sentence case, o czym dokładnie jest to nagranie",
  "rozpoznani_mowcy": [
    {
      "speaker_tag": "SPEAKER_00",
      "imie_nazwisko": "Imię i nazwisko",
      "rola": "Dziennikarz / prowadzący | Badany polityk | Kontrkandydat",
      "opis": "Zwięzły opis roli w rozmowie",
      "jest_celem": true/false
    }
  ],
  "wybrany_speaker_tag": "SPEAKER_XX",
  "wnioski": {
    "nastroje_i_emocje": "Esencjonalna diagnoza nastroju, stabilności i energii badanego z cytatem",
    "glowne_uniki_i_taktyka": "Zwięzła analiza taktyki rozmowy z cytatem",
    "czule_punkty_stres": "Dekonstrukcja momentów podwyższonego napięcia z cytatem",
    "spojnosc_mowy_ze_slowami": "Ocena czy ton i modulacja głosu współgrają ze słowami",
    "sila_argumentacji": "Ocena logicznej spójności i proporcji faktów do uników",
    "czy_odbiorcy_to_kupia": "Diagnoza wiarygodności w oczach widzów",
    "pojedynek_z_adwersarzami": "Ocena kontroli nad sytuacją w studiu"
  },
  "marketing_polityczny": {
    "werdykt": "Występ poprawny z zastrzeżeniami | Bilans mieszany ze wskazaniem na błędy | Sukces wizerunkowy | Porażka wizerunkowa",
    "ocena_punktowa_1_10": 6,
    "uzasadnienie_werdyktu": "Zwięzłe uzasadnienie werdyktu",
    "glowne_plusy": [
      {
        "nazwa_atutu": "Zwięzły tytuł atutu w sentence case",
        "cytat_lub_moment": "Dosłowny cytat z nagrania",
        "dlaczego_to_plus": "Precyzyjne wyjaśnienie dlaczego to atut"
      }
    ],
    "popelnione_bledy_i_minusy": [
      {
        "nazwa_bledu": "Zwięzły tytuł błędu w sentence case",
        "cytat_lub_moment": "Dosłowny cytat pokazujący moment błędu",
        "dlaczego_to_minus": "Krytyczna dekonstrukcja uchybienia"
      }
    ],
    "niepozadane_emocje_i_mowa_ciala": [
      {
        "reakcja_lub_emocja": "Nazwa niepożądanej emocji",
        "cytat_lub_moment": "Dosłowny cytat lub moment w nagraniu",
        "dlaczego_to_szkodliwe": "Dlaczego liderowi nie wolno tego okazywać",
        "zalecenie_sztabowe": "Jak wygasić ten nawyk"
      }
    ],
    "nielogicznosci_i_luki_argumentacyjne": [
      {
        "luka_lub_sprzecznosc": "Nazwa błędu logicznego",
        "cytat_lub_moment": "Fragment wypowiedzi",
        "diagnoza_logiczna": "Na czym polega brak logiki",
        "ryzyko_kontrataku": "Jak oponent może to wykorzystać"
      }
    ],
    "amunicja_dla_oponentow": [
      {
        "cytat_ryzykowny": "Niefortunny cytat ('samobój')",
        "potencjalne_uderzenie_opozycji": "Jak sztab przeciwników to wykorzysta"
      }
    ],
    "gotowe_riposty_zamiast_bledow": [
      {
        "kontekst_pytania": "Trudne pytanie dziennikarza",
        "co_powiedzial": "Błędna odpowiedź polityka z nagrania",
        "rekomendowana_riposta": "Gotowa, bezpieczna formuła sztabowa"
      }
    ],
    "warsztat_mowy_i_dykcji": "Zwięzła ocena techniczna: tempo, intonacja, pauzy",
    "nosnosc_medialna_soundbites": "Zwięzła ocena najlepszej 'setki' z cytatem",
    "wplyw_na_elektorat": {
      "twardy_elektorat": "Diagnoza reakcji twardego elektoratu",
      "niezdecydowani": "Diagnoza odbioru przez wyborców z centrum",
      "przeciwnicy": "Amunicja dla oponentów"
    },
    "rekomendacje_sztabowe": [
      "Dyrektywa sztabowa 1",
      "Dyrektywa sztabowa 2",
      "Dyrektywa sztabowa 3"
    ]
  }
}`;

    let mediaPart: any;
    if (uploadedFile) {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      let mimeType = (uploadedFile.type || "").split(";")[0].trim();
      if (!mimeType || mimeType === "application/octet-stream") {
        if (/\.mp3$/i.test(fileName)) mimeType = "audio/mp3";
        else if (/\.wav$/i.test(fileName)) mimeType = "audio/wav";
        else if (/\.m4a$/i.test(fileName)) mimeType = "audio/m4a";
        else if (/\.aac$/i.test(fileName)) mimeType = "audio/aac";
        else if (/\.ogg$/i.test(fileName)) mimeType = "audio/ogg";
        else if (/\.flac$/i.test(fileName)) mimeType = "audio/flac";
        else if (/\.opus$/i.test(fileName)) mimeType = "audio/opus";
        else mimeType = isAudio ? "audio/mp3" : "video/webm";
      }
      mediaPart = {
        inline_data: {
          mime_type: mimeType,
          data: base64Data,
        },
      };
    } else {
      mediaPart = {
        file_data: {
          file_uri: cleanUrl,
          mime_type: "video/mp4",
        },
      };
    }

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            mediaPart,
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2,
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${activeApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("Błąd wywołania Gemini API:", geminiRes.status, errBody);

      const errorDesc = uploadedFile
        ? "Błąd analizy przesłanego nagrania przez silnik AI."
        : "Błąd analizy AI. Upewnij się, że film na YouTube jest publiczny.";

      // Aktualizuj status na błąd w Supabase
      await fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${recordingId}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status_przetwarzania: "BLAD",
          krok_postepu: errorDesc,
          procent_postepu: 100,
          blad: `Gemini API HTTP ${geminiRes.status}: ${errBody.slice(0, 200)}`,
          updated_at: new Date().toISOString(),
        }),
      });

      return NextResponse.json(
        { detail: errorDesc },
        { status: 502 }
      );
    }

    const geminiJson = await geminiRes.json();
    const candidateText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Pusta odpowiedź od modelu AI.");
    }

    let analysis = JSON.parse(candidateText);
    if (Array.isArray(analysis) && analysis.length > 0) analysis = analysis[0];

    // Rozpoznani mówcy i cel
    let diagnosedPolitician = targetPerson;
    const speakers = analysis.rozpoznani_mowcy || [];
    let selectedSpeakerTag = analysis.wybrany_speaker_tag || null;

    if (!diagnosedPolitician) {
      const targetSpeaker = speakers.find((s: any) => s.jest_celem);
      if (targetSpeaker && targetSpeaker.imie_nazwisko) {
        diagnosedPolitician = targetSpeaker.imie_nazwisko;
        selectedSpeakerTag = targetSpeaker.speaker_tag;
      }
    }

    const fallbackTitle = cleanUrl
      ? `Wywiad: ${diagnosedPolitician || cleanUrl.slice(0, 30)}`
      : isAudio
      ? `Nagranie audio: ${diagnosedPolitician || "Podcast / wywiad radiowy"}`
      : `Przechwycenie: ${diagnosedPolitician || "Nagranie VOD"}`;
    const videoTitle = analysis.tytul_wideo || title || fallbackTitle;
    const duration = analysis.czas_trwania_sek || 600;

    // 3. Zapisz profil psychometryczny w Supabase
    const wnioski = analysis.wnioski || {};
    const mkt = analysis.marketing_polityczny || {};
    const plusy = mkt.glowne_plusy || [];
    const minusy = mkt.popelnione_bledy_i_minusy || [];

    const profileEntry = {
      id: crypto.randomUUID(),
      recording_id: recordingId,
      otwartosc: 50,
      sumiennosc: 50,
      ekstrawersja: 50,
      ugodowosc: 50,
      neurotyzm: 50,
      dominacja_vs_uleglosc: 0.0,
      wrogosc_vs_cieplo: 0.0,
      nastroj_glowny_prosty: wnioski.nastroje_i_emocje || "Opanowany i skupiony",
      styl_komunikacji_prosty: wnioski.glowne_uniki_i_taktyka || "Rzeczowy i bezpośredni",
      czule_punkty_i_leki: minusy,
      mocne_strony: plusy,
      glowne_uniki_i_taktyka: wnioski.glowne_uniki_i_taktyka || null,
      spojnosc_mowy_ze_slowami: wnioski.spojnosc_mowy_ze_slowami || null,
      skutecznosc_argumentacji: wnioski.sila_argumentacji || null,
      perswazyjnosc_odbiorcow: wnioski.czy_odbiorcy_to_kupia || null,
      radzenie_z_adwersarzami: wnioski.pojedynek_z_adwersarzami || null,
      surowe_wnioski_ai: analysis,
    };

    await fetch(`${SUPABASE_URL}/rest/v1/psychometric_profiles`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileEntry),
    });

    // 4. Zaktualizuj stan nagrania w Supabase na ZAKOŃCZONE
    const updatedRec = {
      tytul: videoTitle,
      czas_trwania_sek: duration,
      polityk_docelowy: diagnosedPolitician,
      speaker_docelowy_tag: selectedSpeakerTag,
      rozpoznani_mowcy: speakers,
      format_materialu: formatMaterialuFinal,
      status_przetwarzania: "ZAKONCZONE",
      krok_postepu: isAudio ? "Analiza akustyczna głosu i profilowanie zakończone sukcesem." : "Analiza behawioralna i profilowanie zakończone sukcesem.",
      procent_postepu: 100,
      blad: null,
      updated_at: new Date().toISOString(),
    };

    await fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${recordingId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedRec),
    });

    return NextResponse.json({
      ...initialRec,
      ...updatedRec,
      psychometric_profile: profileEntry,
    });
  } catch (error: any) {
    console.error("Błąd przetwarzania serverless analyze:", error);
    return NextResponse.json(
      { detail: error?.message || "Wystąpił błąd podczas analizy materiału." },
      { status: 500 }
    );
  }
}
