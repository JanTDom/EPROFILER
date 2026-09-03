import os
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
    """Aktualizuje stan nagrania w bazie danych, umożliwiając śledzenie postępu na żywo."""
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
        if blad:
            rec.blad = blad

        await session.commit()

async def run_pipeline_step_by_step(recording_id: str) -> None:
    """
    Główny asynchroniczny potok przetwarzania nagrania dla Fazy 1:
    1. Pobranie z URL (jeśli dotyczy)
    2. Transkodowanie do lekkiego proxy 720p H.264
    3. Ekstrakcja znormalizowanego audio 16kHz mono WAV
    4. Oznaczenie jako GOTOWE_DO_TRANSKRYPCJI
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
        # Krok 1: Pobieranie URL
        if zrodlo_typ == "url" and zrodlo_url:
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
                krok="Pobrano plik. Przygotowywanie transkodowania...",
                procent=35,
                sciezka_wideo=input_video_path,
                czas_trwania=float(czas_trwania) if czas_trwania else None
            )

        if not input_video_path or not os.path.exists(input_video_path):
            raise FileNotFoundError(f"Plik wejściowy nie istnieje: {input_video_path}")

        # Krok 2: Transkodowanie do lekkiego proxy 720p (faststart)
        proxy_path = str(storage_service.get_proxy_video_path(recording_id))
        await update_recording_progress(
            recording_id,
            status="TRANSKODOWANIE",
            krok="Generowanie zoptymalizowanego podglądu wideo (720p H.264 faststart)...",
            procent=55
        )
        await media_service.transcode_to_web_proxy(input_video_path, proxy_path)
        
        # Zmierz czas trwania, jeśli nie był znany
        duration = await media_service.get_media_duration(proxy_path)

        # Krok 3: Ekstrakcja znormalizowanego audio 16kHz mono WAV
        audio_path = str(storage_service.get_audio_path(recording_id))
        await update_recording_progress(
            recording_id,
            status="EKSTRAKCJA_AUDIO",
            krok="Ekstrakcja ścieżki dźwiękowej (16 kHz mono WAV)...",
            procent=80,
            sciezka_wideo=proxy_path,
            czas_trwania=duration
        )
        await media_service.extract_normalized_audio(proxy_path, audio_path)

        # Krok 4: Sukces Fazy 1
        await update_recording_progress(
            recording_id,
            status="GOTOWE_DO_TRANSKRYPCJI",
            krok="Materiał przygotowany do analizy transkrypcji i diaryzacji (Faza 2).",
            procent=100,
            sciezka_audio=audio_path
        )
        logger.info(f"Pomyślnie ukończono Fazę 1 dla nagrania {recording_id}")

    except Exception as e:
        logger.exception(f"Błąd potoku dla nagrania {recording_id}: {str(e)}")
        await update_recording_progress(
            recording_id,
            status="BLAD",
            krok=f"Błąd przetwarzania: {str(e)}",
            procent=100,
            blad=str(e)
        )
