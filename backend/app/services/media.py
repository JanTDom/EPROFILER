import os
import json
import asyncio
import subprocess
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import certifi
import yt_dlp
from app.services.storage import storage_service

# Zapewnij poprawne certyfikaty CA w środowisku macOS
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())

logger = logging.getLogger("profiler.media")

class MediaService:
    @staticmethod
    async def download_from_url(url: str, recording_id: str) -> Dict[str, Any]:
        """Pobiera wideo z URL (np. YouTube) za pomocą yt-dlp z obsługą cache'u i certyfikatów."""
        rec_dir = storage_service.get_recording_dir(recording_id)
        
        # 1. Sprawdź, czy plik źródłowy nie został już pobrany
        for ext in ["mp4", "mkv", "webm", "mov"]:
            candidate = rec_dir / f"original.{ext}"
            if candidate.exists() and candidate.stat().st_size > 100000:
                duration = await MediaService.get_media_duration(str(candidate))
                if duration > 0:
                    logger.info(f"Plik wideo dla {recording_id} już istnieje ({candidate}), pomijam pobieranie.")
                    return {
                        "file_path": str(candidate),
                        "title": "Pobrane nagranie",
                        "duration": duration,
                        "upload_date": None
                    }

        output_template = str(rec_dir / "original.%(ext)s")
        ydl_opts = {
            'format': 'bestvideo[height<=720]+bestaudio/best[height<=720]/best',
            'outtmpl': output_template,
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'merge_output_format': 'mp4',
            'socket_timeout': 30,
            'retries': 3,
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'ios', 'mweb', 'web']
                }
            }
        }

        loop = asyncio.get_event_loop()
        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                base, _ = os.path.splitext(filename)
                actual_file = f"{base}.mp4" if os.path.exists(f"{base}.mp4") else filename
                return {
                    "file_path": actual_file,
                    "title": info.get("title", "Nagranie z URL"),
                    "duration": info.get("duration", 0),
                    "upload_date": info.get("upload_date", None)
                }

        try:
            return await loop.run_in_executor(None, _download)
        except Exception as e:
            err_msg = str(e)
            if "CERTIFICATE_VERIFY_FAILED" in err_msg:
                raise RuntimeError("Błąd certyfikatu SSL podczas łączenia ze źródłem wideo.")
            if "Failed to extract" in err_msg or "Sign in to confirm" in err_msg or "bot" in err_msg.lower():
                raise RuntimeError("Serwis wideo zablokował automatyczne pobieranie (zabezpieczenie bot-protection). Pobierz plik na dysk i wgraj go w zakładce 'Plik z dysku'.")
            raise RuntimeError(f"Błąd pobierania wideo z URL: {err_msg}")

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
        Transkoduje wideo do lekkiego proxy H.264 z flagą faststart.
        Jeśli plik wejściowy jest już w H.264 MP4 i ma rozdzielczość <= 720p,
        używa natychmiastowego kopiowania strumieni (-c copy -movflags +faststart) w ułamku sekundy.
        W przeciwnym wypadku transkoduje z presetem ultrafast i nigdy nie skaluje w górę.
        """
        import json
        is_already_h264_compatible = False
        try:
            probe_cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name,width,height",
                "-of", "json",
                input_path
            ]
            proc_probe = await asyncio.create_subprocess_exec(
                *probe_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout_probe, _ = await proc_probe.communicate()
            if proc_probe.returncode == 0 and stdout_probe:
                probe_data = json.loads(stdout_probe.decode())
                streams = probe_data.get("streams", [])
                if streams:
                    v_stream = streams[0]
                    codec = v_stream.get("codec_name", "")
                    width = int(v_stream.get("width", 1920))
                    if codec == "h264" and input_path.lower().endswith((".mp4", ".m4v")) and width <= 1280:
                        is_already_h264_compatible = True
        except Exception:
            pass

        if is_already_h264_compatible:
            # Natychmiastowe kopiowanie z optymalizacją faststart (ułamek sekundy zamiast wielu minut)
            cmd = [
                "ffmpeg",
                "-y",
                "-i", input_path,
                "-c", "copy",
                "-movflags", "+faststart",
                output_path
            ]
        else:
            # Szybkie transkodowanie z zachowaniem proporcji (bez skalowania w górę)
            scale_filter = "scale='min(1280,iw)':-2"
            cmd = [
                "ffmpeg",
                "-y",
                "-i", input_path,
                "-vf", scale_filter,
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "24",
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
