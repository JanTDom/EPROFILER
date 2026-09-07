import io
import os
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
    PageBreak
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def _setup_fonts():
    """Rejestruje font TrueType obsługujący polskie znaki diakrytyczne (UTF-8)."""
    font_name = "ProfilerFont"
    bold_font_name = "ProfilerFontBold"
    
    font_candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    ]
    bold_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    ]
    
    selected_font = None
    for path in font_candidates:
        if os.path.exists(path):
            selected_font = path
            break
            
    selected_bold = None
    for path in bold_candidates:
        if os.path.exists(path):
            selected_bold = path
            break
            
    if selected_font:
        try:
            pdfmetrics.registerFont(TTFont(font_name, selected_font))
            pdfmetrics.registerFont(TTFont(bold_font_name, selected_bold or selected_font))
            return font_name, bold_font_name
        except Exception:
            pass
            
    return "Helvetica", "Helvetica-Bold"


class NumberedCanvas(canvas.Canvas):
    """Dwubiegowy canvas zapewniający eleganckie nagłówki i stopki ze statystyką 'Strona X z Y'."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        
        # Paginacja i stopka (na wszystkich stronach)
        self.setFont("ProfilerFont", 7.5)
        self.setFillColor(colors.HexColor("#94a3b8"))
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 30, 595 - 36, 30)
        
        self.drawString(36, 18, "E-PROFILER • Copyright by Multinewsroom (multinewsroom.pl)")
        self.setFont("ProfilerFontBold", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawRightString(595 - 36, 18, f"Strona {self._pageNumber} z {page_count}")
        
        # Górny nagłówek (od strony 2 wzwyż)
        if self._pageNumber > 1:
            self.line(36, 812, 595 - 36, 812)
            self.setFont("ProfilerFont", 7.5)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawString(36, 818, "E-PROFILER • Raport audytu wystąpienia i marketingu politycznego")
            self.drawRightString(595 - 36, 818, "DOKUMENT ANALITYCZNY • POUFNE")
            
        self.restoreState()


class ReportPDFGenerator:
    def __init__(self):
        self.font_regular, self.font_bold = _setup_fonts()

    def build_story(self, recording: Any) -> list:
        """Kompiluje listę elementów raportu o standardzie executive dossier."""
        styles = getSampleStyleSheet()
        
        # Paleta kolorystyczna
        c_slate_900 = colors.HexColor("#0f172a")
        c_slate_800 = colors.HexColor("#1e293b")
        c_slate_700 = colors.HexColor("#334155")
        c_slate_500 = colors.HexColor("#64748b")
        c_slate_400 = colors.HexColor("#94a3b8")
        c_slate_100 = colors.HexColor("#f1f5f9")
        c_slate_50  = colors.HexColor("#f8fafc")
        
        c_cyan_600  = colors.HexColor("#0891b2")
        c_cyan_50   = colors.HexColor("#ecfeff")
        c_cyan_200  = colors.HexColor("#a5f3fc")
        
        c_emerald_700 = colors.HexColor("#15803d")
        c_emerald_600 = colors.HexColor("#16a34a")
        c_emerald_50  = colors.HexColor("#f0fdf4")
        c_emerald_200 = colors.HexColor("#bbf7d0")
        
        c_rose_700  = colors.HexColor("#be123c")
        c_rose_600  = colors.HexColor("#e11d48")
        c_rose_50   = colors.HexColor("#fff1f2")
        c_rose_200  = colors.HexColor("#fecdd3")
        
        c_amber_700 = colors.HexColor("#b45309")
        c_amber_50  = colors.HexColor("#fffbeb")
        c_amber_200 = colors.HexColor("#fde68a")
        
        c_indigo_700 = colors.HexColor("#4338ca")
        c_indigo_50  = colors.HexColor("#eef2ff")
        c_indigo_200 = colors.HexColor("#c7d2fe")

        # Style typograficzne (zgodne z regułą sentence case)
        s_masthead_tag = ParagraphStyle(
            "MastheadTag",
            fontName=self.font_bold,
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#38bdf8"),
            spaceAfter=3
        )
        s_masthead_title = ParagraphStyle(
            "MastheadTitle",
            fontName=self.font_bold,
            fontSize=16,
            leading=20,
            textColor=colors.white,
            spaceAfter=4
        )
        s_masthead_sub = ParagraphStyle(
            "MastheadSub",
            fontName=self.font_regular,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#94a3b8")
        )
        s_section_title = ParagraphStyle(
            "SectionTitle",
            fontName=self.font_bold,
            fontSize=11.5,
            leading=15,
            textColor=c_slate_900,
            spaceBefore=12,
            spaceAfter=3,
            keepWithNext=True
        )
        s_section_desc = ParagraphStyle(
            "SectionDesc",
            fontName=self.font_regular,
            fontSize=8,
            leading=11,
            textColor=c_slate_500,
            spaceAfter=7,
            keepWithNext=True
        )
        s_body = ParagraphStyle(
            "Body",
            fontName=self.font_regular,
            fontSize=8.5,
            leading=12.5,
            textColor=c_slate_700
        )
        s_body_bold = ParagraphStyle(
            "BodyBold",
            fontName=self.font_bold,
            fontSize=8.5,
            leading=12.5,
            textColor=c_slate_900
        )
        s_quote = ParagraphStyle(
            "Quote",
            fontName=self.font_regular,
            fontSize=8,
            leading=11.5,
            textColor=c_slate_700
        )
        s_verdict_score = ParagraphStyle(
            "VerdictScore",
            fontName=self.font_bold,
            fontSize=28,
            leading=30,
            textColor=c_slate_900,
            alignment=1
        )
        s_verdict_label = ParagraphStyle(
            "VerdictLabel",
            fontName=self.font_bold,
            fontSize=7.5,
            leading=9,
            textColor=c_slate_500,
            alignment=1
        )
        s_card_title_plus = ParagraphStyle(
            "CardTitlePlus",
            fontName=self.font_bold,
            fontSize=9.5,
            leading=13,
            textColor=c_emerald_700
        )
        s_card_title_minus = ParagraphStyle(
            "CardTitleMinus",
            fontName=self.font_bold,
            fontSize=9.5,
            leading=13,
            textColor=c_rose_700
        )

        elements = []

        # Pobranie danych profilu
        profile = getattr(recording, "psychometric_profile", None)
        raw_ai = (profile.surowe_wnioski_ai if profile else {}) or {}
        mkt = raw_ai.get("marketing_polityczny", {})
        adv = raw_ai.get("analiza_przeciwnika", {})
        relacja = getattr(recording, "relacja_polityka", None) or ("przeciwnik" if adv else "sojusznik")
        is_adversary = relacja == "przeciwnik" or bool(adv)
        wnioski = raw_ai.get("wnioski", {})
        
        target_name = recording.polityk_docelowy or "Główny badany polityk"
        role_name = recording.rola_polityka or ("Badany oponent" if is_adversary else "Uczestnik wystąpienia")
        topic_name = raw_ai.get("temat_rozmowy") or recording.tytul or "Debata publiczna"
        duration_min = int(recording.czas_trwania_sek // 60)
        duration_sec = int(recording.czas_trwania_sek % 60)

        # 1. Elegancka winieta gabinetowa (Masthead)
        if is_adversary:
            masthead_tag = "E-PROFILER OPPOSITION RESEARCH • SYSTEM WYWIADU SZTABOWEGO"
            masthead_title = f"Raport wywiadu i wektorów ataku na oponenta: {target_name}"
            masthead_sub = f"Status: PRZECIWNIK &nbsp;•&nbsp; Rola: {role_name} &nbsp;•&nbsp; Czas: {duration_min}m {duration_sec}s &nbsp;•&nbsp; Temat: {topic_name}"
            masthead_bg = colors.HexColor("#4c0519") # Deep crimson
        else:
            masthead_tag = "E-PROFILER FORENSIC INTELLIGENCE • SYSTEM AUDYTU DYSKURSU"
            masthead_title = f"Raport audytu wystąpienia: {target_name}"
            masthead_sub = f"Status: SOJUSZNIK &nbsp;•&nbsp; Rola: {role_name} &nbsp;•&nbsp; Format: {recording.typ_nagrania} &nbsp;•&nbsp; Czas: {duration_min}m {duration_sec}s &nbsp;•&nbsp; Temat: {topic_name}"
            masthead_bg = c_slate_900

        masthead_cell = [
            Paragraph(masthead_tag, s_masthead_tag),
            Paragraph(masthead_title, s_masthead_title),
            Paragraph(masthead_sub, s_masthead_sub)
        ]
        masthead_table = Table([[masthead_cell]], colWidths=[523])
        masthead_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), masthead_bg),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ("LEFTPADDING", (0, 0), (-1, -1), 14),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ]))
        elements.append(masthead_table)
        elements.append(Spacer(1, 10))

        # 2. Karta werdyktu strategicznego / podatności na atak
        if is_adversary:
            score = int(adv.get("ocena_podatnosci_na_atak_1_10") or 8)
            verdict_accent = c_rose_600 if score >= 7 else colors.HexColor("#d97706")
            badge_text = f"<font color='{c_rose_700.hexval()}'><b>PODATNOŚĆ NA DEKOMPOZYCJĘ: {'SKRAJNA' if score >= 8 else 'UMIARKOWANA'} ({score}/10)</b></font>"
            score_label = "PODATNOŚĆ NA ATAK"
            verdict_reason = adv.get("glowna_podatnosc_oponenta") or (profile.nastroj_glowny_prosty if profile else "Oponent wykazuje podwyższoną podatność na sprowokowanie przy dociskaniu do konkretów.")
        else:
            verdict = mkt.get("werdykt") or "Bilans zrównoważony"
            score = int(mkt.get("ocena_punktowa_1_10") or 5)
            verdict_reason = mkt.get("uzasadnienie_werdyktu") or (profile.nastroj_glowny_prosty if profile else "Brak uzasadnienia.")
            score_label = "OCENA WYSTĄPIENIA"
            if score >= 7:
                verdict_accent = c_emerald_600
                badge_text = f"<font color='{c_emerald_700.hexval()}'><b>WERDYKT: {verdict.upper()}</b></font>"
            elif score >= 5:
                verdict_accent = colors.HexColor("#d97706")
                badge_text = f"<font color='{c_amber_700.hexval()}'><b>WERDYKT: {verdict.upper()}</b></font>"
            else:
                verdict_accent = c_rose_600
                badge_text = f"<font color='{c_rose_700.hexval()}'><b>WERDYKT: {verdict.upper()}</b></font>"

        verdict_left = [
            Spacer(1, 3),
            Paragraph(f"{score}/10", s_verdict_score),
            Paragraph(score_label, s_verdict_label),
        ]
        verdict_right = [
            Paragraph(badge_text, ParagraphStyle("VBadge", parent=s_body_bold, fontSize=9)),
            Spacer(1, 3),
            Paragraph(verdict_reason, s_body)
        ]

        verdict_table = Table([[verdict_left, verdict_right]], colWidths=[105, 418])
        verdict_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_slate_50),
            ("LINELEFT", (0, 0), (0, -1), 3.5, verdict_accent),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        elements.append(verdict_table)
        elements.append(Spacer(1, 8))

        # Pomocnicza funkcja parsująca elementy plusów i minusów
        def parse_item(raw_item, is_plus: bool):
            if not raw_item:
                return {}
            if isinstance(raw_item, dict):
                return {
                    "title": raw_item.get("nazwa_atutu" if is_plus else "nazwa_bledu") or raw_item.get("tytul") or raw_item.get("punkt" if is_plus else "blad") or ("Atut wizerunkowy" if is_plus else "Uchybienie wizerunkowe"),
                    "quote": raw_item.get("cytat_lub_moment") or raw_item.get("cytat") or "",
                    "reason": raw_item.get("dlaczego_to_plus" if is_plus else "dlaczego_to_minus") or raw_item.get("wyjasnienie") or ""
                }
            str_item = str(raw_item)
            parts = str_item.split(":", 1)
            if len(parts) > 1:
                return {"title": parts[0].strip(), "quote": "", "reason": parts[1].strip()}
            return {"title": "Mocny punkt" if is_plus else "Słaby punkt", "quote": "", "reason": str_item}

        if is_adversary:
            # 3. Słabości psychiczne i instrukcja destabilizacji w studiu
            elements.append(Paragraph("Słabości psychiczne i instrukcja destabilizacji w studiu", s_section_title))
            elements.append(Paragraph("Wyzwalacze emocjonalne (triggery), wycieki w głosie i mimice oraz instrukcja jak sprowokować oponenta:", s_section_desc))

            punkty_osobowosciowe = adv.get("punkty_wejscia_osobowosciowe", [])
            for idx, item in enumerate(punkty_osobowosciowe, start=1):
                trig = item.get("trigger_emocjonalny", f"Słabość psychiczna #{idx}")
                beh = item.get("objaw_behawioralny", "")
                mech = item.get("mechanizm_psychologiczny", "")
                how_destabilize = item.get("jak_wyprowadzic_z_rownowagi", "")

                card_elements = [
                    Paragraph(f"<b>[TRIGGER {idx}] {trig}</b>", s_card_title_minus)
                ]
                if beh:
                    quote_table = Table([[Paragraph(f"<i>Wyciek w aparacie mowy/mimice: {beh}</i>", s_quote)]], colWidths=[500])
                    quote_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                        ("LINELEFT", (0, 0), (-1, -1), 2, c_rose_600),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ]))
                    card_elements.append(Spacer(1, 3))
                    card_elements.append(quote_table)
                if mech:
                    card_elements.append(Spacer(1, 3))
                    card_elements.append(Paragraph(f"<b>Podłoże kompleksu / niepewności:</b> {mech}", s_body))
                if how_destabilize:
                    destab_table = Table([[Paragraph(f"<b>JAK WYPROWADZIĆ Z RÓWNOWAGI NA WIZJI:</b> {how_destabilize}", ParagraphStyle("Destab", parent=s_body_bold, textColor=c_rose_700, fontSize=8.5))]], colWidths=[500])
                    destab_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), c_rose_50),
                        ("LINELEFT", (0, 0), (-1, -1), 3, c_rose_600),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ]))
                    card_elements.append(Spacer(1, 3))
                    card_elements.append(destab_table)

                item_table = Table([[card_elements]], colWidths=[523])
                item_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff1f2")),
                    ("LINELEFT", (0, 0), (-1, -1), 3.5, c_rose_600),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#fecdd3")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ]))
                elements.append(KeepTogether(item_table))
                elements.append(Spacer(1, 6))

            # 4. Wektory ataku argumentacyjnego i pytania-pułapki
            punkty_argumentacyjne = adv.get("punkty_wejscia_argumentacyjne", [])
            if punkty_argumentacyjne:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph("Wektory ataku argumentacyjnego i gotowe pytania-pułapki", s_section_title))
                elements.append(Paragraph("Zidentyfikowane luki logiczne, manipulacje i pytania zamykające drogę ucieczki:", s_section_desc))

                for idx, item in enumerate(punkty_argumentacyjne, start=1):
                    title_arg = item.get("tytul_wektora", f"Wektor ataku #{idx}")
                    quote_opp = item.get("cytat_przeciwnika", "")
                    diag = item.get("diagnoza_slabosci", "")
                    trap = item.get("rekomendowany_atak_lub_pulapka", "")
                    timing = item.get("zastosowanie_w_debacie", "")

                    card_elements = [
                        Paragraph(f"<b>[WEKTOR {idx}] {title_arg}</b>", ParagraphStyle("WH", parent=s_body_bold, textColor=colors.HexColor("#b45309"), fontSize=9))
                    ]
                    if quote_opp:
                        quote_table = Table([[Paragraph(f"<i>Cytat oponenta: „{quote_opp}”</i>", s_quote)]], colWidths=[500])
                        quote_table.setStyle(TableStyle([
                            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
                            ("LINELEFT", (0, 0), (-1, -1), 2, colors.HexColor("#f59e0b")),
                            ("TOPPADDING", (0, 0), (-1, -1), 3),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                            ("LEFTPADDING", (0, 0), (-1, -1), 6),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ]))
                        card_elements.append(Spacer(1, 3))
                        card_elements.append(quote_table)
                    if diag:
                        card_elements.append(Spacer(1, 3))
                        card_elements.append(Paragraph(f"<b>Diagnoza słabości / fałszu:</b> {diag}{' &nbsp;•&nbsp; <b>Timing:</b> ' + timing if timing else ''}", s_body))
                    if trap:
                        trap_table = Table([[Paragraph(f"<b>GOTOWE PYTANIE-PUŁAPKA / RIPOSTA:</b> „{trap}”", ParagraphStyle("Trap", parent=s_body_bold, textColor=colors.HexColor("#0369a1"), fontSize=8.5))]], colWidths=[500])
                        trap_table.setStyle(TableStyle([
                            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
                            ("LINELEFT", (0, 0), (-1, -1), 3, colors.HexColor("#0284c7")),
                            ("TOPPADDING", (0, 0), (-1, -1), 4),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                            ("LEFTPADDING", (0, 0), (-1, -1), 6),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ]))
                        card_elements.append(Spacer(1, 3))
                        card_elements.append(trap_table)

                    item_table = Table([[card_elements]], colWidths=[523])
                    item_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
                        ("LINELEFT", (0, 0), (-1, -1), 3.5, colors.HexColor("#f59e0b")),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#fde68a")),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ("LEFTPADDING", (0, 0), (-1, -1), 9),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ]))
                    elements.append(KeepTogether(item_table))
                    elements.append(Spacer(1, 6))

            # 5. Amunicja uderzeniowa do spotów i mediów
            amunicja_spoty = adv.get("amunicja_uderzeniowa_do_spotow", [])
            if amunicja_spoty:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph("Amunicja uderzeniowa do spotów i kreacji social media", s_section_title))
                elements.append(Paragraph("Kompromitujące cytaty oponenta do natychmiastowego wycięcia na paski i rolki:", s_section_desc))

                for idx, am in enumerate(amunicja_spoty, start=1):
                    q = am.get("cytat_samobojczy", "")
                    ctx = am.get("kontekst_ataku", "")
                    am_elems = [
                        Paragraph(f"<b>[SAMOBÓJ {idx}] Cytat podatny na wycięcie w mediach</b>", ParagraphStyle("AH", parent=s_body_bold, textColor=c_rose_700, fontSize=9)),
                    ]
                    if q:
                        am_elems.append(Paragraph(f"<i>„{q}”</i>", s_quote))
                    if ctx:
                        am_elems.append(Paragraph(f"<b>Kontekst ataku sztabu:</b> {ctx}", s_body))

                    a_table = Table([[am_elems]], colWidths=[523])
                    a_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), c_rose_50),
                        ("LINELEFT", (0, 0), (-1, -1), 3.5, c_rose_600),
                        ("BOX", (0, 0), (-1, -1), 0.5, c_rose_200),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ]))
                    elements.append(KeepTogether(a_table))
                    elements.append(Spacer(1, 6))

            # 6. Strategiczne dyrektywy ofensywne
            rekomendacje_ofensywne = adv.get("rekomendacje_ofensywne_dla_naszego_sztabu", [])
            if rekomendacje_ofensywne:
                elements.append(Spacer(1, 4))
                rec_paragraphs = []
                for idx, r in enumerate(rekomendacje_ofensywne, start=1):
                    rec_paragraphs.append(Paragraph(f"<b>[{idx}]</b> {r}", s_body))
                    if idx < len(rekomendacje_ofensywne):
                        rec_paragraphs.append(Spacer(1, 3))

                rec_table = Table([[rec_paragraphs]], colWidths=[523])
                rec_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f5f3ff")),
                    ("LINELEFT", (0, 0), (-1, -1), 3.5, colors.HexColor("#7c3aed")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#ddd6fe")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ]))
                rec_block = [
                    Paragraph("Strategiczne dyrektywy ofensywne dla naszego sztabu", s_section_title),
                    Paragraph("Konkretne zasady taktyczne neutralizacji oponenta w studiu:", s_section_desc),
                    rec_table
                ]
                elements.append(KeepTogether(rec_block))
                elements.append(Spacer(1, 8))
        else:
            # 3. Sekcja: Kluczowe atuty i udane zagrania (Co zadziałało)
            elements.append(Paragraph("Kluczowe atuty i udane zagrania (co zadziałało)", s_section_title))
            elements.append(Paragraph("Elementy wystąpienia, które wzmocniły wiarygodność badanego i przyniosły wymierne korzyści wizerunkowe:", s_section_desc))

            plusy_list = mkt.get("glowne_plusy") or (profile.mocne_strony if profile else []) or ["Brak wyraźnych przewag."]
        
            for idx, item in enumerate(plusy_list, start=1):
                p_data = parse_item(item, is_plus=True)
                card_elements = []
            
                # Tytuł atutu
                card_elements.append(Paragraph(f"<b>[ATUT {idx}] {p_data['title']}</b>", s_card_title_plus))
            
                # Cytat / moment (jeśli istnieje)
                if p_data["quote"]:
                    quote_table = Table([[Paragraph(f"<i>Moment / cytat: „{p_data['quote']}”</i>", s_quote)]], colWidths=[500])
                    quote_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                        ("LINELEFT", (0, 0), (-1, -1), 2, c_emerald_600),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ]))
                    card_elements.append(Spacer(1, 3))
                    card_elements.append(quote_table)
                
                # Uzasadnienie werdyktu
                if p_data["reason"]:
                    card_elements.append(Spacer(1, 3))
                    card_elements.append(Paragraph(f"<b>Dlaczego to zadziałało (analiza werdyktu):</b> {p_data['reason']}", s_body))
                
                item_table = Table([[card_elements]], colWidths=[523])
                item_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), c_emerald_50),
                    ("LINELEFT", (0, 0), (-1, -1), 3.5, c_emerald_600),
                    ("BOX", (0, 0), (-1, -1), 0.5, c_emerald_200),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ]))
                elements.append(KeepTogether(item_table))
                elements.append(Spacer(1, 6))

            elements.append(Spacer(1, 4))

            # 4. Sekcja: Popełnione błędy, wpadki i punkty ryzyka (Co zaszkodziło)
            elements.append(Paragraph("Popełnione błędy, wpadki i punkty ryzyka (co zaszkodziło)", s_section_title))
            elements.append(Paragraph("Momenty słabości, niespójności lub uchybienia retoryczne, które osłabiły pozycję badanego:", s_section_desc))

            minusy_list = mkt.get("popelnione_bledy_i_minusy") or (profile.czule_punkty_i_leki if profile else []) or ["Brak odnotowanych błędów krytycznych."]

            for idx, item in enumerate(minusy_list, start=1):
                m_data = parse_item(item, is_plus=False)
                card_elements = []
            
                # Tytuł błędu
                card_elements.append(Paragraph(f"<b>[BŁĄD {idx}] {m_data['title']}</b>", s_card_title_minus))
            
                # Cytat / moment (jeśli istnieje)
                if m_data["quote"]:
                    quote_table = Table([[Paragraph(f"<i>Moment / cytat: „{m_data['quote']}”</i>", s_quote)]], colWidths=[500])
                    quote_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                        ("LINELEFT", (0, 0), (-1, -1), 2, c_rose_600),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ]))
                    card_elements.append(Spacer(1, 3))
                    card_elements.append(quote_table)
                
                # Uzasadnienie werdyktu
                if m_data["reason"]:
                    card_elements.append(Spacer(1, 3))
                    card_elements.append(Paragraph(f"<b>Dlaczego to zaszkodziło (analiza werdyktu):</b> {m_data['reason']}", s_body))
                
                item_table = Table([[card_elements]], colWidths=[523])
                item_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), c_rose_50),
                    ("LINELEFT", (0, 0), (-1, -1), 3.5, c_rose_600),
                    ("BOX", (0, 0), (-1, -1), 0.5, c_rose_200),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ]))
                elements.append(KeepTogether(item_table))
                elements.append(Spacer(1, 6))

            # 4b. Sekcja: Ostrzeżenia sztabowe — Niepożądane emocje i mowa ciała
            emocje_list = mkt.get("niepozadane_emocje_i_mowa_ciala") or []
            if emocje_list:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph("Niepożądane emocje i wycieki mowy ciała (ostrzeżenia sztabowe)", s_section_title))
                elements.append(Paragraph("Emocje i nawyki niedopuszczalne u lidera w formacie telewizyjnym:", s_section_desc))
                for idx, emo in enumerate(emocje_list, start=1):
                    emo_name = emo.get("reakcja_lub_emocja") or "Niepożądana reakcja"
                    emo_quote = emo.get("cytat_lub_moment") or ""
                    emo_why = emo.get("dlaczego_to_szkodliwe") or ""
                    emo_fix = emo.get("zalecenie_sztabowe") or ""

                    e_elems = [
                        Paragraph(f"<b>[OSTRZEŻENIE {idx}] {emo_name}</b>", ParagraphStyle("EH", parent=s_body_bold, textColor=c_rose_700, fontSize=9)),
                    ]
                    if emo_quote:
                        e_elems.append(Paragraph(f"<i>Fragment: „{emo_quote}”</i>", s_quote))
                    if emo_why:
                        e_elems.append(Paragraph(f"<b>Ryzyko wizerunkowe:</b> {emo_why}", s_body))
                    if emo_fix:
                        e_elems.append(Paragraph(f"<b>Zalecenie naprawcze sztabu:</b> {emo_fix}", ParagraphStyle("EFix", parent=s_body, textColor=colors.HexColor("#065f46"))))

                    e_table = Table([[e_elems]], colWidths=[523])
                    e_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff1f2")),
                        ("LINELEFT", (0, 0), (-1, -1), 3.5, c_rose_600),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#fecdd3")),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ]))
                    elements.append(KeepTogether(e_table))
                    elements.append(Spacer(1, 5))

            # 4c. Sekcja: Audyt nielogiczności i luk w argumentacji
            luki_list = mkt.get("nielogicznosci_i_luki_argumentacyjne") or []
            if luki_list:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph("Audyt nielogiczności i luk w argumentacji", s_section_title))
                elements.append(Paragraph("Punkty podatne na zdemaskowanie i podważenie przez dociekliwego oponenta:", s_section_desc))
                for idx, luka in enumerate(luki_list, start=1):
                    l_title = luka.get("luka_lub_sprzecznosc") or "Luka logiczna"
                    l_quote = luka.get("cytat_lub_moment") or ""
                    l_diag = luka.get("diagnoza_logiczna") or ""
                    l_risk = luka.get("ryzyko_kontrataku") or ""

                    l_elems = [
                        Paragraph(f"<b>[LUKA {idx}] {l_title}</b>", ParagraphStyle("LH", parent=s_body_bold, textColor=colors.HexColor("#b45309"), fontSize=9)),
                    ]
                    if l_quote:
                        l_elems.append(Paragraph(f"<i>Fragment: „{l_quote}”</i>", s_quote))
                    if l_diag:
                        l_elems.append(Paragraph(f"<b>Błąd logiczny:</b> {l_diag}", s_body))
                    if l_risk:
                        l_elems.append(Paragraph(f"<b>Ryzyko kontrataku przeciwników:</b> {l_risk}", ParagraphStyle("LRisk", parent=s_body, textColor=c_rose_700)))

                    l_table = Table([[l_elems]], colWidths=[523])
                    l_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
                        ("LINELEFT", (0, 0), (-1, -1), 3.5, colors.HexColor("#d97706")),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#fde68a")),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ]))
                    elements.append(KeepTogether(l_table))
                    elements.append(Spacer(1, 5))

            # 4d. Sekcja: Skrypty korekcyjne sztabu („Zamiast... Powiedz...”)
            skrypty_list = mkt.get("gotowe_riposty_zamiast_bledow") or []
            if skrypty_list:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph("Skrypty korekcyjne sztabu („Zamiast... Powiedz...”)", s_section_title))
                elements.append(Paragraph("Gotowe formuły retoryczne do natychmiastowego wdrożenia przed kamerą:", s_section_desc))
                for idx, scr in enumerate(skrypty_list, start=1):
                    ctx = scr.get("kontekst_pytania") or "Trudne pytanie"
                    said = scr.get("co_powiedzial") or ""
                    should = scr.get("rekomendowana_riposta") or ""

                    col_left = [
                        Paragraph("<b>Co powiedział w wywiadzie (błąd):</b>", ParagraphStyle("SB1", parent=s_body_bold, textColor=c_rose_700, fontSize=8)),
                        Paragraph(f"„{said}”", ParagraphStyle("SB2", parent=s_body, fontSize=8, textColor=c_slate_700, leading=11))
                    ]
                    col_right = [
                        Paragraph("<b>Rekomendowana riposta sztabowa:</b>", ParagraphStyle("SB3", parent=s_body_bold, textColor=colors.HexColor("#065f46"), fontSize=8)),
                        Paragraph(f"„{should}”", ParagraphStyle("SB4", parent=s_body_bold, fontSize=8, textColor=colors.HexColor("#047857"), leading=11))
                    ]
                    scr_grid = Table([[col_left, col_right]], colWidths=[256, 256])
                    scr_grid.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (0, 0), c_rose_50),
                        ("BACKGROUND", (1, 0), (1, 0), c_emerald_50),
                        ("BOX", (0, 0), (0, 0), 0.5, c_rose_200),
                        ("BOX", (1, 0), (1, 0), 0.5, c_emerald_200),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                        ("VALIGN", (0, 0), (-1, -1), "TOP")
                    ]))
                    outer_elems = [
                        Paragraph(f"<b>[SYTUACJA {idx}] {ctx}</b>", ParagraphStyle("SCTX", parent=s_body_bold, textColor=c_indigo_700, fontSize=8.5)),
                        Spacer(1, 3),
                        scr_grid
                    ]
                    outer_table = Table([[outer_elems]], colWidths=[523])
                    outer_table.setStyle(TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                        ("LINELEFT", (0, 0), (-1, -1), 3, c_indigo_700),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ]))
                    elements.append(KeepTogether(outer_table))
                    elements.append(Spacer(1, 5))

            # 4e. Sekcja: Warsztat wystąpień publicznych i emisja głosu
            warsztat = mkt.get("warsztat_mowy_i_dykcji")
            if warsztat:
                elements.append(Spacer(1, 4))
                elements.append(Paragraph("Warsztat wystąpień publicznych i emisja głosu", s_section_title))
                elements.append(Paragraph("Ocena parametrów aparatu mowy, dynamiki, pauz i nawyków emisyjnych:", s_section_desc))
                w_table = Table([[Paragraph(warsztat, s_body)]], colWidths=[523])
                w_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
                    ("LINELEFT", (0, 0), (-1, -1), 3.5, colors.HexColor("#0d9488")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#99f6e4")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ]))
                elements.append(KeepTogether(w_table))
                elements.append(Spacer(1, 6))

            # 5. Nośność medialna („setki” i potencjał cytowań)
            elements.append(Spacer(1, 4))
            elements.append(Paragraph("Nośność medialna i potencjał cytowań („setki”)", s_section_title))
            elements.append(Paragraph("Analiza potencjału rezonansu w serwisach informacyjnych i mediach społecznościowych:", s_section_desc))

            soundbites = mkt.get("nosnosc_medialna_soundbites") or "Wypowiedź płynna, o standardowym potencjale cytowania w pasmach publicystycznych."
            sb_content = [
                Paragraph("<b>Potencjał cytowalności w mediach:</b>", ParagraphStyle("SBHead", parent=s_body_bold, textColor=c_amber_700)),
                Spacer(1, 2),
                Paragraph(soundbites, s_body)
            ]
            sb_table = Table([[sb_content]], colWidths=[523])
            sb_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), c_amber_50),
                ("LINELEFT", (0, 0), (-1, -1), 3.5, colors.HexColor("#f59e0b")),
                ("BOX", (0, 0), (-1, -1), 0.5, c_amber_200),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ]))
            elements.append(KeepTogether(sb_table))
            elements.append(Spacer(1, 8))

            # 6. Wpływ na grupy wyborców (Rezonans elektoratu)
            wplyw = mkt.get("wplyw_na_elektorat", {})
            hard_voters = wplyw.get("twardy_elektorat") or "Wysoka mobilizacja i potwierdzenie zaufania do reprezentanta formacji."
            center_voters = wplyw.get("niezdecydowani") or (profile.perswazyjnosc_odbiorcow if profile else "Umiarkowane zainteresowanie, dominacja odbioru rzeczowego.")
            opp_voters = wplyw.get("elektorat_przeciwnika") or wplyw.get("przeciwnicy") or "Standardowy opór poznawczy i poszukiwanie punktów do krytyki."

            voter_data = [
                [
                    Paragraph("<b>Twardy elektorat</b>", ParagraphStyle("VH1", parent=s_body_bold, textColor=c_emerald_700, fontSize=8.5)),
                    "",
                    Paragraph("<b>Niezdecydowani (centrum)</b>", ParagraphStyle("VH2", parent=s_body_bold, textColor=colors.HexColor("#0284c7"), fontSize=8.5)),
                    "",
                    Paragraph("<b>Elektorat oponentów</b>", ParagraphStyle("VH3", parent=s_body_bold, textColor=c_rose_700, fontSize=8.5))
                ],
                [
                    Paragraph(hard_voters, ParagraphStyle("VB1", parent=s_body, fontSize=8, leading=11.5)),
                    "",
                    Paragraph(center_voters, ParagraphStyle("VB2", parent=s_body, fontSize=8, leading=11.5)),
                    "",
                    Paragraph(opp_voters, ParagraphStyle("VB3", parent=s_body, fontSize=8, leading=11.5))
                ]
            ]
            voter_grid = Table(voter_data, colWidths=[171, 5, 171, 5, 171])
            voter_grid.setStyle(TableStyle([
                # Kolumna 0 (Twardy)
                ("BACKGROUND", (0, 0), (0, 1), c_emerald_50),
                ("BOX", (0, 0), (0, 1), 0.5, c_emerald_200),
                ("LINELEFT", (0, 0), (0, 1), 2.5, c_emerald_600),
                ("TOPPADDING", (0, 0), (0, 0), 5),
                ("BOTTOMPADDING", (0, 0), (0, 0), 2),
                ("TOPPADDING", (0, 1), (0, 1), 1),
                ("BOTTOMPADDING", (0, 1), (0, 1), 6),
                ("LEFTPADDING", (0, 0), (0, 1), 7),
                ("RIGHTPADDING", (0, 0), (0, 1), 7),
            
                # Kolumna 2 (Centrum)
                ("BACKGROUND", (2, 0), (2, 1), colors.HexColor("#f0f9ff")),
                ("BOX", (2, 0), (2, 1), 0.5, colors.HexColor("#bae6fd")),
                ("LINELEFT", (2, 0), (2, 1), 2.5, colors.HexColor("#0284c7")),
                ("TOPPADDING", (2, 0), (2, 0), 5),
                ("BOTTOMPADDING", (2, 0), (2, 0), 2),
                ("TOPPADDING", (2, 1), (2, 1), 1),
                ("BOTTOMPADDING", (2, 1), (2, 1), 6),
                ("LEFTPADDING", (2, 0), (2, 1), 7),
                ("RIGHTPADDING", (2, 0), (2, 1), 7),
            
                # Kolumna 4 (Oponenci)
                ("BACKGROUND", (4, 0), (4, 1), c_rose_50),
                ("BOX", (4, 0), (4, 1), 0.5, c_rose_200),
                ("LINELEFT", (4, 0), (4, 1), 2.5, c_rose_600),
                ("TOPPADDING", (4, 0), (4, 0), 5),
                ("BOTTOMPADDING", (4, 0), (4, 0), 2),
                ("TOPPADDING", (4, 1), (4, 1), 1),
                ("BOTTOMPADDING", (4, 1), (4, 1), 6),
                ("LEFTPADDING", (4, 0), (4, 1), 7),
                ("RIGHTPADDING", (4, 0), (4, 1), 7),
            
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            voter_block = [
                Paragraph("Wpływ na segmenty elektoratu", s_section_title),
                Paragraph("Prognozowana percepcja wystąpienia w kluczowych grupach wyborców:", s_section_desc),
                voter_grid
            ]
            elements.append(KeepTogether(voter_block))
            elements.append(Spacer(1, 8))

            # 7. Rekomendacje sztabowe (Wytyczne spin doktora)
            rekomendacje = mkt.get("rekomendacje_sztabowe") or [
                "Utrzymać wysoki spokój emocjonalny i faktograficzne tempo odpowiedzi.",
                "Wzmocnić odpowiedzi na pytania o finanse zwięzłymi analogiami zrozumiałymi dla masowego widza."
            ]

            rec_paragraphs = []
            for idx, r in enumerate(rekomendacje, start=1):
                rec_paragraphs.append(Paragraph(f"<b>[{idx}]</b> {r}", s_body))
                if idx < len(rekomendacje):
                    rec_paragraphs.append(Spacer(1, 3))

            rec_table = Table([[rec_paragraphs]], colWidths=[523])
            rec_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), c_indigo_50),
                ("LINELEFT", (0, 0), (-1, -1), 3.5, c_indigo_700),
                ("BOX", (0, 0), (-1, -1), 0.5, c_indigo_200),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ]))
            rec_block = [
                Paragraph("Rekomendacje sztabowe i zalecenia doradcze", s_section_title),
                Paragraph("Konkretne wytyczne taktyczne przed kolejnymi wystąpieniami i wywiadami:", s_section_desc),
                rec_table
            ]
            elements.append(KeepTogether(rec_block))
            elements.append(Spacer(1, 8))

        # 8. Profil behawioralny i wskaźniki mimiczne
        beh_items = [
            ("Ekspresja mimiczna i stłumione emocje", wnioski.get("nastroje_i_emocje") or (profile.nastroj_glowny_prosty if profile else "Brak odchyleń")),
            ("Taktyka komunikacyjna i uniki", wnioski.get("glowne_uniki_i_taktyka") or (profile.glowne_uniki_i_taktyka if profile else "Styl bezpośredni")),
            ("Spójność mowy ciała ze słowami", wnioski.get("spojnosc_mowy_ze_slowami") or (profile.spojnosc_mowy_ze_slowami if profile else "Wysoka spójność")),
            ("Radzenie sobie z trudnymi pytaniami", wnioski.get("pojedynek_z_adwersarzami") or (profile.radzenie_z_adwersarzami if profile else "Dobra odporność")),
        ]

        beh_data = [
            [
                Paragraph(f"<b>{beh_items[0][0]}</b>", ParagraphStyle("BH1", parent=s_body_bold, textColor=c_slate_900, fontSize=8)),
                "",
                Paragraph(f"<b>{beh_items[1][0]}</b>", ParagraphStyle("BH2", parent=s_body_bold, textColor=c_slate_900, fontSize=8))
            ],
            [
                Paragraph(beh_items[0][1], ParagraphStyle("BV1", parent=s_body, fontSize=7.5, leading=10.5)),
                "",
                Paragraph(beh_items[1][1], ParagraphStyle("BV2", parent=s_body, fontSize=7.5, leading=10.5))
            ],
            [
                Paragraph(f"<b>{beh_items[2][0]}</b>", ParagraphStyle("BH3", parent=s_body_bold, textColor=c_slate_900, fontSize=8)),
                "",
                Paragraph(f"<b>{beh_items[3][0]}</b>", ParagraphStyle("BH4", parent=s_body_bold, textColor=c_slate_900, fontSize=8))
            ],
            [
                Paragraph(beh_items[2][1], ParagraphStyle("BV3", parent=s_body, fontSize=7.5, leading=10.5)),
                "",
                Paragraph(beh_items[3][1], ParagraphStyle("BV4", parent=s_body, fontSize=7.5, leading=10.5))
            ]
        ]

        beh_grid = Table(beh_data, colWidths=[258, 7, 258])
        beh_grid.setStyle(TableStyle([
            # Karta 1 (góra-lewo)
            ("BACKGROUND", (0, 0), (0, 1), c_slate_50),
            ("BOX", (0, 0), (0, 1), 0.5, colors.HexColor("#e2e8f0")),
            ("LINELEFT", (0, 0), (0, 1), 2.5, c_slate_500),
            ("TOPPADDING", (0, 0), (0, 0), 4),
            ("BOTTOMPADDING", (0, 0), (0, 0), 1),
            ("TOPPADDING", (0, 1), (0, 1), 1),
            ("BOTTOMPADDING", (0, 1), (0, 1), 5),
            ("LEFTPADDING", (0, 0), (0, 1), 6),
            ("RIGHTPADDING", (0, 0), (0, 1), 6),

            # Karta 2 (góra-prawo)
            ("BACKGROUND", (2, 0), (2, 1), c_slate_50),
            ("BOX", (2, 0), (2, 1), 0.5, colors.HexColor("#e2e8f0")),
            ("LINELEFT", (2, 0), (2, 1), 2.5, c_slate_500),
            ("TOPPADDING", (2, 0), (2, 0), 4),
            ("BOTTOMPADDING", (2, 0), (2, 0), 1),
            ("TOPPADDING", (2, 1), (2, 1), 1),
            ("BOTTOMPADDING", (2, 1), (2, 1), 5),
            ("LEFTPADDING", (2, 0), (2, 1), 6),
            ("RIGHTPADDING", (2, 0), (2, 1), 6),

            # Karta 3 (dół-lewo)
            ("BACKGROUND", (0, 2), (0, 3), c_slate_50),
            ("BOX", (0, 2), (0, 3), 0.5, colors.HexColor("#e2e8f0")),
            ("LINELEFT", (0, 2), (0, 3), 2.5, c_slate_500),
            ("TOPPADDING", (0, 2), (0, 2), 4),
            ("BOTTOMPADDING", (0, 2), (0, 2), 1),
            ("TOPPADDING", (0, 3), (0, 3), 1),
            ("BOTTOMPADDING", (0, 3), (0, 3), 5),
            ("LEFTPADDING", (0, 2), (0, 3), 6),
            ("RIGHTPADDING", (0, 2), (0, 3), 6),

            # Karta 4 (dół-prawo)
            ("BACKGROUND", (2, 2), (2, 3), c_slate_50),
            ("BOX", (2, 2), (2, 3), 0.5, colors.HexColor("#e2e8f0")),
            ("LINELEFT", (2, 2), (2, 3), 2.5, c_slate_500),
            ("TOPPADDING", (2, 2), (2, 2), 4),
            ("BOTTOMPADDING", (2, 2), (2, 2), 1),
            ("TOPPADDING", (2, 3), (2, 3), 1),
            ("BOTTOMPADDING", (2, 3), (2, 3), 5),
            ("LEFTPADDING", (2, 2), (2, 3), 6),
            ("RIGHTPADDING", (2, 2), (2, 3), 6),

            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        beh_block = [
            Paragraph("Wskaźniki behawioralne i spójność niewerbalna", s_section_title),
            Paragraph("Syntetyczny odczyt ekspresji mimicznej, spójności aparatu mowy i radzenia sobie z adwersarzami:", s_section_desc),
            beh_grid
        ]
        elements.append(KeepTogether(beh_block))
        elements.append(Spacer(1, 10))

        # 9. Nota prawna
        disclaimer = "Raport wygenerowany automatycznie przez system E-PROFILER w ramach medioznawczej analizy debaty publicznej (art. 85 RODO / prawo prasowe). Wyniki stanowią skalibrowane hipotezy badawczo-doradcze, a nie orzeczenia faktograficzne czy wyroki."
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=2, spaceAfter=4))
        elements.append(Paragraph(disclaimer, ParagraphStyle("Disc", parent=s_body, fontSize=7, leading=9.5, textColor=c_slate_400)))

        return elements

    def generate(self, recording: Any) -> bytes:
        """Generuje elegancki, gabinetowy dokument PDF o standardzie executive dossier."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=42,
            bottomMargin=42
        )
        elements = self.build_story(recording)
        doc.build(elements, canvasmaker=NumberedCanvas)
        buffer.seek(0)
        return buffer.getvalue()


pdf_generator = ReportPDFGenerator()

