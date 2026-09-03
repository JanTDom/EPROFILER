import os
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
import yt_dlp
from app.services.storage import storage_service

class MediaService:
    @staticmethod
    async def download_from_url(url: str, recording_id: str) -> Dict[str, Any]:
        """Pobiera wideo z URL (np. YouTube) za pomocą yt-dlp."""
        rec_dir = storage_service.get_recording_dir(recording_id)
        output_template = str(rec_dir / "original.%(ext)s")
        
        ydl_opts = {
            'format': 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
            'outtmpl': output_template,
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'merge_output_format': 'mp4'
        }

        loop = asyncio.get_event_loop()
        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                # Znajdź pobrany plik
                filename = ydl.prepare_filename(info)
                # Po scaleniu z formatu może mieć .mp4
                base, _ = os.path.splitext(filename)
                actual_file = f"{base}.mp4" if os.path.exists(f"{base}.mp4") else filename
                return {
                    "file_path": actual_file,
                    "title": info.get("title", "Nagranie z URL"),
                    "duration": info.get("duration", 0),
                    "upload_date": info.get("upload_date", None)
                }

        return await loop.run_in_executor(None, _download)

    @staticmethod
    async def get_media_duration(file_path: str) -> float:
        """Pobiera dokładny czas trwania pliku za pomocą ffprobe."""
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0 and stdout:
            try:
                return float(stdout.decode().strip())
            except ValueError:
                return 0.0
        return 0.0

    @staticmethod
    async def transcode_to_web_proxy(input_path: str, output_path: str) -> bool:
        """
        Transkoduje wideo do lekkiego proxy 720p H.264 z flagą faststart,
        umożliwiającą natychmiastowe przewijanie i odtwarzanie w przeglądarce.
        """
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-vf", "scale=1280:-2",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-movflags", "+faststart",
            "-c:a", "aac",
            "-b:a", "128k",
            output_path
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"Błąd transkodowania proxy ffmpeg: {stderr.decode()}")
        return True

    @staticmethod
    async def extract_normalized_audio(input_path: str, output_path: str) -> bool:
        """
        Ekstrahuje ścieżkę dźwiękową do 16kHz mono 16-bit PCM WAV,
        idealną dla modeli transkrypcji Whisper i analizy prozodii.
        """
        cmd = [
            "ffmpeg",
            "-y",
            "-i", input_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_path
        ]
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"Błąd ekstrakcji audio ffmpeg: {stderr.decode()}")
        return True

media_service = MediaService()
