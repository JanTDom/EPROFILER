import { Recording, ProgressEventPayload, RecordingType } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export async function fetchRecordings(): Promise<Recording[]> {
  const res = await fetch(`${API_BASE}/api/recordings`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Błąd pobierania listy nagrań: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRecording(id: string): Promise<Recording> {
  const res = await fetch(`${API_BASE}/api/recordings/${id}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Błąd pobierania nagrania: ${res.statusText}`);
  }
  return res.json();
}

export async function createRecordingFromUrl(data: {
  url: string;
  tytul?: string;
  typ_nagrania: RecordingType;
  data_publikacji?: string;
  tryb_biometryczny?: boolean;
}): Promise<Recording> {
  const res = await fetch(`${API_BASE}/api/recordings/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      tryb_biometryczny: data.tryb_biometryczny ?? true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Nie udało się zakolejkować nagrania z URL.");
  }
  return res.json();
}

export async function uploadRecordingFile(formData: FormData): Promise<Recording> {
  const res = await fetch(`${API_BASE}/api/recordings/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Nie udało się przesłać pliku nagrania.");
  }
  return res.json();
}

export function subscribeToProgress(
  recordingId: string,
  onUpdate: (data: ProgressEventPayload) => void,
  onComplete: (data: ProgressEventPayload) => void,
  onError?: (err: any) => void
): () => void {
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
}

export function getVideoUrl(recordingId: string): string {
  return `${API_BASE}/api/media/${recordingId}/video`;
}
