import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zrkyyopftellntxxwgmo.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora nagrania." }, { status: 400 });
    }

    const payload = await request.json();
    const updateRecording: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.speaker_tag) updateRecording.speaker_docelowy_tag = payload.speaker_tag;
    if (payload.imie_nazwisko) updateRecording.polityk_docelowy = payload.imie_nazwisko;
    if (payload.rola) updateRecording.rola_polityka = payload.rola;
    // Tabela recordings w Supabase nie ma kolumny relacja_polityka — nie wysyłamy jej tutaj!

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
      // 1. Zaktualizuj metadane w tabeli recordings
      if (Object.keys(updateRecording).length > 1) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify(updateRecording),
          }
        );
      }

      // 2. Jeśli przekazano nową relację (sojusznik / przeciwnik), zapisz ją w psychometric_profiles
      if (payload.relacja) {
        try {
          const pRes = await fetch(
            `${SUPABASE_URL}/rest/v1/psychometric_profiles?recording_id=eq.${id}&select=id,surowe_wnioski_ai`,
            {
              headers: {
                apikey: SUPABASE_SERVICE_ROLE,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
              },
            }
          );
          if (pRes.ok) {
            const profiles = await pRes.json();
            if (profiles && profiles.length > 0) {
              const prof = profiles[0];
              const surowe = typeof prof.surowe_wnioski_ai === "object" && prof.surowe_wnioski_ai !== null
                ? prof.surowe_wnioski_ai
                : {};
              const updatedSurowe = {
                ...surowe,
                relacja_polityka: payload.relacja,
              };
              await fetch(
                `${SUPABASE_URL}/rest/v1/psychometric_profiles?id=eq.${prof.id}`,
                {
                  method: "PATCH",
                  headers: {
                    apikey: SUPABASE_SERVICE_ROLE,
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
                    "Content-Type": "application/json",
                    Prefer: "return=minimal",
                  },
                  body: JSON.stringify({ surowe_wnioski_ai: updatedSurowe }),
                }
              );
            }
          }
        } catch (pErr) {
          console.warn("Błąd zapisu relacji w psychometric_profiles:", pErr);
        }
      }

      // 3. Pobierz pełne nagranie z profilami, markerami i segmentami
      const fullRes = await fetch(
        `${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}&select=*,psychometric_profile:psychometric_profiles(*),markers(*),segments(*)`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          },
        }
      );

      if (fullRes.ok) {
        const rows = await fullRes.json();
        if (rows && rows.length > 0) {
          const row = rows[0];
          let profile = row.psychometric_profile;
          if (Array.isArray(profile)) profile = profile[0] || null;
          return NextResponse.json({
            ...row,
            relacja_polityka: payload.relacja || profile?.surowe_wnioski_ai?.relacja_polityka || "sojusznik",
            psychometric_profile: profile,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      id,
      ...updateRecording,
      relacja_polityka: payload.relacja || "sojusznik",
    });
  } catch (err: any) {
    console.error("Błąd aktualizacji mówcy w Supabase:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
