import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

interface GeneratePdfOptions {
  recording: any;
}

function resolveFontPath(fontFilename: string): string {
  // Sprawdź ścieżki public/fonts oraz assets/fonts
  const candidates = [
    path.join(process.cwd(), "public/fonts", fontFilename),
    path.join(process.cwd(), "assets/fonts", fontFilename),
    path.join(process.cwd(), "frontend/public/fonts", fontFilename),
    path.join(process.cwd(), "frontend/assets/fonts", fontFilename),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

export async function generateRecordingPdf(recording: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const profile = Array.isArray(recording.psychometric_profile)
        ? recording.psychometric_profile[0]
        : recording.psychometric_profile;

      const rawAi = profile?.surowe_wnioski_ai || {};
      const mkt = rawAi.marketing_polityczny || {};
      const wnioski = rawAi.wnioski || {};

      const targetName = recording.polityk_docelowy || "Główny badany polityk";
      const roleName = recording.rola_polityka || "Badany polityk";
      const topicName = rawAi.temat_rozmowy || recording.tytul || "Wystąpienie publiczne";
      const durationMin = recording.czas_trwania_sek
        ? Math.round(recording.czas_trwania_sek / 60)
        : null;

      const doc = new PDFDocument({
        size: "A4",
        margin: 36,
        bufferPages: true,
        info: {
          Title: `E-PROFILER • Raport: ${targetName}`,
          Author: "E-PROFILER Multimodal Intelligence",
          Subject: "Forensic Speech & Behavior Audit",
        },
      });

      const regularFont = resolveFontPath("font-regular.ttf");
      const boldFont = resolveFontPath("font-bold.ttf");

      if (fs.existsSync(regularFont)) {
        doc.registerFont("Regular", regularFont);
      }
      if (fs.existsSync(boldFont)) {
        doc.registerFont("Bold", boldFont);
      }

      const fontR = fs.existsSync(regularFont) ? "Regular" : "Helvetica";
      const fontB = fs.existsSync(boldFont) ? "Bold" : "Helvetica-Bold";

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const pageWidth = 595.28;
      const margin = 36;
      const contentWidth = pageWidth - margin * 2;

      // Sprawdzenie i automatyczne przejście do nowej strony przy braku miejsca
      const ensureSpace = (heightNeeded: number) => {
        if (doc.y + heightNeeded > 780) {
          doc.addPage();
          doc.y = 45;
        }
      };

      // 1. GŁÓWNY BANER NAGŁÓWKA (Masthead)
      doc.rect(margin, 36, contentWidth, 85).fill("#0f172a");
      doc.fillColor("#38bdf8").font(fontB).fontSize(8).text("E-PROFILER • FORENSIC BEHAVIORAL & SPEECH INTELLIGENCE", 50, 48);
      doc.fillColor("#ffffff").font(fontB).fontSize(14).text("Raport audytu wystąpienia i marketingu politycznego", 50, 62, { width: contentWidth - 28 });
      doc.fillColor("#94a3b8").font(fontR).fontSize(8.5).text(
        `Osoba diagnozowana: ${targetName} • Rola: ${roleName}${durationMin ? ` • Czas trwania: ${durationMin} min` : ""}`,
        50,
        84,
        { width: contentWidth - 28 }
      );
      doc.fillColor("#64748b").font(fontR).fontSize(8).text(
        `Materiał źródłowy: ${recording.tytul}`,
        50,
        98,
        { width: contentWidth - 28, ellipsis: true }
      );

      doc.y = 135;

      // 2. KARTA WERDYKTU I OCENY SZTABOWEJ
      const score = mkt.ocena_punktowa_1_10 ?? 6;
      const verdict = mkt.werdykt || "Występ poprawny z zastrzeżeniami";
      const justification = mkt.uzasadnienie_werdyktu || "";

      doc.rect(margin, doc.y, contentWidth, 75).fillAndStroke("#f8fafc", "#e2e8f0");
      const boxTop = doc.y;

      doc.fillColor("#0f172a").font(fontB).fontSize(26).text(`${score}/10`, 52, boxTop + 14);
      doc.fillColor("#64748b").font(fontB).fontSize(7.5).text("OCENA SZTABOWA", 52, boxTop + 45);

      doc.fillColor("#0891b2").font(fontB).fontSize(11).text(verdict, 145, boxTop + 14);
      doc.fillColor("#334155").font(fontR).fontSize(8.5).text(justification, 145, boxTop + 32, { width: contentWidth - 165 });

      doc.y = boxTop + 88;

      // 3. SYNTEZA BEHAWIORALNA (NASTROJE, UNIKI, SPÓJNOŚĆ)
      ensureSpace(80);
      doc.fillColor("#0f172a").font(fontB).fontSize(11.5).text("Diagnoza psychologiczna i postawa komunikacyjna", margin, doc.y);
      doc.y += 4;

      if (wnioski.nastroje_i_emocje) {
        doc.fillColor("#475569").font(fontB).fontSize(8.5).text("Nastrój i stabilność emocjonalna:", margin + 6, doc.y);
        doc.y += 2;
        doc.fillColor("#1e293b").font(fontR).fontSize(8.5).text(wnioski.nastroje_i_emocje, margin + 6, doc.y, { width: contentWidth - 12 });
        doc.y += 5;
      }

      if (wnioski.glowne_uniki_i_taktyka) {
        doc.fillColor("#475569").font(fontB).fontSize(8.5).text("Strategia rozmowy i taktyka odpowiedzi:", margin + 6, doc.y);
        doc.y += 2;
        doc.fillColor("#1e293b").font(fontR).fontSize(8.5).text(wnioski.glowne_uniki_i_taktyka, margin + 6, doc.y, { width: contentWidth - 12 });
        doc.y += 5;
      }

      if (wnioski.spojnosc_mowy_ze_slowami) {
        doc.fillColor("#475569").font(fontB).fontSize(8.5).text("Spójność tonu głosu z treścią wypowiedzi:", margin + 6, doc.y);
        doc.y += 2;
        doc.fillColor("#1e293b").font(fontR).fontSize(8.5).text(wnioski.spojnosc_mowy_ze_slowami, margin + 6, doc.y, { width: contentWidth - 12 });
        doc.y += 8;
      }

      // 4. GŁÓWNE ATUTY (Mocne strony)
      const plusy = mkt.glowne_plusy || [];
      if (plusy.length > 0) {
        ensureSpace(60);
        doc.fillColor("#0f172a").font(fontB).fontSize(11.5).text("Mocne strony i atuty wizerunkowe", margin, doc.y);
        doc.y += 5;

        for (const plus of plusy) {
          ensureSpace(45);
          doc.fillColor("#15803d").font(fontB).fontSize(9.5).text(`✓ ${plus.nazwa_atutu || "Atut"}`, margin + 6, doc.y);
          doc.y += 2;
          if (plus.cytat_lub_moment) {
            doc.fillColor("#475569").font(fontR).fontSize(8).text(`Dowód: „${plus.cytat_lub_moment}”`, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 2;
          }
          if (plus.dlaczego_to_plus) {
            doc.fillColor("#1e293b").font(fontR).fontSize(8.5).text(plus.dlaczego_to_plus, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 6;
          }
        }
        doc.y += 4;
      }

      // 5. POPEŁNIONE BŁĘDY I MINUSY
      const minusy = mkt.popelnione_bledy_i_minusy || [];
      if (minusy.length > 0) {
        ensureSpace(60);
        doc.fillColor("#0f172a").font(fontB).fontSize(11.5).text("Błędy, słabości i chwile słabości", margin, doc.y);
        doc.y += 5;

        for (const minus of minusy) {
          ensureSpace(45);
          doc.fillColor("#be123c").font(fontB).fontSize(9.5).text(`✗ ${minus.nazwa_bledu || "Błąd"}`, margin + 6, doc.y);
          doc.y += 2;
          if (minus.cytat_lub_moment) {
            doc.fillColor("#475569").font(fontR).fontSize(8).text(`Moment / cytat: „${minus.cytat_lub_moment}”`, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 2;
          }
          if (minus.dlaczego_to_minus) {
            doc.fillColor("#1e293b").font(fontR).fontSize(8.5).text(minus.dlaczego_to_minus, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 6;
          }
        }
        doc.y += 4;
      }

      // 6. NIEPOŻĄDANE EMOCJE I MOWA CIAŁA / GŁOS
      const emocje = mkt.niepozadane_emocje_i_mowa_ciala || [];
      if (emocje.length > 0) {
        ensureSpace(60);
        doc.fillColor("#0f172a").font(fontB).fontSize(11.5).text("Wycieki emocjonalne i mowa ciała / intonacja", margin, doc.y);
        doc.y += 5;

        for (const emo of emocje) {
          ensureSpace(50);
          doc.fillColor("#b45309").font(fontB).fontSize(9.5).text(`⚠ ${emo.reakcja_lub_emocja || "Wyciek emocjonalny"}`, margin + 6, doc.y);
          doc.y += 2;
          if (emo.cytat_lub_moment) {
            doc.fillColor("#475569").font(fontR).fontSize(8).text(`Moment: „${emo.cytat_lub_moment}”`, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 2;
          }
          if (emo.dlaczego_to_szkodliwe) {
            doc.fillColor("#1e293b").font(fontR).fontSize(8.5).text(`Wpływ: ${emo.dlaczego_to_szkodliwe}`, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 2;
          }
          if (emo.zalecenie_sztabowe) {
            doc.fillColor("#0369a1").font(fontB).fontSize(8).text(`Zalecenie: ${emo.zalecenie_sztabowe}`, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 6;
          }
        }
        doc.y += 4;
      }

      // 7. AMUNICJA DLA OPONENTÓW ('SAMOBÓJE')
      const amunicja = mkt.amunicja_dla_oponentow || [];
      if (amunicja.length > 0) {
        ensureSpace(60);
        doc.fillColor("#0f172a").font(fontB).fontSize(11.5).text("Powierzchnia ataku — amunicja dla oponentów", margin, doc.y);
        doc.y += 5;

        for (const am of amunicja) {
          ensureSpace(40);
          doc.fillColor("#be123c").font(fontB).fontSize(8.5).text(`Ryzykowny cytat: „${am.cytat_ryzykowny || ""}”`, margin + 6, doc.y, { width: contentWidth - 12 });
          doc.y += 2;
          if (am.potencjalne_uderzenie_opozycji) {
            doc.fillColor("#475569").font(fontR).fontSize(8.5).text(`Ryzyko uderzenia: ${am.potencjalne_uderzenie_opozycji}`, margin + 14, doc.y, { width: contentWidth - 20 });
            doc.y += 6;
          }
        }
        doc.y += 4;
      }

      // 8. GOTOWE RIPOSTY SZTABOWE ("ZAMIAST X -> MÓW Y")
      const riposty = mkt.gotowe_riposty_zamiast_bledow || [];
      if (riposty.length > 0) {
        ensureSpace(60);
        doc.fillColor("#0f172a").font(fontB).fontSize(11.5).text("Skrypty naprawcze — gotowe riposty sztabowe", margin, doc.y);
        doc.y += 5;

        for (const rip of riposty) {
          ensureSpace(55);
          if (rip.kontekst_pytania) {
            doc.fillColor("#64748b").font(fontB).fontSize(8).text(`Pytanie: ${rip.kontekst_pytania}`, margin + 6, doc.y, { width: contentWidth - 12 });
            doc.y += 2;
          }
          if (rip.co_powiedzial) {
            doc.fillColor("#991b1b").font(fontR).fontSize(8).text(`Błędna odpowiedź: „${rip.co_powiedzial}”`, margin + 12, doc.y, { width: contentWidth - 18 });
            doc.y += 2;
          }
          if (rip.rekomendowana_riposta) {
            doc.fillColor("#15803d").font(fontB).fontSize(8.5).text(`Rekomendacja: ${rip.rekomendowana_riposta}`, margin + 12, doc.y, { width: contentWidth - 18 });
            doc.y += 6;
          }
        }
        doc.y += 4;
      }

      // 9. REKOMENDACJE SZTABOWE
      const rekomendacje = mkt.rekomendacje_sztabowe || [];
      if (rekomendacje.length > 0) {
        ensureSpace(60);
        doc.fillColor("#0f172a").font(fontB).fontSize(11.5).text("Strategiczne rekomendacje sztabowe", margin, doc.y);
        doc.y += 5;

        rekomendacje.forEach((rek: string, idx: number) => {
          ensureSpace(30);
          doc.fillColor("#0369a1").font(fontB).fontSize(9).text(`${idx + 1}. `, margin + 6, doc.y, { continued: true });
          doc.fillColor("#1e293b").font(fontR).fontSize(8.5).text(rek, { width: contentWidth - 24 });
          doc.y += 4;
        });
        doc.y += 6;
      }

      // 10. NOTA PRAWNA I METODOLOGIA
      ensureSpace(40);
      doc.fillColor("#94a3b8").font(fontR).fontSize(7).text(
        "Nota metodologiczna: Niniejszy raport został wygenerowany automatycznie przez system multimodalnej analizy behawioralnej E-PROFILER w celach analityczno-doradczych zgodnie z art. 85 RODO oraz wymogami AI Act.",
        margin,
        doc.y,
        { width: contentWidth, align: "justify" }
      );

      // 11. STOPKA I PAGINACJA NA KAŻDEJ STRONIE
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(margin, 805).lineTo(pageWidth - margin, 805).stroke();
        doc.fillColor("#64748b").font(fontR).fontSize(7.5).text(
          "E-PROFILER • Copyright by Multinewsroom (multinewsroom.pl)",
          margin,
          812
        );
        doc.font(fontB).text(`Strona ${i + 1} z ${totalPages}`, pageWidth - margin - 120, 812, {
          align: "right",
          width: 120,
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
