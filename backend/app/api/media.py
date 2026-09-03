import os
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from app.services.storage import storage_service

router = APIRouter(prefix="/api/media", tags=["media"])

def range_streamer(file_path: Path, start: int, end: int, chunk_size: int = 1024 * 1024):
    with open(file_path, "rb") as f:
        f.seek(start)
        bytes_left = end - start + 1
        while bytes_left > 0:
            read_size = min(chunk_size, bytes_left)
            data = f.read(read_size)
            if not data:
                break
            bytes_left -= len(data)
            yield data

@router.get("/{recording_id}/video")
async def get_recording_video(recording_id: str, request: Request):
    """
    Strumieniuje zoptymalizowane proxy wideo 720p z pełną obsługą nagłówków Range (HTTP 206 Partial Content),
    zapewniając płynny scrubbing w odtwarzaczu przeglądarki.
    """
    video_path = storage_service.get_proxy_video_path(recording_id)
    if not video_path.exists():
        # Fallback do pliku oryginalnego jeśli proxy jeszcze nie powstało
        orig = storage_service.get_recording_dir(recording_id) / "original.mp4"
        if orig.exists():
            video_path = orig
        else:
            raise HTTPException(status_code=404, detail="Plik wideo nie został jeszcze przetworzony.")

    file_size = video_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
            end = min(end, file_size - 1)
            content_length = end - start + 1

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": "video/mp4",
            }
            return StreamingResponse(
                range_streamer(video_path, start, end),
                status_code=status.HTTP_206_PARTIAL_CONTENT,
                headers=headers
            )

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": "video/mp4",
    }
    return StreamingResponse(
        range_streamer(video_path, 0, file_size - 1),
        headers=headers
    )

@router.get("/{recording_id}/audio")
async def get_recording_audio(recording_id: str):
    """Zwraca znormalizowany plik audio 16kHz WAV."""
    audio_path = storage_service.get_audio_path(recording_id)
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Plik audio nie został jeszcze wyodrębniony.")
    
    file_size = audio_path.stat().st_size
    headers = {
        "Content-Length": str(file_size),
        "Content-Type": "audio/wav",
    }
    return StreamingResponse(
        range_streamer(audio_path, 0, file_size - 1),
        headers=headers
    )
