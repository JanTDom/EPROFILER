import os
import asyncio
import logging
from pathlib import Path
from sqlalchemy import select, update
from app.db.database import AsyncSessionLocal
from app.db.models import Recording
from app.services.storage import storage_service
from app.services.media import media_service

logger = logging.getLogger("dyskurs.pipeline")

async def update_recording_progress(
    recording_id: str,
    status: str,
    krok: str,
    procent: int,
    sciezka_wideo: str = None,
    sciezka_audio: str = None,
    czas_trwania: float = None,
    blad: str = None
) -> None:
    """Aktualizuje stan nagrania w bazie danych z automatycznym ponawianiem przy chwilowej blokadzie SQLite."""
    for attempt in range(5):
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(Recording).where(Recording.id == recording_id)
                result = await session.execute(stmt)
                rec = result.scalar_one_or_none()
                if not rec:
                    return

                rec.status_przetwarzania = status
                rec.krok_postepu = krok
                rec.procent_postepu = procent
                if sciezka_wideo:
                    rec.sciezka_wideo = sciezka_wideo
                if sciezka_audio:
                    rec.sciezka_audio = sciezka_audio
                if czas_trwania:
                    rec.czas_trwania_sek = czas_trwania
                if blad is not None:
                    rec.blad = blad

                await session.commit()
                return
        except Exception as e:
            if "locked" in str(e).lower() and attempt < 4:
                await asyncio.sleep(0.4 * (attempt + 1))
                continue
            logger.warning(f"Błąd aktualizacji postępu nagrania {recording_id}: {e}")
            break

