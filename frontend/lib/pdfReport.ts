import { PDFDocument, rgb, PDFFont, PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import path from "path";
import fs from "fs";

function resolveFontPath(fontFilename: string): string {
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

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateRecordingPdf(recording: any): Promise<Uint8Array> {
  const profile = Array.isArray(recording.psychometric_profile)
    ? recording.psychometric_profile[0]
    : recording.psychometric_profile;

  const rawAi = profile?.surowe_wnioski_ai || {};
  const mkt = rawAi.marketing_polityczny || {};
  const wnioski = rawAi.wnioski || {};

  const targetName = recording.polityk_docelowy || "Główny badany polityk";
  const roleName = recording.rola_polityka || "Badany polityk";
  const durationMin = recording.czas_trwania_sek
    ? Math.round(recording.czas_trwania_sek / 60)
    : null;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regPath = resolveFontPath("font-regular.ttf");
  const boldPath = resolveFontPath("font-bold.ttf");

  const fontRegBytes = fs.readFileSync(regPath);
  const fontBoldBytes = fs.readFileSync(boldPath);

  const fontR = await doc.embedFont(fontRegBytes);
  const fontB = await doc.embedFont(fontBoldBytes);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const checkPageBreak = (neededHeight: number): void => {
    if (y - neededHeight < 55) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // 1. BANER NAGŁÓWKA (Masthead)
  const headerHeight = 82;
  page.drawRectangle({
    x: margin,
    y: y - headerHeight,
    width: contentWidth,
    height: headerHeight,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText("E-PROFILER • FORENSIC BEHAVIORAL & SPEECH INTELLIGENCE", {
    x: margin + 14,
    y: y - 20,
    size: 7.5,
    font: fontB,
    color: rgb(0.22, 0.74, 0.97),
  });

  page.drawText("Raport audytu wystąpienia i marketingu politycznego", {
    x: margin + 14,
    y: y - 38,
    size: 13.5,
    font: fontB,
    color: rgb(1, 1, 1),
  });

  page.drawText(
    `Osoba diagnozowana: ${targetName} • Rola: ${roleName}${durationMin ? ` • Czas: ${durationMin} min` : ""}`,
    {
      x: margin + 14,
      y: y - 56,
      size: 8.5,
      font: fontR,
      color: rgb(0.58, 0.64, 0.72),
    }
  );

  const titleLines = wrapText(`Materiał: ${recording.tytul}`, fontR, 7.5, contentWidth - 28);
  if (titleLines[0]) {
    page.drawText(titleLines[0], {
      x: margin + 14,
      y: y - 70,
      size: 7.5,
      font: fontR,
      color: rgb(0.39, 0.45, 0.55),
    });
  }

  y -= headerHeight + 14;

  // 2. KARTA WERDYKTU I OCENY SZTABOWEJ
  const score = mkt.ocena_punktowa_1_10 ?? 6;
  const verdict = mkt.werdykt || "Występ poprawny z zastrzeżeniami";
  const justification = mkt.uzasadnienie_werdyktu || "";
  const justLines = wrapText(justification, fontR, 8.5, contentWidth - 140);
  const verdictHeight = Math.max(70, 36 + justLines.length * 11);

  page.drawRectangle({
    x: margin,
    y: y - verdictHeight,
    width: contentWidth,
    height: verdictHeight,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.88, 0.91, 0.94),
    borderWidth: 1,
  });

  page.drawText(`${score}/10`, {
    x: margin + 16,
    y: y - 36,
    size: 26,
    font: fontB,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText("OCENA SZTABOWA", {
    x: margin + 16,
    y: y - 52,
    size: 7,
    font: fontB,
    color: rgb(0.39, 0.45, 0.55),
  });

  page.drawText(verdict, {
    x: margin + 110,
    y: y - 24,
    size: 10.5,
    font: fontB,
    color: rgb(0.03, 0.57, 0.7),
  });

  let curJY = y - 38;
  for (const line of justLines) {
    page.drawText(line, {
      x: margin + 110,
      y: curJY,
      size: 8.5,
      font: fontR,
      color: rgb(0.2, 0.25, 0.33),
    });
    curJY -= 11;
  }

  y -= verdictHeight + 16;

  // Funkcja pomocnicza do sekcji
  const renderSectionHeading = (title: string, color = rgb(0.06, 0.09, 0.16)) => {
    checkPageBreak(30);
    page.drawText(title, {
      x: margin,
      y: y - 10,
      size: 11,
      font: fontB,
      color,
    });
    page.drawLine({
      start: { x: margin, y: y - 14 },
      end: { x: margin + contentWidth, y: y - 14 },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.94),
    });
    y -= 24;
  };

  // 3. SYNTEZA BEHAWIORALNA
  if (
    wnioski.nastroje_i_emocje ||
    wnioski.glowne_uniki_i_taktyka ||
    wnioski.czule_punkty_stres ||
    wnioski.spojnosc_mowy_ze_slowami ||
    wnioski.sila_argumentacji ||
    wnioski.czy_odbiorcy_to_kupia ||
    wnioski.pojedynek_z_adwersarzami
  ) {
    renderSectionHeading("Diagnoza psychologiczna i postawa komunikacyjna");

    const renderInsight = (label: string, text: string) => {
      if (!text) return;
      const lines = wrapText(text, fontR, 8.5, contentWidth - 16);
      checkPageBreak(20 + lines.length * 11);

      page.drawText(label, {
        x: margin + 4,
        y: y - 8,
        size: 8,
        font: fontB,
        color: rgb(0.28, 0.33, 0.41),
      });
      y -= 12;

      for (const l of lines) {
        page.drawText(l, {
          x: margin + 4,
          y: y - 8,
          size: 8.5,
          font: fontR,
          color: rgb(0.12, 0.16, 0.23),
        });
        y -= 11;
      }
      y -= 4;
    };

    renderInsight("Nastrój i stabilność emocjonalna:", wnioski.nastroje_i_emocje);
    renderInsight("Strategia rozmowy i taktyka odpowiedzi:", wnioski.glowne_uniki_i_taktyka);
    renderInsight("Czułe punkty i momenty stresu:", wnioski.czule_punkty_stres);
    renderInsight("Spójność tonu głosu z treścią wypowiedzi:", wnioski.spojnosc_mowy_ze_slowami);
    renderInsight("Siła i logika argumentacji:", wnioski.sila_argumentacji);
    renderInsight("Wiarygodność w oczach odbiorców:", wnioski.czy_odbiorcy_to_kupia);
    renderInsight("Pojedynek z adwersarzami i kontrola nad studiem:", wnioski.pojedynek_z_adwersarzami);
    y -= 6;
  }

  // 4. GŁÓWNE ATUTY
  const plusy = mkt.glowne_plusy || [];
  if (plusy.length > 0) {
    renderSectionHeading("Mocne strony i atuty wizerunkowe", rgb(0.08, 0.5, 0.24));

    for (const plus of plusy) {
      const titleLines = wrapText(`✓ ${plus.nazwa_atutu || "Atut"}`, fontB, 9, contentWidth - 10);
      const quoteLines = plus.cytat_lub_moment ? wrapText(`Dowód: „${plus.cytat_lub_moment}”`, fontR, 8, contentWidth - 20) : [];
      const descLines = plus.dlaczego_to_plus ? wrapText(plus.dlaczego_to_plus, fontR, 8.5, contentWidth - 20) : [];

      const totalH = (titleLines.length + quoteLines.length + descLines.length) * 11 + 10;
      checkPageBreak(totalH);

      for (const l of titleLines) {
        page.drawText(l, { x: margin + 4, y: y - 8, size: 9, font: fontB, color: rgb(0.08, 0.5, 0.24) });
        y -= 11;
      }
      for (const l of quoteLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8, font: fontR, color: rgb(0.28, 0.33, 0.41) });
        y -= 10;
      }
      for (const l of descLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8.5, font: fontR, color: rgb(0.12, 0.16, 0.23) });
        y -= 11;
      }
      y -= 4;
    }
    y -= 6;
  }

  // 5. POPEŁNIONE BŁĘDY I MINUSY
  const minusy = mkt.popelnione_bledy_i_minusy || [];
  if (minusy.length > 0) {
    renderSectionHeading("Błędy, słabości i chwile dekompozycji", rgb(0.75, 0.07, 0.24));

    for (const min of minusy) {
      const titleLines = wrapText(`✗ ${min.nazwa_bledu || "Błąd"}`, fontB, 9, contentWidth - 10);
      const quoteLines = min.cytat_lub_moment ? wrapText(`Moment / cytat: „${min.cytat_lub_moment}”`, fontR, 8, contentWidth - 20) : [];
      const descLines = min.dlaczego_to_minus ? wrapText(min.dlaczego_to_minus, fontR, 8.5, contentWidth - 20) : [];

      const totalH = (titleLines.length + quoteLines.length + descLines.length) * 11 + 10;
      checkPageBreak(totalH);

      for (const l of titleLines) {
        page.drawText(l, { x: margin + 4, y: y - 8, size: 9, font: fontB, color: rgb(0.75, 0.07, 0.24) });
        y -= 11;
      }
      for (const l of quoteLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8, font: fontR, color: rgb(0.28, 0.33, 0.41) });
        y -= 10;
      }
      for (const l of descLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8.5, font: fontR, color: rgb(0.12, 0.16, 0.23) });
        y -= 11;
      }
      y -= 4;
    }
    y -= 6;
  }

  // 6. NIEPOŻĄDANE EMOCJE I MOWA CIAŁA / GŁOS
  const emocje = mkt.niepozadane_emocje_i_mowa_ciala || [];
  if (emocje.length > 0) {
    renderSectionHeading("Wycieki emocjonalne, mowa ciała i ton głosu", rgb(0.7, 0.33, 0.04));

    for (const emo of emocje) {
      const titleLines = wrapText(`⚠ ${emo.reakcja_lub_emocja || "Wyciek emocjonalny"}`, fontB, 9, contentWidth - 10);
      const quoteLines = emo.cytat_lub_moment ? wrapText(`Moment: „${emo.cytat_lub_moment}”`, fontR, 8, contentWidth - 20) : [];
      const descLines = emo.dlaczego_to_szkodliwe ? wrapText(`Wpływ: ${emo.dlaczego_to_szkodliwe}`, fontR, 8.5, contentWidth - 20) : [];
      const adviceLines = emo.zalecenie_sztabowe ? wrapText(`Zalecenie: ${emo.zalecenie_sztabowe}`, fontB, 8, contentWidth - 20) : [];

      const totalH = (titleLines.length + quoteLines.length + descLines.length + adviceLines.length) * 11 + 10;
      checkPageBreak(totalH);

      for (const l of titleLines) {
        page.drawText(l, { x: margin + 4, y: y - 8, size: 9, font: fontB, color: rgb(0.7, 0.33, 0.04) });
        y -= 11;
      }
      for (const l of quoteLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8, font: fontR, color: rgb(0.28, 0.33, 0.41) });
        y -= 10;
      }
      for (const l of descLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8.5, font: fontR, color: rgb(0.12, 0.16, 0.23) });
        y -= 11;
      }
      for (const l of adviceLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8, font: fontB, color: rgb(0.01, 0.41, 0.63) });
        y -= 10;
      }
      y -= 4;
    }
    y -= 6;
  }

  // 7. NIELOGICZNOŚCI I LUKI ARGUMENTACYJNE
  const luki = mkt.nielogicznosci_i_luki_argumentacyjne || [];
  if (luki.length > 0) {
    renderSectionHeading("Nielogiczności, luki argumentacyjne i manipulacje", rgb(0.55, 0.15, 0.6));

    for (const luka of luki) {
      const titleLines = wrapText(`§ ${luka.luka_lub_sprzecznosc || "Błąd logiczny"}`, fontB, 9, contentWidth - 10);
      const quoteLines = luka.cytat_lub_moment ? wrapText(`Fragment: „${luka.cytat_lub_moment}”`, fontR, 8, contentWidth - 20) : [];
      const diagLines = luka.diagnoza_logiczna ? wrapText(`Diagnoza: ${luka.diagnoza_logiczna}`, fontR, 8.5, contentWidth - 20) : [];
      const riskLines = luka.ryzyko_kontrataku ? wrapText(`Ryzyko kontrataku: ${luka.ryzyko_kontrataku}`, fontB, 8, contentWidth - 20) : [];

      const totalH = (titleLines.length + quoteLines.length + diagLines.length + riskLines.length) * 11 + 10;
      checkPageBreak(totalH);

      for (const l of titleLines) {
        page.drawText(l, { x: margin + 4, y: y - 8, size: 9, font: fontB, color: rgb(0.55, 0.15, 0.6) });
        y -= 11;
      }
      for (const l of quoteLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8, font: fontR, color: rgb(0.28, 0.33, 0.41) });
        y -= 10;
      }
      for (const l of diagLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8.5, font: fontR, color: rgb(0.12, 0.16, 0.23) });
        y -= 11;
      }
      for (const l of riskLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8, font: fontB, color: rgb(0.75, 0.07, 0.24) });
        y -= 10;
      }
      y -= 4;
    }
    y -= 6;
  }

  // 8. AMUNICJA DLA OPONENTÓW ('SAMOBÓJE')
  const amunicja = mkt.amunicja_dla_oponentow || [];
  if (amunicja.length > 0) {
    renderSectionHeading("Powierzchnia ataku — amunicja dla oponentów", rgb(0.75, 0.07, 0.24));

    for (const am of amunicja) {
      const qLines = am.cytat_ryzykowny ? wrapText(`Ryzykowny cytat: „${am.cytat_ryzykowny}”`, fontB, 8.5, contentWidth - 10) : [];
      const rLines = am.potencjalne_uderzenie_opozycji ? wrapText(`Ryzyko kontrataku: ${am.potencjalne_uderzenie_opozycji}`, fontR, 8.5, contentWidth - 20) : [];

      const totalH = (qLines.length + rLines.length) * 11 + 10;
      checkPageBreak(totalH);

      for (const l of qLines) {
        page.drawText(l, { x: margin + 4, y: y - 8, size: 8.5, font: fontB, color: rgb(0.6, 0.11, 0.11) });
        y -= 11;
      }
      for (const l of rLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8.5, font: fontR, color: rgb(0.28, 0.33, 0.41) });
        y -= 11;
      }
      y -= 4;
    }
    y -= 6;
  }

  // 9. GOTOWE RIPOSTY SZTABOWE ("ZAMIAST X -> MÓW Y")
  const riposty = mkt.gotowe_riposty_zamiast_bledow || [];
  if (riposty.length > 0) {
    renderSectionHeading("Skrypty naprawcze — gotowe riposty sztabowe", rgb(0.01, 0.41, 0.63));

    for (const rip of riposty) {
      const qLines = rip.kontekst_pytania ? wrapText(`Pytanie: ${rip.kontekst_pytania}`, fontB, 8, contentWidth - 10) : [];
      const badLines = rip.co_powiedzial ? wrapText(`Błędna odpowiedź: „${rip.co_powiedzial}”`, fontR, 8, contentWidth - 20) : [];
      const goodLines = rip.rekomendowana_riposta ? wrapText(`Rekomendacja sztabowa: ${rip.rekomendowana_riposta}`, fontB, 8.5, contentWidth - 20) : [];

      const totalH = (qLines.length + badLines.length + goodLines.length) * 11 + 10;
      checkPageBreak(totalH);

      for (const l of qLines) {
        page.drawText(l, { x: margin + 4, y: y - 8, size: 8, font: fontB, color: rgb(0.39, 0.45, 0.55) });
        y -= 10;
      }
      for (const l of badLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8, font: fontR, color: rgb(0.6, 0.11, 0.11) });
        y -= 10;
      }
      for (const l of goodLines) {
        page.drawText(l, { x: margin + 12, y: y - 8, size: 8.5, font: fontB, color: rgb(0.08, 0.5, 0.24) });
        y -= 11;
      }
      y -= 4;
    }
    y -= 6;
  }

  // 10. WARSZTAT MOWY I WPŁYW NA ELEKTORAT
  if (mkt.warsztat_mowy_i_dykcji || mkt.nosnosc_medialna_soundbites || mkt.wplyw_na_elektorat) {
    renderSectionHeading("Warsztat medialny, nośność cytatów i wpływ na elektorat");

    const renderBlock = (label: string, text: string) => {
      if (!text) return;
      const lines = wrapText(text, fontR, 8.5, contentWidth - 16);
      checkPageBreak(20 + lines.length * 11);

      page.drawText(label, {
        x: margin + 4,
        y: y - 8,
        size: 8,
        font: fontB,
        color: rgb(0.28, 0.33, 0.41),
      });
      y -= 12;

      for (const l of lines) {
        page.drawText(l, {
          x: margin + 4,
          y: y - 8,
          size: 8.5,
          font: fontR,
          color: rgb(0.12, 0.16, 0.23),
        });
        y -= 11;
      }
      y -= 4;
    };

    if (mkt.warsztat_mowy_i_dykcji) {
      renderBlock("Warsztat mowy, dykcja i tempo:", mkt.warsztat_mowy_i_dykcji);
    }
    if (mkt.nosnosc_medialna_soundbites) {
      renderBlock("Kluczowa 'setka' i nośność medialna (soundbites):", mkt.nosnosc_medialna_soundbites);
    }
    if (mkt.wplyw_na_elektorat) {
      const el = mkt.wplyw_na_elektorat;
      if (el.twardy_elektorat) renderBlock("Reakcja twardego elektoratu:", el.twardy_elektorat);
      if (el.niezdecydowani) renderBlock("Odbiór przez wyborców niezdecydowanych (centrum):", el.niezdecydowani);
      if (el.przeciwnicy) renderBlock("Odbiór przez oponentów:", el.przeciwnicy);
    }
    y -= 6;
  }

  // 11. REKOMENDACJE SZTABOWE
  const rekomendacje = mkt.rekomendacje_sztabowe || [];
  if (rekomendacje.length > 0) {
    renderSectionHeading("Strategiczne rekomendacje sztabowe");

    rekomendacje.forEach((rek: string, idx: number) => {
      const lines = wrapText(`${idx + 1}. ${rek}`, fontR, 8.5, contentWidth - 12);
      checkPageBreak(lines.length * 11 + 6);

      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], {
          x: margin + 4,
          y: y - 8,
          size: 8.5,
          font: i === 0 ? fontB : fontR,
          color: rgb(0.12, 0.16, 0.23),
        });
        y -= 11;
      }
      y -= 3;
    });
    y -= 6;
  }

  // 12. NOTA METODOLOGICZNA
  checkPageBreak(35);
  const disclaimers = wrapText(
    "Nota metodologiczna: Raport sporządzony automatycznie przez system E-PROFILER w oparciu o multimodalną analizę behawioralną, akustykę głosu i retorykę wystąpienia. Zgodnie z art. 85 RODO oraz wymogami AI Act dokument ma charakter analityczno-doradczy.",
    fontR,
    7,
    contentWidth
  );
  for (const l of disclaimers) {
    page.drawText(l, {
      x: margin,
      y: y - 8,
      size: 7,
      font: fontR,
      color: rgb(0.58, 0.64, 0.72),
    });
    y -= 9;
  }

  // 11. STOPKA I PAGINACJA NA KAŻDEJ STRONIE
  const totalPages = doc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = doc.getPage(i);
    p.drawLine({
      start: { x: margin, y: 28 },
      end: { x: pageWidth - margin, y: 28 },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.94),
    });

    p.drawText("E-PROFILER • Copyright by Multinewsroom (multinewsroom.pl)", {
      x: margin,
      y: 18,
      size: 7.5,
      font: fontR,
      color: rgb(0.39, 0.45, 0.55),
    });

    const pageText = `Strona ${i + 1} z ${totalPages}`;
    const pWidth = fontB.widthOfTextAtSize(pageText, 7.5);
    p.drawText(pageText, {
      x: pageWidth - margin - pWidth,
      y: 18,
      size: 7.5,
      font: fontB,
      color: rgb(0.28, 0.33, 0.41),
    });
  }

  return await doc.save();
}
