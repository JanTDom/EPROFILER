import { Recording, ProgressEventPayload, RecordingType, PoliticianRelation } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zrkyyopftellntxxwgmo.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_PxOsJnTMfNACAoNpay6Whw_GFm_sYTd";

function normalizeRecording(rec: any): Recording {
  if (!rec) return rec;
  let profile = rec.psychometric_profile;
  if (Array.isArray(profile)) {
    profile = profile[0] || undefined;
  }
  return {
    ...rec,
    psychometric_profile: profile,
  };
}

export async function fetchRecordings(profileId: string = 'profile_main'): Promise<Recording[]> {
  // 1. Try Supabase REST first (native cloud database in Vercel)
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const filter = profileId ? `&profile_id=eq.${profileId}` : '';
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/recordings?select=*,psychometric_profile:psychometric_profiles(*)${filter}&order=created_at.desc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        }
      );
      if (res.ok) {
        const list = await res.json();
        return list.map(normalizeRecording);
      }
    } catch (e) {
      console.warn("Supabase fetchRecordings fallback:", e);
    }
  }

  // 2. Fallback to local API_BASE
  try {
    const res = await fetch(`${API_BASE}/api/recordings?profile_id=${profileId}`, { 
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (e) {
    console.warn("API_BASE fetchRecordings failed:", e);
  }

  return [];
}

export async function fetchRecording(id: string): Promise<Recording> {
  // 1. Try Supabase REST first
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}&select=*,psychometric_profile:psychometric_profiles(*),markers(*),segments(*)`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          return normalizeRecording(rows[0]);
        }
      }
    } catch (e) {
      console.warn("Supabase fetchRecording fallback:", e);
    }
  }

  // 2. Fallback to local API_BASE tylko w środowisku deweloperskim na localhost
  const isLocalhost = typeof window !== "undefined"
    ? (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    : process.env.NODE_ENV === "development";

  if (isLocalhost && API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/recordings/${id}`, { 
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return res.json();
      }
    } catch (e) {
      console.warn("API_BASE fetchRecording failed:", e);
    }
  }

  throw new Error("Nagranie nie zostało znalezione lub jest w trakcie inicjalizacji w bazie.");
}

export function sanitizeVideoUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  const trimmed = rawUrl.trim();
  
  // 1. YouTube standard 11-char ID extraction (handles watch?v=, youtu.be/, shorts/, live/, embed/, and double pasted URLs)
  const ytMatch = trimmed.match(/(?:v=|\/vi\/|\/v\/|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/|\/e\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  }

  // 2. Double paste of other http URLs
  if ((trimmed.match(/http/g) || []).length > 1) {
    const urls = trimmed.match(/https?:\/\/[^\s]+/g);
    if (urls && urls.length > 0) {
      return urls[urls.length - 1];
    }
  }

  return trimmed;
}