async def run_pipeline_step_by_step(recording_id: str) -> None:
    """
    Zoptymalizowany asynchroniczny potok przetwarzania:
    1. Pobranie z URL (jeśli dotyczy)
    2. Natychmiastowa ekstrakcja audio 16kHz mono WAV (kluczowa dla AI i transkrypcji, 1-2s)
    3. Błyskawiczny proxy podgląd wideo (faststart copy lub ultrafast transcode)
    4. Równoległa/natychmiastowa analiza behawioralna i psychometryczna Gemini AI
    5. Oznaczenie jako ZAKONCZONE z pełnym dossier
    """
    logger.info(f"Rozpoczynanie potoku przetwarzania nagrania: {recording_id}")
    
    # 1. Pobierz dane nagrania
    async with AsyncSessionLocal() as session:
        stmt = select(Recording).where(Recording.id == recording_id)
        result = await session.execute(stmt)
        recording = result.scalar_one_or_none()
        if not recording:
            logger.error(f"Nie znaleziono nagrania {recording_id}")
            return
        zrodlo_typ = recording.zrodlo_typ
        zrodlo_url = recording.zrodlo_url
        input_video_path = recording.sciezka_wideo

    try:
        proxy_path = str(storage_service.get_proxy_video_path(recording_id))
        audio_path = str(storage_service.get_audio_path(recording_id))

        # Krok 1: Pobieranie URL
        if zrodlo_typ == "url" and zrodlo_url and (not input_video_path or not os.path.exists(input_video_path)):
            await update_recording_progress(
                recording_id,
                status="POBIERANIE",
                krok="Pobieranie materiału wideo ze źródła zewnętrznego...",
                procent=20
            )
            download_info = await media_service.download_from_url(zrodlo_url, recording_id)
            input_video_path = download_info["file_path"]
            czas_trwania = download_info.get("duration", 0)
            await update_recording_progress(
                recording_id,
                status="POBRANO",
                krok="Pobrano plik. Przygotowywanie ścieżki audio...",
                procent=35,
                sciezka_wideo=input_video_path,
                czas_trwania=float(czas_trwania) if czas_trwania else None
            )

        if not input_video_path or not os.path.exists(input_video_path):
            rec_dir = storage_service.get_recording_dir(recording_id)
            for candidate_ext in ["mp4", "mov", "webm", "mkv"]:
                c_path = rec_dir / f"original.{candidate_ext}"
                if c_path.exists() and c_path.stat().st_size > 10000:
                    input_video_path = str(c_path)
                    break

        if not input_video_path or not os.path.exists(input_video_path):
            if os.path.exists(proxy_path) and os.path.getsize(proxy_path) > 10000:
                input_video_path = proxy_path
            else:
                raise FileNotFoundError(f"Plik wejściowy nie istnieje: {input_video_path}")

        duration = await media_service.get_media_duration(input_video_path)

        # Krok 2: Ekstrakcja znormalizowanego audio 16kHz mono WAV (wykonana OD RAZU z pliku wejściowego)
        if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 1000:
            await update_recording_progress(
                recording_id,
                status="EKSTRAKCJA_AUDIO",
                krok="Ekstrakcja ścieżki dźwiękowej (16 kHz mono WAV)...",
                procent=45,
                sciezka_audio=audio_path,
                czas_trwania=duration
            )
            await media_service.extract_normalized_audio(input_video_path, audio_path)

        # Krok 3: Błyskawiczny proxy wideo 720p H.264 faststart
        if not os.path.exists(proxy_path) or os.path.getsize(proxy_path) < 10000:
            await update_recording_progress(
                recording_id,
                status="TRANSKODOWANIE",
                krok="Optymalizacja podglądu wideo (faststart)...",
                procent=60,
                sciezka_wideo=proxy_path
            )
            await media_service.transcode_to_web_proxy(input_video_path, proxy_path)
        else:
            await update_recording_progress(
                recording_id,
                status="PRZETWARZANIE",
                krok="Podgląd wideo gotowy. Rozpoczynanie profilowania...",
                procent=70,
                sciezka_wideo=proxy_path
            )

        # Krok 4: Analiza behawioralna i retoryczna AI (Gemini Multimodal Profiler)
        await update_recording_progress(
            recording_id,
            status="PROFILOWANIE_AI",
            krok="Wykonywanie analizy behawioralnej, intencji i retoryki (Gemini AI)...",
            procent=80,
            sciezka_wideo=proxy_path,
            sciezka_audio=audio_path,
            czas_trwania=duration
        )

        from app.services.gemini_profiler import gemini_profiler
        from app.db.models import PsychometricProfile

        # Pobierz cel profilowania
        target_person = None
        zakres = "pelny"
        async with AsyncSessionLocal() as session:
            stmt = select(Recording).where(Recording.id == recording_id)
            res = await session.execute(stmt)
            r_curr = res.scalar_one_or_none()
            if r_curr:
                target_person = r_curr.polityk_docelowy
                zakres = r_curr.zakres_analizy or "pelny"

        # Uruchom profilowanie multimodalne
        logger.info(f"Uruchamianie Gemini multimodal profiler dla {recording_id}, cel: {target_person}")
        analysis = await gemini_profiler.profile_audio_multimodal(
            audio_path=audio_path,
            target_person=target_person,
            zakres_analizy=zakres
        )
        logger.info(f"Gemini zwrócił wynik dla {recording_id}")

        # Zapisz profil psychometryczny i mówców do bazy danych z ponawianiem przy blokadzie
        for attempt in range(5):
            try:
                async with AsyncSessionLocal() as session:
                    stmt = select(Recording).where(Recording.id == recording_id)
                    res = await session.execute(stmt)
                    r_to_update = res.scalar_one_or_none()
                    if r_to_update:
                        if isinstance(analysis, list) and len(analysis) > 0 and isinstance(analysis[0], dict):
                            analysis = analysis[0]
                        elif not isinstance(analysis, dict):
                            analysis = {}

                        if "rozpoznani_mowcy" in analysis and analysis["rozpoznani_mowcy"]:
                            r_to_update.rozpoznani_mowcy = analysis["rozpoznani_mowcy"]
                        if "wybrany_speaker_tag" in analysis and analysis["wybrany_speaker_tag"]:
                            r_to_update.speaker_docelowy_tag = analysis["wybrany_speaker_tag"]
                        if not r_to_update.polityk_docelowy and "rozpoznani_mowcy" in analysis:
                            for m in analysis["rozpoznani_mowcy"]:
                                if m.get("jest_celem") and m.get("imie_nazwisko"):
                                    r_to_update.polityk_docelowy = m["imie_nazwisko"]
                                    break

                        wnioski = analysis.get("wnioski", {})
                        mkt = analysis.get("marketing_polityczny", {})
                        plusy = mkt.get("glowne_plusy", []) or ([wnioski.get("sila_argumentacji")] if wnioski.get("sila_argumentacji") else [])
                        minusy = mkt.get("popelnione_bledy_i_minusy", []) or ([wnioski.get("czule_punkty_stres")] if wnioski.get("czule_punkty_stres") else [])

                        p_stmt = select(PsychometricProfile).where(PsychometricProfile.recording_id == recording_id)
                        p_res = await session.execute(p_stmt)
                        prof = p_res.scalar_one_or_none()
                        if not prof:
                            prof = PsychometricProfile(
                                recording_id=recording_id,
                                nastroj_glowny_prosty=wnioski.get("nastroje_i_emocje", "Opanowany i skupiony"),
                                styl_komunikacji_prosty=wnioski.get("glowne_uniki_i_taktyka", "Rzeczowy i bezpośredni"),
                                czule_punkty_i_leki=minusy,
                                mocne_strony=plusy,
                                glowne_uniki_i_taktyka=wnioski.get("glowne_uniki_i_taktyka"),
                                spojnosc_mowy_ze_slowami=wnioski.get("spojnosc_mowy_ze_slowami"),
                                skutecznosc_argumentacji=wnioski.get("sila_argumentacji"),
                                perswazyjnosc_odbiorcow=wnioski.get("czy_odbiorcy_to_kupia"),
                                radzenie_z_adwersarzami=wnioski.get("pojedynek_z_adwersarzami"),
                                surowe_wnioski_ai=analysis
                            )
                            session.add(prof)
                        else:
                            prof.nastroj_glowny_prosty = wnioski.get("nastroje_i_emocje", prof.nastroj_glowny_prosty)
                            prof.styl_komunikacji_prosty = wnioski.get("glowne_uniki_i_taktyka", prof.styl_komunikacji_prosty)
                            if minusy:
                                prof.czule_punkty_i_leki = minusy
                            if plusy:
                                prof.mocne_strony = plusy
                            prof.glowne_uniki_i_taktyka = wnioski.get("glowne_uniki_i_taktyka")
                            prof.spojnosc_mowy_ze_slowami = wnioski.get("spojnosc_mowy_ze_slowami")
                            prof.skutecznosc_argumentacji = wnioski.get("sila_argumentacji")
                            prof.perswazyjnosc_odbiorcow = wnioski.get("czy_odbiorcy_to_kupia")
                            prof.radzenie_z_adwersarzami = wnioski.get("pojedynek_z_adwersarzami")
                            prof.surowe_wnioski_ai = analysis

                        r_to_update.status_przetwarzania = "ZAKONCZONE"
                        r_to_update.krok_postepu = "Analiza behawioralna i profilowanie zakończone sukcesem."
                        r_to_update.procent_postepu = 100
                        r_to_update.blad = None
                        await session.commit()
                        break
            except Exception as e:
                if "locked" in str(e).lower() and attempt < 4:
                    await asyncio.sleep(0.5 * (attempt + 1))
                    continue
                raise

        logger.info(f"Pomyślnie ukończono pełne profilowanie dla nagrania {recording_id}")

    except Exception as e:
        logger.exception(f"Błąd potoku dla nagrania {recording_id}: {str(e)}")
        await update_recording_progress(
            recording_id,
            status="BLAD",
            krok=f"Błąd przetwarzania: {str(e)}",
            procent=100,
            blad=str(e)
        )
