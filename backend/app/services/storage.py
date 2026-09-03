import os
import shutil
from pathlib import Path
from typing import BinaryIO
from app.config import settings

class StorageService:
    def __init__(self, base_dir: str = settings.STORAGE_DIR):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def get_recording_dir(self, recording_id: str) -> Path:
        rec_dir = self.base_dir / recording_id
        rec_dir.mkdir(parents=True, exist_ok=True)
        return rec_dir

    def save_upload_file(self, recording_id: str, filename: str, file_obj: BinaryIO) -> Path:
        rec_dir = self.get_recording_dir(recording_id)
        # Bezpieczne rozszerzenie
        ext = Path(filename).suffix.lower()
        target_path = rec_dir / f"original{ext}"
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
        return target_path

    def get_proxy_video_path(self, recording_id: str) -> Path:
        return self.get_recording_dir(recording_id) / "proxy_720p.mp4"

    def get_audio_path(self, recording_id: str) -> Path:
        return self.get_recording_dir(recording_id) / "audio_16k.wav"

storage_service = StorageService()