export async function createRecordingFromUrl(data: {
  url: string;
  tytul?: string;
  typ_nagrania: RecordingType;
  data_publikacji?: string;
  tryb_biometryczny?: boolean;
  zakres_analizy?: "pelny" | "behawioralny";
  polityk_docelowy?: string;
  rola_polityka?: string;
  relacja_polityka?: PoliticianRelation;
  profile_id?: string;
  gemini_api_key?: string;
}): Promise<Recording> {
  const profileId = data.profile_id || 'profile_main';
  const cleanUrl = sanitizeVideoUrl(data.url);
  data.url = cleanUrl;
  const relacja = data.relacja_polityka || "sojusznik";

  // 1. Standalone Cloud Analysis (/api/analyze)
  // Działa w 100% w chmurze na Vercel + Gemini — bez potrzeby Antigravity czy lokalnego uvicorn!
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (data.gemini_api_key) {
      headers["x-gemini-api-key"] = data.gemini_api_key;
    }

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...data,
        url: cleanUrl,
        profile_id: profileId,
        tryb_biometryczny: data.tryb_biometryczny ?? true,
        zakres_analizy: data.zakres_analizy ?? "pelny",
        polityk_docelowy: data.polityk_docelowy?.trim() || undefined,
        rola_polityka: data.rola_polityka?.trim() || "Badany polityk",
        relacja_polityka: relacja,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      return normalizeRecording(created);
    }
    const errData = await res.json().catch(() => ({}));
    if (errData?.detail) {
      throw new Error(errData.detail);
    }
  } catch (e: any) {
    if (e?.message && !e.message.includes("fetch")) {
      throw e;
    }
    console.warn("Cloud /api/analyze fallback:", e);
  }

  // 2. Fallback do lokalnego API jeśli jest włączone
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (data.gemini_api_key) {
      headers["x-gemini-api-key"] = data.gemini_api_key;
    }

    const res = await fetch(`${API_BASE}/api/recordings/url`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...data,
        profile_id: profileId,
        tryb_biometryczny: data.tryb_biometryczny ?? true,
        zakres_analizy: data.zakres_analizy ?? "pelny",
        polityk_docelowy: data.polityk_docelowy?.trim() || undefined,
        rola_polityka: data.rola_polityka?.trim() || "Badany polityk",
        relacja_polityka: relacja,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (e) {
    console.warn("API_BASE unreachable, falling back to Supabase direct insert:", e);
  }

  // Direct Supabase insert
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const newId = crypto.randomUUID();
    const newRec = {
      id: newId,
      zrodlo_typ: "url",
      zrodlo_url: data.url,
      tytul: data.tytul || `Nagranie z URL (${data.url.substring(0, 35)}...)`,
      typ_nagrania: data.typ_nagrania,
      data_publikacji: data.data_publikacji || null,
      czas_trwania_sek: 0,
      status_przetwarzania: "OCZEKUJE",
      krok_postepu: "Zadanie zakolejkowane w systemie",
      procent_postepu: 0,
      profile_id: profileId,
      tryb_biometryczny: data.tryb_biometryczny ?? true,
      zakres_analizy: data.zakres_analizy ?? "pelny",
      polityk_docelowy: data.polityk_docelowy?.trim() || null,
      rola_polityka: data.rola_polityka?.trim() || "Badany polityk",
      relacja_polityka: relacja,
      rozpoznani_mowcy: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/recordings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(newRec),
    });

    if (sRes.ok) {
      const inserted = await sRes.json();
      return inserted[0] || newRec;
    }
  }

  throw new Error("Nie udało się zakolejkować nagrania z URL.");
}

export async function setTargetSpeaker(
  recordingId: string,
  payload: { speaker_tag: string; imie_nazwisko?: string; rola?: string; relacja?: PoliticianRelation }
): Promise<Recording> {
  // 1. Bezpośredni zapis w bazie Supabase jeśli jest skonfigurowana
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (payload.speaker_tag) updateData.speaker_docelowy_tag = payload.speaker_tag;
      if (payload.imie_nazwisko) updateData.polityk_docelowy = payload.imie_nazwisko;
      if (payload.rola) updateData.rola_polityka = payload.rola;
      if (payload.relacja) updateData.relacja_polityka = payload.relacja;

      const sRes = await fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${recordingId}&select=*,psychometric_profile:psychometric_profiles(*),markers(*),segments(*)`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateData),
      });

      if (sRes.ok) {
        const rows = await sRes.json();
        if (rows && rows.length > 0) {
          return normalizeRecording(rows[0]);
        }
      }
    } catch (e) {
      console.warn("Supabase direct updateTargetSpeaker fallback:", e);
    }
  }

  // 2. Fallback do backendu FastAPI
  try {
    const res = await fetch(`${API_BASE}/api/recordings/${recordingId}/target-speaker`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err) {
    console.warn("API_BASE setTargetSpeaker failed:", err);
  }

  // 3. Fallback: Pobierz aktualne nagranie z bazy
  return await fetchRecording(recordingId);
}

export async function uploadRecordingFile(formData: FormData): Promise<Recording> {
  // 1. Standalone Cloud Analysis (/api/analyze)
  // Działa w 100% w chmurze na Vercel z silnikiem AI
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const created = await res.json();
      return normalizeRecording(created);
    }
    const errData = await res.json().catch(() => ({}));
    if (errData?.detail) {
      throw new Error(errData.detail);
    }
  } catch (err: any) {
    if (err?.message && !err.message.includes("fetch")) {
      throw err;
    }
    console.warn("Cloud /api/analyze upload fallback:", err);
  }

  // 2. Fallback do lokalnego API
  try {
    const res = await fetch(`${API_BASE}/api/recordings/upload`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) {
      return res.json();
    }
  } catch (err: any) {
    console.warn("API_BASE upload failed:", err);
  }

  // 3. Fallback do bezpośredniej rejestracji w Supabase
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const newId = crypto.randomUUID();
    const title = (formData.get("tytul") as string) || "Przesłany materiał wideo";
    const newRec = {
      id: newId,
      zrodlo_typ: "plik",
      tytul: title,
      typ_nagrania: (formData.get("typ_nagrania") as string) || "wywiad",
      status_przetwarzania: "OCZEKUJE",
      krok_postepu: "Materiał zarejestrowany w chmurze",
      procent_postepu: 0,
      profile_id: (formData.get("profile_id") as string) || "profile_main",
      polityk_docelowy: (formData.get("polityk_docelowy") as string) || null,
      rola_polityka: (formData.get("rola_polityka") as string) || "Badany polityk",
      relacja_polityka: (formData.get("relacja_polityka") as string) || "sojusznik",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/recordings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(newRec),
    });

    if (sRes.ok) {
      const inserted = await sRes.json();
      return inserted[0] || newRec;
    }
  }

  throw new Error("Nie udało się przesłać pliku nagrania.");
}

export async function deleteRecording(id: string): Promise<boolean> {
  // 1. Try Supabase direct delete
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn("Supabase direct delete failed:", e);
    }
  }

  // 2. Try API_BASE
  try {
    const res = await fetch(`${API_BASE}/api/recordings/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (e) {
    console.warn("API_BASE delete failed:", e);
    return false;
  }
}

