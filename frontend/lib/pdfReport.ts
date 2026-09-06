import { PDFDocument, rgb, PDFFont, PDFPage, Color } from "pdf-lib";
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
  const paragraphs = text.split("\n");
  const allLines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) allLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) allLines.push(currentLine);
  }
  return allLines;
}

interface AtomicCardOptions {
  badgeLabel: string;
  badgeBg: Color;
  badgeFg: Color;
  accentColor: Color;
  bgCard: Color;
  borderCard: Color;
  title: string;
  quote?: string | null;
  description?: string | null;
  extraBox?: {
    label: string;
    text: string;
    bgColor: Color;
    textColor: Color;
    accentBar?: Color;
  } | null;
}

export async function generateRecordingPdf(recording: any): Promise<Uint8Array> {
  const profile = Array.isArray(recording.psychometric_profile)
    ? recording.psychometric_profile[0]
    : recording.psychometric_profile;

  const rawAi = profile?.surowe_wnioski_ai || {};
  const mkt = rawAi.marketing_polityczny || {};
  const wnioski = rawAi.wnioski || {};
  const psychometrics = rawAi.profil_psychometryczny_wielka_piatka || {};

  const targetName = recording.polityk_docelowy || "Główny badany polityk";
  const roleName = recording.rola_polityka || "Badany gość";
  const durationMin = recording.czas_trwania_sek
    ? Math.round(recording.czas_trwania_sek / 60)
    : null;
  const isAudio = recording.format_materialu === "audio";

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
  const bottomMargin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Funkcja tworzenia nowej strony z eleganckim nagłówkiem bieżącym (Running header)
  const addReportPage = (): PDFPage => {
    const newPage = doc.addPage([pageWidth, pageHeight]);

    // Bieżący nagłówek na stronach 2+
    newPage.drawText("E-PROFILER • Raport audytu i wywiadu behawioralnego", {
      x: margin,
      y: pageHeight - 24,
      size: 7,
      font: fontB,
      color: rgb(0.35, 0.42, 0.52),
    });

    const headerRight = `Badany: ${targetName}`;
    const hrWidth = fontR.widthOfTextAtSize(headerRight, 7);
    newPage.drawText(headerRight, {
      x: pageWidth - margin - hrWidth,
      y: pageHeight - 24,
      size: 7,
      font: fontR,
      color: rgb(0.45, 0.52, 0.62),
    });

    newPage.drawLine({
      start: { x: margin, y: pageHeight - 30 },
      end: { x: pageWidth - margin, y: pageHeight - 30 },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.94),
    });

    y = pageHeight - 48;
    return newPage;
  };

  // 1. BANER NAGŁÓWKA NA STRONIE 1 (Executive Masthead)
  const headerHeight = 84;
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
    size: 13,
    font: fontB,
    color: rgb(1, 1, 1),
  });

  page.drawText(
    `Osoba diagnozowana: ${targetName} • Rola: ${roleName}${durationMin ? ` • Czas: ${durationMin} min` : ""} • Format: ${isAudio ? "Ścieżka dźwiękowa (audio)" : "Materiał wideo (FACS)"}`,
    {
      x: margin + 14,
      y: y - 56,
      size: 8,
      font: fontR,
      color: rgb(0.68, 0.74, 0.82),
    }
  );

  const titleLines = wrapText(`Materiał: ${recording.tytul}`, fontR, 7.5, contentWidth - 28);
  if (titleLines[0]) {
    page.drawText(titleLines[0], {
      x: margin + 14,
      y: y - 70,
      size: 7.5,
      font: fontR,
      color: rgb(0.45, 0.52, 0.62),
    });
  }

  y -= headerHeight + 14;

  // 2. KARTA WERDYKTU I OCENY SZTABOWEJ
  const score = typeof mkt.ocena_punktowa_1_10 === "number" ? mkt.ocena_punktowa_1_10 : 6;
  const verdict = mkt.werdykt || "Występ poprawny z zastrzeżeniami";
  const justification = mkt.uzasadnienie_werdyktu || "";
  const justLines = wrapText(justification, fontR, 8.5, contentWidth - 140);
  const verdictHeight = Math.max(72, 38 + justLines.length * 11.5);

  page.drawRectangle({
    x: margin,
    y: y - verdictHeight,
    width: contentWidth,
    height: verdictHeight,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.86, 0.89, 0.94),
    borderWidth: 1,
  });

  // Lewy akcent werdyktu
  const scoreColor =
    score >= 7
      ? rgb(0.06, 0.58, 0.35)
      : score >= 5
      ? rgb(0.85, 0.45, 0.08)
      : rgb(0.82, 0.12, 0.23);

  page.drawRectangle({
    x: margin,
    y: y - verdictHeight,
    width: 4,
    height: verdictHeight,
    color: scoreColor,
  });

  // Blok punktowy
  page.drawText(`${score}/10`, {
    x: margin + 18,
    y: y - 36,
    size: 24,
    font: fontB,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText("OCENA SZTABOWA", {
    x: margin + 18,
    y: y - 52,
    size: 6.5,
    font: fontB,
    color: rgb(0.42, 0.48, 0.58),
  });

  page.drawText(verdict, {
    x: margin + 115,
    y: y - 24,
    size: 10.5,
    font: fontB,
    color: scoreColor,
  });

  let curJY = y - 38;
  for (const line of justLines) {
    page.drawText(line, {
      x: margin + 115,
      y: curJY,
      size: 8.5,
      font: fontR,
      color: rgb(0.18, 0.23, 0.31),
    });
    curJY -= 11.5;
  }

  y -= verdictHeight + 14;

  // Profil psychometryczny Big Five (kompaktowy pasek wskaźników)
  if (psychometrics.otwartosc || psychometrics.ekstrawersja) {
    const barHeight = 32;
    page.drawRectangle({
      x: margin,
      y: y - barHeight,
      width: contentWidth,
      height: barHeight,
      color: rgb(0.94, 0.96, 0.98),
      borderColor: rgb(0.86, 0.89, 0.93),
      borderWidth: 0.5,
    });

    const traits = [
      { label: "Otwartość", val: psychometrics.otwartosc ?? 50 },
      { label: "Sumienność", val: psychometrics.sumiennosc ?? 50 },
      { label: "Ekstrawersja", val: psychometrics.ekstrawersja ?? 50 },
      { label: "Ugodowość", val: psychometrics.ugodowosc ?? 50 },
      { label: "Neurotyczność", val: psychometrics.neurotyzm ?? 50 },
    ];

    const colWidth = contentWidth / traits.length;
    traits.forEach((t, i) => {
      const colX = margin + i * colWidth + 8;
      page.drawText(t.label, {
        x: colX,
        y: y - 13,
        size: 7,
        font: fontR,
        color: rgb(0.38, 0.44, 0.54),
      });
      page.drawText(`${t.val}%`, {
        x: colX,
        y: y - 25,
        size: 9,
        font: fontB,
        color: rgb(0.08, 0.12, 0.2),
      });
    });

    y -= barHeight + 14;
  }

  // Funkcja nagłówka sekcji z OCHRONĄ PRZED SIEROTAMI (Keep with next)
  const renderSectionHeading = (
    title: string,
    minFirstContentHeight = 70,
    accentColor = rgb(0.06, 0.09, 0.16)
  ) => {
    const needed = 36 + minFirstContentHeight;
    if (y - needed < bottomMargin) {
      page = addReportPage();
    }

    page.drawRectangle({
      x: margin,
      y: y - 16,
      width: 3.5,
      height: 14,
      color: accentColor,
    });

    page.drawText(title, {
      x: margin + 10,
      y: y - 14,
      size: 11,
      font: fontB,
      color: rgb(0.06, 0.09, 0.16),
    });

    page.drawLine({
      start: { x: margin, y: y - 22 },
      end: { x: margin + contentWidth, y: y - 22 },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.94),
    });

    y -= 32;
  };

  // GŁÓWNY SILNIK ATOMOWYCH KART RAPORTU (Atomic Card Engine)
  const renderAtomicCard = (opts: AtomicCardOptions) => {
    const paddingX = 14;
    const paddingY = 10;
    const usableWidth = contentWidth - paddingX * 2;

    const badgeTextWidth = fontB.widthOfTextAtSize(opts.badgeLabel, 6.5);
    const badgePillWidth = badgeTextWidth + 12;

    const titleLines = wrapText(opts.title, fontB, 9.5, usableWidth);
    const quoteLines = opts.quote
      ? wrapText(`„${opts.quote}”`, fontR, 8, usableWidth - 16)
      : [];
    const quoteBoxHeight = quoteLines.length > 0 ? 12 + quoteLines.length * 11 : 0;

    const descLines = opts.description
      ? wrapText(opts.description, fontR, 8.5, usableWidth)
      : [];
    const descHeight = descLines.length * 12;

    const extraLines = opts.extraBox
      ? wrapText(`${opts.extraBox.label}: ${opts.extraBox.text}`, fontB, 8, usableWidth - 16)
      : [];
    const extraBoxHeight = extraLines.length > 0 ? 12 + extraLines.length * 11 : 0;

    // Obliczenie całkowitej wysokości karty
    let cardHeight = paddingY * 2;
    cardHeight += 13; // wysokość badge'a
    cardHeight += 5; // odstęp pod badgem
    cardHeight += titleLines.length * 13; // tytuł
    if (quoteBoxHeight > 0) cardHeight += quoteBoxHeight + 8;
    if (descHeight > 0) cardHeight += descHeight + 6;
    if (extraBoxHeight > 0) cardHeight += extraBoxHeight + 8;

    // Sprawdzenie podziału strony przed narysowaniem karty
    if (y - cardHeight < bottomMargin) {
      page = addReportPage();
    }

    // Tło karty
    page.drawRectangle({
      x: margin,
      y: y - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: opts.bgCard,
      borderColor: opts.borderCard,
      borderWidth: 0.5,
    });

    // Lewy kolorowy pasek akcentujący
    page.drawRectangle({
      x: margin,
      y: y - cardHeight,
      width: 3.5,
      height: cardHeight,
      color: opts.accentColor,
    });

    let curY = y - paddingY;

    // Badge pill
    page.drawRectangle({
      x: margin + paddingX,
      y: curY - 13,
      width: badgePillWidth,
      height: 13,
      color: opts.badgeBg,
    });

    page.drawText(opts.badgeLabel, {
      x: margin + paddingX + 6,
      y: curY - 9.5,
      size: 6.5,
      font: fontB,
      color: opts.badgeFg,
    });

    curY -= 13 + 6;

    // Tytuł w sentence case
    for (const line of titleLines) {
      page.drawText(line, {
        x: margin + paddingX,
        y: curY,
        size: 9.5,
        font: fontB,
        color: rgb(0.08, 0.12, 0.2),
      });
      curY -= 13;
    }

    // Pudełko cytatu
    if (quoteLines.length > 0) {
      curY -= 4;
      page.drawRectangle({
        x: margin + paddingX,
        y: curY - quoteBoxHeight + 2,
        width: usableWidth,
        height: quoteBoxHeight,
        color: rgb(0.93, 0.95, 0.97),
      });

      page.drawRectangle({
        x: margin + paddingX,
        y: curY - quoteBoxHeight + 2,
        width: 2,
        height: quoteBoxHeight,
        color: opts.accentColor,
      });

      let qY = curY - 9;
      for (const ql of quoteLines) {
        page.drawText(ql, {
          x: margin + paddingX + 8,
          y: qY,
          size: 8,
          font: fontR,
          color: rgb(0.25, 0.3, 0.38),
        });
        qY -= 11;
      }
      curY -= quoteBoxHeight + 6;
    }

    // Opis / dekonstrukcja
    if (descLines.length > 0) {
      for (const dl of descLines) {
        page.drawText(dl, {
          x: margin + paddingX,
          y: curY,
          size: 8.5,
          font: fontR,
          color: rgb(0.18, 0.23, 0.31),
        });
        curY -= 12;
      }
      curY -= 4;
    }

    // Blok akcji / riposty / zalecenia
    if (extraLines.length > 0 && opts.extraBox) {
      page.drawRectangle({
        x: margin + paddingX,
        y: curY - extraBoxHeight + 2,
        width: usableWidth,
        height: extraBoxHeight,
        color: opts.extraBox.bgColor,
      });

      if (opts.extraBox.accentBar) {
        page.drawRectangle({
          x: margin + paddingX,
          y: curY - extraBoxHeight + 2,
          width: 2,
          height: extraBoxHeight,
          color: opts.extraBox.accentBar,
        });
      }

      let eY = curY - 9;
      for (const el of extraLines) {
        page.drawText(el, {
          x: margin + paddingX + 8,
          y: eY,
          size: 8,
          font: fontB,
          color: opts.extraBox.textColor,
        });
        eY -= 11;
      }
      curY -= extraBoxHeight + 4;
    }

    // Odstęp między kartami
    y -= cardHeight + 10;
  };

  // 3. SYNTEZA BEHAWIORALNA I POSTAWA KOMUNIKACYJNA
  const wnioskiList = [
    { label: "Nastrój i stabilność emocjonalna", text: wnioski.nastroje_i_emocje },
    { label: "Strategia rozmowy i taktyka odpowiedzi", text: wnioski.glowne_uniki_i_taktyka },
    { label: "Czułe punkty i momenty stresu", text: wnioski.czule_punkty_stres },
    { label: "Spójność tonu głosu z treścią wypowiedzi", text: wnioski.spojnosc_mowy_ze_slowami },
    { label: "Siła i logika argumentacji", text: wnioski.sila_argumentacji },
    { label: "Wiarygodność w oczach odbiorców", text: wnioski.czy_odbiorcy_to_kupia },
    { label: "Pojedynek z adwersarzami i kontrola nad studiem", text: wnioski.pojedynek_z_adwersarzami },
  ].filter((w) => Boolean(w.text));

  if (wnioskiList.length > 0) {
    renderSectionHeading("Diagnoza psychologiczna i postawa komunikacyjna", 90, rgb(0.1, 0.4, 0.65));

    for (const item of wnioskiList) {
      renderAtomicCard({
        badgeLabel: "DIAGNOZA",
        badgeBg: rgb(0.85, 0.91, 0.96),
        badgeFg: rgb(0.08, 0.35, 0.58),
        accentColor: rgb(0.12, 0.45, 0.7),
        bgCard: rgb(0.98, 0.99, 1.0),
        borderCard: rgb(0.88, 0.92, 0.96),
        title: item.label,
        description: item.text,
      });
    }
  }

  // 4. MOCNE STRONY I ATUTY WIZERUNKOWE (Plusy)
  const plusy = mkt.glowne_plusy || [];
  if (plusy.length > 0) {
    renderSectionHeading("Mocne strony i atuty wizerunkowe", 90, rgb(0.06, 0.55, 0.32));

    plusy.forEach((plus: any, idx: number) => {
      renderAtomicCard({
        badgeLabel: `ATUT #${idx + 1}`,
        badgeBg: rgb(0.86, 0.95, 0.89),
        badgeFg: rgb(0.06, 0.48, 0.25),
        accentColor: rgb(0.08, 0.58, 0.32),
        bgCard: rgb(0.98, 0.99, 0.98),
        borderCard: rgb(0.86, 0.93, 0.88),
        title: plus.nazwa_atutu || plus.tytul || `Atut wizerunkowy #${idx + 1}`,
        quote: plus.cytat_lub_moment || plus.cytat,
        description: plus.dlaczego_to_plus || plus.wyjasnienie,
      });
    });
  }

  // 5. BŁĘDY, SŁABOŚCI I DEKOMPOZYCJA (Minusy)
  const minusy = mkt.popelnione_bledy_i_minusy || [];
  if (minusy.length > 0) {
    renderSectionHeading("Błędy, słabości i chwile dekompozycji", 90, rgb(0.82, 0.12, 0.23));

    minusy.forEach((min: any, idx: number) => {
      renderAtomicCard({
        badgeLabel: `BŁĄD #${idx + 1}`,
        badgeBg: rgb(0.97, 0.88, 0.89),
        badgeFg: rgb(0.72, 0.1, 0.18),
        accentColor: rgb(0.82, 0.12, 0.23),
        bgCard: rgb(0.99, 0.97, 0.97),
        borderCard: rgb(0.95, 0.86, 0.88),
        title: min.nazwa_bledu || min.tytul || `Błąd wizerunkowy #${idx + 1}`,
        quote: min.cytat_lub_moment || min.cytat,
        description: min.dlaczego_to_minus || min.wyjasnienie,
      });
    });
  }

  // 6. WYCIEKI EMOCJONALNE, MOWA CIAŁA I TON GŁOSU
  const emocje = mkt.niepozadane_emocje_i_mowa_ciala || [];
  if (emocje.length > 0) {
    renderSectionHeading("Wycieki emocjonalne, mowa ciała i ton głosu", 90, rgb(0.85, 0.45, 0.08));

    emocje.forEach((emo: any, idx: number) => {
      renderAtomicCard({
        badgeLabel: `WYCIEK #${idx + 1}`,
        badgeBg: rgb(0.98, 0.91, 0.84),
        badgeFg: rgb(0.75, 0.38, 0.06),
        accentColor: rgb(0.85, 0.45, 0.08),
        bgCard: rgb(0.99, 0.98, 0.96),
        borderCard: rgb(0.95, 0.89, 0.83),
        title: emo.reakcja_lub_emocja || `Wyciek emocjonalny #${idx + 1}`,
        quote: emo.cytat_lub_moment,
        description: emo.dlaczego_to_szkodliwe,
        extraBox: emo.zalecenie_sztabowe
          ? {
              label: "Zalecenie sztabowe",
              text: emo.zalecenie_sztabowe,
              bgColor: rgb(0.93, 0.96, 0.98),
              textColor: rgb(0.08, 0.35, 0.58),
              accentBar: rgb(0.12, 0.48, 0.75),
            }
          : null,
      });
    });
  }

  // 7. NIELOGICZNOŚCI, LUKI ARGUMENTACYJNE I MANIPULACJE
  const luki = mkt.nielogicznosci_i_luki_argumentacyjne || [];
  if (luki.length > 0) {
    renderSectionHeading("Nielogiczności, luki argumentacyjne i manipulacje", 90, rgb(0.55, 0.2, 0.72));

    luki.forEach((luka: any, idx: number) => {
      renderAtomicCard({
        badgeLabel: `LUKA LOGICZNA #${idx + 1}`,
        badgeBg: rgb(0.94, 0.88, 0.97),
        badgeFg: rgb(0.48, 0.15, 0.65),
        accentColor: rgb(0.55, 0.2, 0.72),
        bgCard: rgb(0.99, 0.98, 1.0),
        borderCard: rgb(0.92, 0.86, 0.95),
        title: luka.luka_lub_sprzecznosc || `Błąd logiczny #${idx + 1}`,
        quote: luka.cytat_lub_moment,
        description: luka.diagnoza_logiczna,
        extraBox: luka.ryzyko_kontrataku
          ? {
              label: "Ryzyko kontrataku",
              text: luka.ryzyko_kontrataku,
              bgColor: rgb(0.98, 0.9, 0.92),
              textColor: rgb(0.72, 0.1, 0.18),
              accentBar: rgb(0.82, 0.12, 0.23),
            }
          : null,
      });
    });
  }

  // 8. POWIERZCHNIA ATAKU — AMUNICJA DLA OPONENTÓW ('SAMOBÓJE')
  const amunicja = mkt.amunicja_dla_oponentow || [];
  if (amunicja.length > 0) {
    renderSectionHeading("Powierzchnia ataku — amunicja dla oponentów", 90, rgb(0.72, 0.1, 0.15));

    amunicja.forEach((am: any, idx: number) => {
      renderAtomicCard({
        badgeLabel: `AMUNICJA DLA OPONENTÓW #${idx + 1}`,
        badgeBg: rgb(0.97, 0.86, 0.88),
        badgeFg: rgb(0.68, 0.08, 0.14),
        accentColor: rgb(0.72, 0.1, 0.15),
        bgCard: rgb(0.99, 0.97, 0.97),
        borderCard: rgb(0.94, 0.84, 0.86),
        title: "Ryzykowny cytat podatny na wycięcie w mediach",
        quote: am.cytat_ryzykowny,
        description: am.potencjalne_uderzenie_opozycji,
      });
    });
  }

  // 9. SKRYPTY NAPRAWCZE — GOTOWE RIPOSTY SZTABOWE
  const riposty = mkt.gotowe_riposty_zamiast_bledow || [];
  if (riposty.length > 0) {
    renderSectionHeading("Skrypty naprawcze — gotowe riposty sztabowe", 90, rgb(0.03, 0.48, 0.72));

    riposty.forEach((rip: any, idx: number) => {
      renderAtomicCard({
        badgeLabel: `SKRYPT #${idx + 1}`,
        badgeBg: rgb(0.86, 0.92, 0.98),
        badgeFg: rgb(0.04, 0.38, 0.62),
        accentColor: rgb(0.03, 0.48, 0.72),
        bgCard: rgb(0.97, 0.98, 1.0),
        borderCard: rgb(0.85, 0.9, 0.96),
        title: rip.kontekst_pytania ? `Pytanie: ${rip.kontekst_pytania}` : `Sytuacja trudna #${idx + 1}`,
        quote: rip.co_powiedzial ? `Błędna wypowiedź: ${rip.co_powiedzial}` : null,
        extraBox: rip.rekomendowana_riposta
          ? {
              label: "Rekomendowana riposta sztabowa",
              text: rip.rekomendowana_riposta,
              bgColor: rgb(0.92, 0.97, 0.94),
              textColor: rgb(0.06, 0.48, 0.25),
              accentBar: rgb(0.08, 0.58, 0.32),
            }
          : null,
      });
    });
  }

  // 10. WARSZTAT MEDIALNY, NOŚNOŚĆ CYTATÓW I WPŁYW NA ELEKTORAT
  if (mkt.warsztat_mowy_i_dykcji || mkt.nosnosc_medialna_soundbites || mkt.wplyw_na_elektorat) {
    renderSectionHeading("Warsztat medialny, nośność cytatów i wpływ na elektorat", 90, rgb(0.2, 0.3, 0.45));

    if (mkt.warsztat_mowy_i_dykcji) {
      renderAtomicCard({
        badgeLabel: "WARSZTAT",
        badgeBg: rgb(0.9, 0.92, 0.96),
        badgeFg: rgb(0.18, 0.25, 0.38),
        accentColor: rgb(0.25, 0.35, 0.52),
        bgCard: rgb(0.98, 0.98, 0.99),
        borderCard: rgb(0.88, 0.9, 0.94),
        title: "Warsztat mowy, dykcja, tempo i pauzy retoryczne",
        description: mkt.warsztat_mowy_i_dykcji,
      });
    }

    if (mkt.nosnosc_medialna_soundbites) {
      renderAtomicCard({
        badgeLabel: "SOUNDBITES",
        badgeBg: rgb(0.96, 0.91, 0.82),
        badgeFg: rgb(0.65, 0.4, 0.05),
        accentColor: rgb(0.8, 0.5, 0.08),
        bgCard: rgb(0.99, 0.98, 0.96),
        borderCard: rgb(0.94, 0.9, 0.84),
        title: "Kluczowa nośna 'setka' do serwisów informacyjnych",
        description: mkt.nosnosc_medialna_soundbites,
      });
    }

    if (mkt.wplyw_na_elektorat) {
      const el = mkt.wplyw_na_elektorat;
      if (el.twardy_elektorat) {
        renderAtomicCard({
          badgeLabel: "ELEKTORAT BAZOWY",
          badgeBg: rgb(0.88, 0.94, 0.98),
          badgeFg: rgb(0.08, 0.38, 0.62),
          accentColor: rgb(0.12, 0.45, 0.72),
          bgCard: rgb(0.98, 0.99, 1.0),
          borderCard: rgb(0.88, 0.92, 0.96),
          title: "Odbiór przez twardy elektorat",
          description: el.twardy_elektorat,
        });
      }
      if (el.niezdecydowani) {
        renderAtomicCard({
          badgeLabel: "WYBORCY CENTRUM",
          badgeBg: rgb(0.96, 0.93, 0.86),
          badgeFg: rgb(0.6, 0.42, 0.08),
          accentColor: rgb(0.78, 0.52, 0.1),
          bgCard: rgb(0.99, 0.98, 0.96),
          borderCard: rgb(0.94, 0.9, 0.85),
          title: "Odbiór przez wyborców niezdecydowanych (centrum)",
          description: el.niezdecydowani,
        });
      }
      if (el.przeciwnicy) {
        renderAtomicCard({
          badgeLabel: "OPONENCI",
          badgeBg: rgb(0.97, 0.88, 0.88),
          badgeFg: rgb(0.7, 0.12, 0.16),
          accentColor: rgb(0.8, 0.15, 0.2),
          bgCard: rgb(0.99, 0.97, 0.97),
          borderCard: rgb(0.94, 0.86, 0.87),
          title: "Odbiór i amunicja dla elektoratu oponentów",
          description: el.przeciwnicy,
        });
      }
    }
  }

  // 11. STRATEGICZNE REKOMENDACJE SZTABOWE
  const rekomendacje = mkt.rekomendacje_sztabowe || [];
  if (rekomendacje.length > 0) {
    renderSectionHeading("Strategiczne rekomendacje sztabowe", 90, rgb(0.06, 0.09, 0.16));

    rekomendacje.forEach((rek: string, idx: number) => {
      renderAtomicCard({
        badgeLabel: `DYREKTYWA #${idx + 1}`,
        badgeBg: rgb(0.9, 0.92, 0.95),
        badgeFg: rgb(0.18, 0.24, 0.34),
        accentColor: rgb(0.12, 0.18, 0.28),
        bgCard: rgb(0.98, 0.99, 0.99),
        borderCard: rgb(0.88, 0.91, 0.94),
        title: `Dyrektywa sztabowa #${idx + 1}`,
        description: rek,
      });
    });
  }

  // 12. NOTA METODOLOGICZNA I KLAUZULA PRAWNA
  const disclaimers = wrapText(
    "Nota metodologiczna: Raport sporządzony automatycznie przez system E-PROFILER w oparciu o multimodalną analizę behawioralną, akustykę głosu i retorykę wystąpienia. Zgodnie z art. 85 RODO oraz wymogami AI Act dokument ma charakter analityczno-doradczy.",
    fontR,
    7,
    contentWidth - 20
  );
  const discHeight = 16 + disclaimers.length * 9.5;
  if (y - discHeight < bottomMargin) {
    page = addReportPage();
  }

  page.drawRectangle({
    x: margin,
    y: y - discHeight,
    width: contentWidth,
    height: discHeight,
    color: rgb(0.96, 0.97, 0.98),
    borderColor: rgb(0.88, 0.91, 0.94),
    borderWidth: 0.5,
  });

  let dY = y - 12;
  for (const l of disclaimers) {
    page.drawText(l, {
      x: margin + 10,
      y: dY,
      size: 7,
      font: fontR,
      color: rgb(0.48, 0.54, 0.62),
    });
    dY -= 9.5;
  }

  // 13. STOPKA I PAGINACJA NA KAŻDEJ STRONIE (Footers)
  const totalPages = doc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = doc.getPage(i);

    p.drawLine({
      start: { x: margin, y: 28 },
      end: { x: pageWidth - margin, y: 28 },
      thickness: 0.5,
      color: rgb(0.88, 0.91, 0.94),
    });

    p.drawText("E-PROFILER • System wywiadu behawioralnego i audytu sztabowego (eprofiler.pl)", {
      x: margin,
      y: 18,
      size: 7,
      font: fontR,
      color: rgb(0.42, 0.48, 0.56),
    });

    const pageText = `Strona ${i + 1} z ${totalPages}`;
    const pWidth = fontB.widthOfTextAtSize(pageText, 7.5);
    p.drawText(pageText, {
      x: pageWidth - margin - pWidth,
      y: 18,
      size: 7.5,
      font: fontB,
      color: rgb(0.18, 0.23, 0.31),
    });
  }

  return await doc.save();
}
