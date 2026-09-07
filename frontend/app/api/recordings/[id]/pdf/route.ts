import { NextResponse } from "next/server";
import { generateRecordingPdf } from "@/lib/pdfReport";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zrkyyopftellntxxwgmo.supabase.co";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Brak identyfikatora nagrania." }, { status: 400 });
    }

    const url = new URL(request.url);
    const relationParam = url.searchParams.get("relation") as "sojusznik" | "przeciwnik" | null;

    // Pobranie danych nagrania wraz z profilem psychometrycznym
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/recordings?id=eq.${id}&select=*,psychometric_profile:psychometric_profiles(*)`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Nie udało się odpytać bazy danych o nagranie." },
        { status: 502 }
      );
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "Nagranie nie zostało odnalezione w bazie danych." },
        { status: 404 }
      );
    }

    const recording = rows[0];
    const pdfBuffer = await generateRecordingPdf(recording, relationParam);

    const safeTarget = (recording.polityk_docelowy || "Raport")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const isAdv = relationParam === "przeciwnik" || recording.relacja_polityka === "przeciwnik";
    const relPrefix = isAdv ? "E-PROFILER_OPONENT" : "E-PROFILER_AUDYT";
    const filename = `${relPrefix}_${safeTarget}_${id.slice(0, 8)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Błąd generowania raportu PDF:", err);
    return NextResponse.json(
      { error: err?.message || "Wystąpił błąd podczas generowania pliku PDF." },
      { status: 500 }
    );
  }
}