export async function retryRecording(recordingId: string): Promise<Recording> {
  const res = await fetch(`${API_BASE}/api/recordings/${recordingId}/retry`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Nie udało się wznowić przetwarzania nagrania.");
  }
  return res.json();
}

export function subscribeToProgress(
  recordingId: string,
  onUpdate: (data: ProgressEventPayload) => void,
  onComplete: (data: ProgressEventPayload) => void,
  onError?: (err: any) => void
): () => void {
  let isClosed = false;

  // 1. W środowisku chmurowym (Vercel + Supabase) odpytuj stan bezpośrednio z bazy
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const pollStatus = async () => {
      if (isClosed) return;
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/recordings?id=eq.${recordingId}&select=status_przetwarzania,krok_postepu,procent_postepu,blad`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            cache: "no-store",
          }
        );
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0) {
            const r = rows[0];
            const payload: ProgressEventPayload = {
              id: recordingId,
              status: r.status_przetwarzania,
              krok: r.krok_postepu || "Trwa analiza...",
              procent: r.procent_postepu || 50,
              blad: r.blad,
            };

            if (r.status_przetwarzania === "ZAKONCZONE" || r.status_przetwarzania === "GOTOWE_DO_TRANSKRYPCJI") {
              onComplete(payload);
              isClosed = true;
              return;
            } else if (r.status_przetwarzania === "BLAD") {
              if (onError) onError(new Error(r.blad || "Wystąpił błąd podczas analizy."));
              isClosed = true;
              return;
            } else {
              onUpdate(payload);
            }
          }
        }
      } catch (e) {
        console.warn("Błąd odpytywania statusu nagrania:", e);
      }
    };

    const intervalId = setInterval(pollStatus, 2500);
    pollStatus();

    return () => {
      isClosed = true;
      clearInterval(intervalId);
    };
  }

  // 2. Lokalny fallback SSE dla środowiska deweloperskiego
  try {
    const eventSource = new EventSource(`${API_BASE}/api/progress/${recordingId}`);

    eventSource.addEventListener("update", (event) => {
      try {
        const data: ProgressEventPayload = JSON.parse(event.data);
        onUpdate(data);
      } catch (e) {
        console.error("Błąd parsowania zdarzenia SSE update", e);
      }
    });

    eventSource.addEventListener("complete", (event) => {
      try {
        const data: ProgressEventPayload = JSON.parse(event.data);
        onComplete(data);
        eventSource.close();
      } catch (e) {
        console.error("Błąd parsowania zdarzenia SSE complete", e);
      }
    });

    eventSource.onerror = (err) => {
      if (onError) onError(err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  } catch (err) {
    console.warn("Nie udało się utworzyć EventSource:", err);
    return () => {};
  }
}

export function getVideoUrl(recordingId: string): string {
  return `${API_BASE}/api/media/${recordingId}/video`;
}

export function getRecordingPdfUrl(recordingId: string): string {
  return `/api/recordings/${recordingId}/pdf`;
}
