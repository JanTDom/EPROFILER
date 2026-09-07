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
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.speaker_tag) updateData.speaker_docelowy_tag = payload.speaker_tag;
    if (payload.imie_nazwisko) updateData.polityk_docelowy = payload.imie_nazwisko;
    if (payload.rola) updateData.rola_polityka = payload.rola;
    if (payload.relacja) updateData.relacja_polityka = payload.relacja;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
      const sRes = await fetch(
        `${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}&select=*,psychometric_profile:psychometric_profiles(*)`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (sRes.ok) {
        const rows = await sRes.json();
        if (rows && rows.length > 0) {
          return NextResponse.json(rows[0]);
        }
      }
    }

    return NextResponse.json({ success: true, ...updateData });
  } catch (err: any) {
    console.error("Błąd aktualizacji mówcy w Supabase:", err);
    return NextResponse.json({ error: err.message || "Błąd serwera" }, { status: 500 });
  }
}
